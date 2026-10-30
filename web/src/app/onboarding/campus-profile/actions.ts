"use server";

import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function getStringValue(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return "";
  }

  return value.replace(/\s+/g, " ").trim();
}

function normalizeCampusToken(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function buildAcronym(value: string) {
  const words = value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");

  return words;
}

type UniversityLite = {
  id: string;
  name: string;
};

function matchUniversityIdByCampusName(campusName: string, universities: UniversityLite[]) {
  const normalizedInput = normalizeCampusToken(campusName);
  const upperInput = campusName.trim().toUpperCase();

  const exactMatch = universities.find((university) => {
    return normalizeCampusToken(university.name) === normalizedInput;
  });
  if (exactMatch) {
    return exactMatch.id;
  }

  const acronymMatch = universities.find((university) => {
    return buildAcronym(university.name) === upperInput;
  });
  if (acronymMatch) {
    return acronymMatch.id;
  }

  const containsMatch = universities.find((university) => {
    const normalizedUniversityName = normalizeCampusToken(university.name);
    return (
      normalizedUniversityName.includes(normalizedInput) ||
      normalizedInput.includes(normalizedUniversityName)
    );
  });
  if (containsMatch) {
    return containsMatch.id;
  }

  return universities.length === 1 ? universities[0].id : null;
}

export async function saveCampusProfile(formData: FormData) {
  const campusName = getStringValue(formData.get("campusName")).slice(0, 80);
  const completionDate =
    getStringValue(formData.get("completionDate")).slice(0, 40) ||
    getStringValue(formData.get("batch")).slice(0, 40);
  const department = getStringValue(formData.get("department")).slice(0, 80);
  const programDomain = getStringValue(formData.get("programDomain")).slice(0, 80);
  const selectedUniversityId = getStringValue(formData.get("universityId"));

  if (!campusName || !completionDate || !department || !programDomain) {
    redirect("/onboarding/campus-profile?error=invalid_input");
  }

  const supabase = await createServerSupabaseClient();
  let user: { id: string; email?: string | null; user_metadata?: Record<string, unknown> } | null = null;
  let authError: { message: string } | null = null;

  try {
    const response = await supabase.auth.getUser();
    user = response.data.user
      ? {
          id: response.data.user.id,
          email: response.data.user.email,
          user_metadata: response.data.user.user_metadata as Record<string, unknown>,
        }
      : null;
    authError = response.error ? { message: response.error.message } : null;
  } catch {
    authError = { message: "Auth fetch failed." };
  }

  if (authError || !user) {
    redirect("/signin?next=%2Fonboarding%2Fcampus-profile");
  }

  const { data: appUser, error: appUserError } = await supabase
    .from("users")
    .select("email, full_name, university_id")
    .eq("id", user.id)
    .maybeSingle();

  if (appUserError) {
    redirect("/onboarding/campus-profile?error=save_failed");
  }

  let universityId = selectedUniversityId || appUser?.university_id || null;

  if (selectedUniversityId) {
    const { data: selectedUniversity, error: selectedUniversityError } = await supabase
      .from("universities")
      .select("id")
      .eq("id", selectedUniversityId)
      .eq("is_active", true)
      .maybeSingle();

    if (selectedUniversityError || !selectedUniversity) {
      redirect("/onboarding/campus-profile?error=invalid_university");
    }
  }

  if (!universityId) {
    const { data: universities, error: universityError } = await supabase
      .from("universities")
      .select("id, name")
      .eq("is_active", true)
      .order("name");

    if (universityError || !universities || universities.length === 0) {
      redirect("/onboarding/campus-profile?error=invalid_university");
    }

    universityId = matchUniversityIdByCampusName(campusName, universities);
    if (!universityId) {
      redirect("/onboarding/campus-profile?error=invalid_university");
    }
  }

  const fullNameFromAuthMeta =
    typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name.trim()
      : "";

  const { error: updateError } = await supabase.from("users").upsert(
    {
      id: user.id,
      batch: completionDate,
      campus_name: campusName,
      department,
      email: user.email ?? appUser?.email ?? "",
      full_name: fullNameFromAuthMeta || appUser?.full_name || null,
      program_domain: programDomain,
      university_id: universityId,
    },
    {
      onConflict: "id",
    },
  );

  if (updateError) {
    if (updateError.code === "42703" || updateError.code === "PGRST204") {
      redirect("/onboarding/campus-profile?error=schema_incomplete");
    }

    redirect("/onboarding/campus-profile?error=save_failed");
  }

  redirect("/verify");
}
