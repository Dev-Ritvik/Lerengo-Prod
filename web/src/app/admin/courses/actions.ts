"use server";

import { redirect } from "next/navigation";
import { requireAdminUser } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type {
  CourseLessonType,
  CourseProgramType,
  CourseSpotlightBucket,
} from "@/lib/supabase/types";

function getStringValue(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function getArrayValue(value: FormDataEntryValue | null) {
  return getStringValue(value)
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function getNumberValue(value: FormDataEntryValue | null, fallback: number) {
  const parsed = Number(getStringValue(value));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getNullableNumberValue(value: FormDataEntryValue | null) {
  const normalized = getStringValue(value);
  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function parseQuestionsJson(value: FormDataEntryValue | null) {
  const raw = getStringValue(value);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function isCourseProgramType(value: string): value is CourseProgramType {
  return (
    value === "Course" ||
    value === "Specialization" ||
    value === "Professional Certificate" ||
    value === "Learning Path"
  );
}

function isCourseSpotlightBucket(value: string): value is CourseSpotlightBucket {
  return value === "popular" || value === "weekly" || value === "ai" || value === "new";
}

function isCourseLessonType(value: string): value is CourseLessonType {
  return value === "video" || value === "reading" || value === "lab";
}

export async function saveCourseCatalogEntry(formData: FormData) {
  const courseId = getStringValue(formData.get("courseId"));
  const title = getStringValue(formData.get("title")).slice(0, 160);
  const slugInput = getStringValue(formData.get("slug"));
  const slug = normalizeSlug(slugInput || title);
  const subtitle = getStringValue(formData.get("subtitle")).slice(0, 200);
  const summary = getStringValue(formData.get("summary")).slice(0, 220);
  const description = getStringValue(formData.get("description")).slice(0, 1200);
  const providerName = getStringValue(formData.get("providerName")).slice(0, 100);
  const providerCode = getStringValue(formData.get("providerCode")).slice(0, 12).toUpperCase();
  const category = getStringValue(formData.get("category")).slice(0, 80);
  const focusArea = getStringValue(formData.get("focusArea")).slice(0, 80);
  const programType = getStringValue(formData.get("programType"));
  const skillLevel = getStringValue(formData.get("skillLevel")).slice(0, 60);
  const durationLabel = getStringValue(formData.get("durationLabel")).slice(0, 60);
  const paceLabel = getStringValue(formData.get("paceLabel")).slice(0, 60);
  const rating = getNumberValue(formData.get("rating"), 4.8);
  const priceInr = getNumberValue(formData.get("priceInr"), 0);
  const listPriceInr = getNullableNumberValue(formData.get("listPriceInr"));
  const spotlightBucket = getStringValue(formData.get("spotlightBucket"));
  const heroSlot = getNullableNumberValue(formData.get("heroSlot"));
  const sortOrder = getNumberValue(formData.get("sortOrder"), 100);
  const isPublished = getStringValue(formData.get("isPublished")) === "true";
  const tags = getArrayValue(formData.get("tags"));
  const skills = getArrayValue(formData.get("skills"));
  const outcomes = getArrayValue(formData.get("outcomes"));
  const syllabus = getArrayValue(formData.get("syllabus"));

  if (
    !title ||
    !slug ||
    !summary ||
    !description ||
    !providerName ||
    !providerCode ||
    !category ||
    !focusArea ||
    !programType ||
    !durationLabel
  ) {
    redirect("/admin/courses?error=invalid_input");
  }

  if (!isCourseProgramType(programType) || (spotlightBucket && !isCourseSpotlightBucket(spotlightBucket))) {
    redirect("/admin/courses?error=invalid_input");
  }

  const validatedProgramType: CourseProgramType = programType;
  const validatedSpotlightBucket = (spotlightBucket || null) as CourseSpotlightBucket | null;

  await requireAdminUser();
  const admin = createSupabaseAdminClient();

  const payload = {
    category,
    description,
    duration_label: durationLabel,
    focus_area: focusArea,
    hero_slot: heroSlot,
    is_published: isPublished,
    list_price_inr: listPriceInr,
    outcomes,
    pace_label: paceLabel || "4 hours / week",
    price_inr: priceInr,
    program_type: validatedProgramType,
    provider_code: providerCode,
    provider_name: providerName,
    rating,
    skill_level: skillLevel || "Beginner",
    skills,
    slug,
    sort_order: sortOrder,
    spotlight_bucket: validatedSpotlightBucket,
    subtitle: subtitle || null,
    summary,
    syllabus,
    tags,
    title,
  };

  const query = courseId
    ? admin.from("courses").update(payload).eq("id", courseId)
    : admin.from("courses").insert(payload);

  const { error } = await query;
  if (error) {
    redirect("/admin/courses?error=save_failed");
  }

  redirect(`/admin/courses?success=${courseId ? "course_saved" : "course_created"}&course=${slug}`);
}

export async function saveCourseModuleEntry(formData: FormData) {
  const moduleId = getStringValue(formData.get("moduleId"));
  const courseId = getStringValue(formData.get("courseId"));
  const title = getStringValue(formData.get("title")).slice(0, 160);
  const summary = getStringValue(formData.get("summary")).slice(0, 260);
  const sortOrder = getNumberValue(formData.get("sortOrder"), 100);
  const courseSlug = getStringValue(formData.get("courseSlug"));

  if (!courseId || !title) {
    redirect("/admin/courses?error=invalid_input");
  }

  await requireAdminUser();
  const admin = createSupabaseAdminClient();

  const payload = {
    course_id: courseId,
    sort_order: sortOrder,
    summary: summary || null,
    title,
  };

  const query = moduleId
    ? admin.from("course_modules").update(payload).eq("id", moduleId)
    : admin.from("course_modules").insert(payload);

  const { error } = await query;
  if (error) {
    redirect("/admin/courses?error=save_failed");
  }

  redirect(`/admin/courses?success=${moduleId ? "module_saved" : "module_created"}&course=${courseSlug}`);
}

export async function saveCourseLessonEntry(formData: FormData) {
  const lessonId = getStringValue(formData.get("lessonId"));
  const moduleId = getStringValue(formData.get("moduleId"));
  const title = getStringValue(formData.get("title")).slice(0, 160);
  const summary = getStringValue(formData.get("summary")).slice(0, 260);
  const lessonType = getStringValue(formData.get("lessonType"));
  const durationMinutes = getNullableNumberValue(formData.get("durationMinutes"));
  const videoUrl = getStringValue(formData.get("videoUrl")).slice(0, 240);
  const isPreview = getStringValue(formData.get("isPreview")) === "true";
  const sortOrder = getNumberValue(formData.get("sortOrder"), 100);
  const courseSlug = getStringValue(formData.get("courseSlug"));

  if (!moduleId || !title || !lessonType || !isCourseLessonType(lessonType)) {
    redirect("/admin/courses?error=invalid_input");
  }

  const validatedLessonType: CourseLessonType = lessonType;

  await requireAdminUser();
  const admin = createSupabaseAdminClient();

  const payload = {
    duration_minutes: durationMinutes,
    is_preview: isPreview,
    lesson_type: validatedLessonType,
    module_id: moduleId,
    sort_order: sortOrder,
    summary: summary || null,
    title,
    video_url: videoUrl || null,
  };

  const query = lessonId
    ? admin.from("course_lessons").update(payload).eq("id", lessonId)
    : admin.from("course_lessons").insert(payload);

  const { error } = await query;
  if (error) {
    redirect("/admin/courses?error=save_failed");
  }

  redirect(`/admin/courses?success=${lessonId ? "lesson_saved" : "lesson_created"}&course=${courseSlug}`);
}

export async function saveCourseAssessmentEntry(formData: FormData) {
  const assessmentId = getStringValue(formData.get("assessmentId"));
  const courseId = getStringValue(formData.get("courseId"));
  const title = getStringValue(formData.get("title")).slice(0, 160);
  const summary = getStringValue(formData.get("summary")).slice(0, 260);
  const durationMinutes = getNumberValue(formData.get("durationMinutes"), 20);
  const passPercent = getNumberValue(formData.get("passPercent"), 70);
  const maxAttempts = getNumberValue(formData.get("maxAttempts"), 3);
  const questionsJson = parseQuestionsJson(formData.get("questionsJson"));
  const courseSlug = getStringValue(formData.get("courseSlug"));

  if (!courseId || !title || questionsJson === null) {
    redirect("/admin/courses?error=invalid_questions");
  }

  await requireAdminUser();
  const admin = createSupabaseAdminClient();

  const payload = {
    course_id: courseId,
    duration_minutes: durationMinutes,
    kind: "final" as const,
    max_attempts: maxAttempts,
    pass_percent: passPercent,
    questions_json: questionsJson,
    summary: summary || null,
    title,
  };

  const query = assessmentId
    ? admin.from("course_assessments").update(payload).eq("id", assessmentId)
    : admin.from("course_assessments").insert(payload);

  const { error } = await query;
  if (error) {
    redirect("/admin/courses?error=save_failed");
  }

  redirect(`/admin/courses?success=${assessmentId ? "assessment_saved" : "assessment_created"}&course=${courseSlug}`);
}
