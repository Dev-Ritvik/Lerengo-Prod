"use server";

import { redirect } from "next/navigation";
import { requireAdminUser } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

function getStringValue(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function parseStringList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export async function updateUniversitySettings(formData: FormData) {
  const universityId = getStringValue(formData.get("universityId"));
  const name = getStringValue(formData.get("name")).slice(0, 120);
  const domain = getStringValue(formData.get("domain")).slice(0, 80).toLowerCase();
  const minScoreRaw = getStringValue(formData.get("minScore"));
  const nameVariants = parseStringList(getStringValue(formData.get("nameVariants")));
  const keywords = parseStringList(getStringValue(formData.get("keywords")));
  const minScore = Number.parseInt(minScoreRaw, 10);

  if (!universityId || !name || !Number.isInteger(minScore) || minScore < 0 || minScore > 100) {
    redirect("/admin/universities?error=invalid_input");
  }

  const { appUser } = await requireAdminUser();
  const admin = createSupabaseAdminClient();

  if (universityId !== appUser.university_id) {
    redirect("/admin/universities?error=invalid_university");
  }

  const { error } = await admin
    .from("universities")
    .update({
      domain: domain || null,
      keywords,
      min_score: minScore,
      name,
      name_variants: nameVariants,
    })
    .eq("id", universityId);

  if (error) {
    redirect("/admin/universities?error=save_failed");
  }

  redirect("/admin/universities?success=settings_saved");
}

export async function createAcademicMapping(formData: FormData) {
  const department = getStringValue(formData.get("department")).slice(0, 80);
  const programDomain = getStringValue(formData.get("programDomain")).slice(0, 80);
  const subject = getStringValue(formData.get("subject")).slice(0, 120);
  const semester = Number.parseInt(getStringValue(formData.get("semester")), 10);

  if (!department || !programDomain || !subject || !Number.isInteger(semester) || semester < 1 || semester > 12) {
    redirect("/admin/universities?error=invalid_mapping");
  }

  const { appUser } = await requireAdminUser();
  const admin = createSupabaseAdminClient();

  const { error } = await admin.from("academic_subject_mappings").upsert(
    {
      department,
      is_active: true,
      program_domain: programDomain,
      semester,
      subject,
      university_id: appUser.university_id,
    },
    {
      onConflict: "university_id,department,program_domain,semester,subject",
    },
  );

  if (error) {
    redirect("/admin/universities?error=mapping_save_failed");
  }

  redirect("/admin/universities?success=mapping_saved");
}

export async function toggleAcademicMapping(formData: FormData) {
  const mappingId = getStringValue(formData.get("mappingId"));
  const nextState = getStringValue(formData.get("nextState")) === "true";

  if (!mappingId) {
    redirect("/admin/universities?error=invalid_mapping");
  }

  const { appUser } = await requireAdminUser();
  const admin = createSupabaseAdminClient();

  const { error } = await admin
    .from("academic_subject_mappings")
    .update({ is_active: nextState })
    .eq("id", mappingId)
    .eq("university_id", appUser.university_id);

  if (error) {
    redirect("/admin/universities?error=mapping_toggle_failed");
  }

  redirect("/admin/universities?success=mapping_saved");
}
