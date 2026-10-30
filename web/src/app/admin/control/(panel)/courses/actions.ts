"use server";

import { redirect } from "next/navigation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { recordAdminAudit, requireSuperAdminUser } from "@/lib/superadmin";
import type { CourseProgramType } from "@/lib/supabase/types";
import { setFlashMessageCookie } from "@/lib/flash";

function getStringValue(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function getNumberValue(value: FormDataEntryValue | null, fallback: number) {
  const parsed = Number(getStringValue(value));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function isCourseProgramType(value: string): value is CourseProgramType {
  return (
    value === "Course" ||
    value === "Specialization" ||
    value === "Professional Certificate" ||
    value === "Learning Path"
  );
}

async function redirectCoursesUrl(params: { success?: string; error?: string }): Promise<never> {
  const searchParams = new URLSearchParams();
  if (params.success) {
    await setFlashMessageCookie("notice", params.success);
  }
  if (params.error) {
    await setFlashMessageCookie("error", params.error);
  }
  const query = searchParams.toString();
  redirect(query ? `/admin/control/courses?${query}` : "/admin/control/courses");
}

export async function createCourse(formData: FormData) {
  const title = getStringValue(formData.get("title"));
  const slugInput = getStringValue(formData.get("slug"));
  const summary = getStringValue(formData.get("summary"));
  const description = getStringValue(formData.get("description")) || summary;
  const providerName = getStringValue(formData.get("providerName")) || "LerenGO";
  const providerCode = getStringValue(formData.get("providerCode")) || "lerengo";
  const category = getStringValue(formData.get("category")) || "General";
  const focusArea = getStringValue(formData.get("focusArea")) || category;
  const programTypeInput = getStringValue(formData.get("programType")) || "Course";
  const skillLevel = getStringValue(formData.get("skillLevel")) || "Beginner";
  const durationLabel = getStringValue(formData.get("durationLabel")) || "Self-paced";
  const priceInr = Math.max(0, getNumberValue(formData.get("priceInr"), 0));

  const { appUser } = await requireSuperAdminUser();

  if (!title || !summary) { return await redirectCoursesUrl({ error: "missing_fields" });
  }

  if (!isCourseProgramType(programTypeInput)) { return await redirectCoursesUrl({ error: "invalid_program_type" });
  }

  const slug = `${normalizeSlug(slugInput || title) || "course"}-${Date.now().toString(36).slice(-4)}`;

  const admin = createSupabaseAdminClient();
  const { data: inserted, error } = await admin
    .from("courses")
    .insert({
      slug,
      title,
      summary,
      description,
      provider_name: providerName,
      provider_code: providerCode,
      category,
      focus_area: focusArea,
      program_type: programTypeInput,
      skill_level: skillLevel,
      duration_label: durationLabel,
      price_inr: priceInr,
      is_published: true,
    })
    .select("id")
    .maybeSingle();

  if (error) {
    const message = error.message.toLowerCase();
    if (message.includes("duplicate") || message.includes("unique")) { return await redirectCoursesUrl({ error: "slug_exists" });
    } return await redirectCoursesUrl({ error: "create_failed" });
  }

  await recordAdminAudit(appUser, {
    action: "course.create",
    targetTable: "courses",
    targetId: inserted?.id ?? null,
    summary: `Created course “${title}”`,
    metadata: { slug, title },
  }); return await redirectCoursesUrl({ success: "course_created" });
}

export async function setCoursePublished(formData: FormData) {
  const courseId = getStringValue(formData.get("courseId"));
  const publish = getStringValue(formData.get("publish")) === "true";

  const { appUser } = await requireSuperAdminUser();

  if (!courseId) { return await redirectCoursesUrl({ error: "invalid_target" });
  }

  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("courses")
    .update({
      is_published: publish,
      updated_at: new Date().toISOString(),
    })
    .eq("id", courseId);

  if (error) { return await redirectCoursesUrl({ error: "update_failed" });
  }

  await recordAdminAudit(appUser, {
    action: publish ? "course.publish" : "course.unpublish",
    targetTable: "courses",
    targetId: courseId,
    summary: `${publish ? "Published" : "Unpublished"} course ${courseId}`,
  }); return await redirectCoursesUrl({ success: publish ? "course_published" : "course_unpublished" });
}

export async function deleteCourse(formData: FormData) {
  const courseId = getStringValue(formData.get("courseId"));

  const { appUser } = await requireSuperAdminUser();

  if (!courseId) { return await redirectCoursesUrl({ error: "invalid_target" });
  }

  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("courses").delete().eq("id", courseId);

  if (error) { return await redirectCoursesUrl({ error: "delete_failed" });
  }

  await recordAdminAudit(appUser, {
    action: "course.delete",
    targetTable: "courses",
    targetId: courseId,
    summary: `Deleted course ${courseId}`,
  }); return await redirectCoursesUrl({ success: "course_deleted" });
}
