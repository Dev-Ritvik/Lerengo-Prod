"use server";

import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function getStringValue(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

export async function saveUniversitySelection(formData: FormData) {
  const universityId = getStringValue(formData.get("universityId"));
  if (!universityId) {
    redirect("/onboarding/university?error=invalid_university");
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
    redirect("/");
  }

  const { data: universityExists, error: universityLookupError } = await supabase
    .from("universities")
    .select("id")
    .eq("id", universityId)
    .eq("is_active", true)
    .maybeSingle();

  if (universityLookupError || !universityExists) {
    redirect("/onboarding/university?error=invalid_university");
  }

  const fullName =
    (typeof user.user_metadata?.full_name === "string" &&
      user.user_metadata.full_name) ||
    null;

  const { error } = await supabase.from("users").upsert(
    {
      id: user.id,
      email: user.email ?? "",
      full_name: fullName,
      university_id: universityId,
    },
    {
      onConflict: "id",
    },
  );

  if (error) {
    redirect("/onboarding/university?error=save_failed");
  }

  redirect("/onboarding/campus-profile");
}
