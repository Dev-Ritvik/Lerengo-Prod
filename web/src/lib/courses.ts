import crypto from "crypto";
import { buildAssessmentReport, type AssessmentReport } from "@/lib/assessment-reporting";
import { FALLBACK_COURSE_ROWS } from "@/lib/courses-seed";
import { env } from "@/lib/env";
import { logServerEvent } from "@/lib/server-log";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type {
  CourseAssessmentKind,
  CourseEnrollmentStatus,
  CourseLessonType,
  Database,
  PaymentStatus,
} from "@/lib/supabase/types";

type CourseRow = Database["public"]["Tables"]["courses"]["Row"];
type CourseEnrollmentRow = Database["public"]["Tables"]["course_enrollments"]["Row"];
type CourseModuleRow = Database["public"]["Tables"]["course_modules"]["Row"];
type CourseLessonRow = Database["public"]["Tables"]["course_lessons"]["Row"];
type CourseAssessmentRow = Database["public"]["Tables"]["course_assessments"]["Row"];
type CourseAssessmentAttemptRow = Database["public"]["Tables"]["course_assessment_attempts"]["Row"];
type CourseCertificateRow = Database["public"]["Tables"]["course_certificates"]["Row"];
type CoursePaymentRow = Database["public"]["Tables"]["course_payments"]["Row"];

type InternalCourseAssessmentQuestion = {
  correctOptionId: string;
  id: string;
  options: CourseAssessmentQuestionOption[];
  prompt: string;
};

export type CourseAccentTone = "charcoal" | "steel" | "mist" | "slate";
export type CourseAccessState = "locked" | "active" | "completed";

export type CourseCard = {
  id: string;
  slug: string;
  title: string;
  provider: string;
  providerCode: string;
  meta: string;
  rating: string;
  duration: string;
  tone: CourseAccentTone;
};

export type CourseSection = {
  key: "popular" | "weekly" | "ai";
  title: string;
  href: string;
  items: CourseCard[];
};

export type FreshCourseCard = CourseCard & {
  type: string;
};

export type CoursesHomeData = {
  categories: string[];
  courseColumns: CourseSection[];
  freshDrops: FreshCourseCard[];
  focus: string;
  matchingCount: number;
  partnerSignals: string[];
  totalCount: number;
  usesFallback: boolean;
};

export type CourseEnrollmentSummary = {
  id: string;
  progressPercent: number;
  source: string;
  startedAt: string;
  lastAccessedAt: string | null;
  status: CourseEnrollmentStatus;
};

export type CourseEnrollmentListItem = CourseEnrollmentSummary & {
  courseId: string;
  courseSlug: string;
  courseTitle: string;
  providerName: string;
};

export type CourseLessonSummary = {
  durationMinutes: number | null;
  id: string;
  isLocked: boolean;
  isPreview: boolean;
  lessonType: CourseLessonType;
  moduleId: string;
  sortOrder: number;
  summary: string | null;
  title: string;
  videoUrl: string | null;
};

export type CourseModuleSummary = {
  id: string;
  lessons: CourseLessonSummary[];
  summary: string | null;
  title: string;
};

export type CourseAssessmentQuestionOption = {
  id: string;
  label: string;
};

export type CourseAssessmentQuestion = {
  id: string;
  options: CourseAssessmentQuestionOption[];
  prompt: string;
};

export type CourseAssessmentSummary = {
  attemptCount: number;
  durationMinutes: number;
  id: string;
  kind: CourseAssessmentKind;
  latestPassed: boolean | null;
  latestScorePercent: number | null;
  maxAttempts: number;
  passPercent: number;
  questions: CourseAssessmentQuestion[];
  report: AssessmentReport | null;
  summary: string | null;
  title: string;
};

export type CourseCertificateSummary = {
  certificateNumber: string;
  href: string;
  id: string;
  issuedAt: string;
  recipientName: string;
  title: string;
};

export type CoursePurchaseSummary = {
  hasAccess: boolean;
  isPaid: boolean;
  paymentStatus: PaymentStatus | null;
  priceInr: number;
  listPriceInr: number | null;
};

export type CourseDetailData = {
  accessState: CourseAccessState;
  assessment: CourseAssessmentSummary | null;
  certificate: CourseCertificateSummary | null;
  course: CourseCard & {
    category: string;
    certificateSummary: string;
    certificateTitle: string;
    description: string;
    enrollmentCount: number;
    focusArea: string;
    listPriceInr: number | null;
    outcomes: string[];
    paceLabel: string;
    priceInr: number;
    providerName: string;
    skillLevel: string;
    skills: string[];
    subtitle: string | null;
    summary: string;
    syllabus: string[];
    tags: string[];
  };
  curriculum: CourseModuleSummary[];
  enrollment: CourseEnrollmentSummary | null;
  purchase: CoursePurchaseSummary;
  relatedCourses: CourseCard[];
  usesFallback: boolean;
};

type CourseAssessmentBundle = {
  assessment: {
    durationMinutes: number;
    id: string;
    kind: CourseAssessmentKind;
    maxAttempts: number;
    passPercent: number;
    summary: string | null;
    title: string;
  };
  questions: InternalCourseAssessmentQuestion[];
  usesFallback: boolean;
};

const GENERATED_ASSESSMENT_ID_PREFIX = "generated-assessment";

export const COURSES_SCHEMA_HINT =
  "Apply web/supabase/courses_schema.sql to enable paid course access, private curriculum, assessments, and certificates.";

export function allowCoursesFallback() {
  return env.ALLOW_COURSE_FALLBACK;
}

function normalizeValue(value: string) {
  return value.trim().toLowerCase();
}

function formatRating(value: number) {
  return value.toFixed(1);
}

function toSlugFragment(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 28);
}

function uniqueRows(rows: CourseRow[]) {
  const seen = new Set<string>();
  const unique: CourseRow[] = [];

  for (const row of rows) {
    if (seen.has(row.slug)) {
      continue;
    }

    seen.add(row.slug);
    unique.push(row);
  }

  return unique;
}

function fillRows(primary: CourseRow[], fallback: CourseRow[], limit: number) {
  return uniqueRows([...primary, ...fallback]).slice(0, limit);
}

function resolveTone(row: CourseRow): CourseAccentTone {
  switch (row.spotlight_bucket) {
    case "popular":
      return "mist";
    case "weekly":
      return "steel";
    case "ai":
      return "charcoal";
    case "new":
      return "slate";
    default:
      return "steel";
  }
}

function mapCourseCard(row: CourseRow): CourseCard {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    provider: row.provider_name,
    providerCode: row.provider_code,
    meta: row.program_type,
    rating: formatRating(row.rating),
    duration: row.duration_label,
    tone: resolveTone(row),
  };
}

function mapFreshCourse(row: CourseRow): FreshCourseCard {
  return {
    ...mapCourseCard(row),
    type: row.program_type,
  };
}

function mapEnrollment(row: CourseEnrollmentRow): CourseEnrollmentSummary {
  return {
    id: row.id,
    progressPercent: row.progress_percent,
    source: row.source,
    startedAt: row.started_at,
    lastAccessedAt: row.last_accessed_at,
    status: row.status,
  };
}

function mapCertificate(row: CourseCertificateRow): CourseCertificateSummary {
  return {
    certificateNumber: row.certificate_number,
    href: `/certificates/${row.certificate_number}`,
    id: row.id,
    issuedAt: row.issued_at,
    recipientName: row.recipient_name,
    title: row.title,
  };
}

function matchesFocus(row: CourseRow, focus: string) {
  if (!focus) {
    return true;
  }

  const normalizedFocus = normalizeValue(focus);
  const categoriesList = [
    "artificial intelligence",
    "business",
    "computer science",
    "data science",
    "personal development",
    "information technology",
    "healthcare",
    "language learning",
    "social sciences",
    "arts and humanities",
    "math and logic",
    "placement prep",
  ];

  if (categoriesList.includes(normalizedFocus)) {
    return normalizeValue(row.category) === normalizedFocus;
  }

  const haystacks = [
    row.title,
    row.subtitle ?? "",
    row.summary,
    row.description,
    row.provider_name,
    row.category,
    row.focus_area,
    row.program_type,
    row.skill_level,
    ...row.tags,
    ...row.skills,
    ...row.outcomes,
  ];

  return haystacks.some((value) => normalizeValue(value).includes(normalizedFocus));
}

function buildPartnerSignals(rows: CourseRow[]) {
  return Array.from(new Set(rows.map((row) => row.provider_name))).slice(0, 8);
}

function buildCategories(rows: CourseRow[]) {
  return Array.from(new Set(rows.map((row) => row.category))).sort((left, right) =>
    left.localeCompare(right),
  );
}

function selectSectionRows(rows: CourseRow[], allRows: CourseRow[], key: CourseSection["key"]) {
  const fromFocus = rows.filter((row) => {
    if (key === "popular") {
      return row.spotlight_bucket === "popular";
    }

    if (key === "weekly") {
      return row.spotlight_bucket === "weekly";
    }

    return row.spotlight_bucket === "ai" || normalizeValue(row.focus_area).includes("artificial intelligence");
  });

  const fromAll = allRows.filter((row) => {
    if (key === "popular") {
      return row.spotlight_bucket === "popular";
    }

    if (key === "weekly") {
      return row.spotlight_bucket === "weekly";
    }

    return row.spotlight_bucket === "ai" || normalizeValue(row.focus_area).includes("artificial intelligence");
  });

  return fillRows(fromFocus, fromAll, 3);
}

function getAdminClient() {
  try {
    return createSupabaseAdminClient();
  } catch {
    return null;
  }
}

function logCoursesFallback(message: string, error?: { code?: string; message?: string } | null) {
  logServerEvent("warn", "courses.fallback", {
    error,
    fallbackAllowed: allowCoursesFallback(),
    message,
  });
}

function resolveFallbackCourseRows() {
  return allowCoursesFallback() ? FALLBACK_COURSE_ROWS : [];
}

function deriveCertificateTitle(row: CourseRow) {
  return `${row.title} Certificate of Completion`;
}

function deriveCertificateSummary(row: CourseRow) {
  return `Issued after payment-backed access and passing the final ${row.program_type.toLowerCase()} assessment.`;
}

function buildGeneratedModules(row: CourseRow, hasAccess: boolean): CourseModuleSummary[] {
  const syllabusItems = row.syllabus.length > 0 ? row.syllabus : ["Foundations", "Applied Practice", "Final Review"];
  const moduleSize = 2;
  const modules: CourseModuleSummary[] = [];

  for (let start = 0; start < syllabusItems.length; start += moduleSize) {
    const moduleIndex = Math.floor(start / moduleSize);
    const moduleItems = syllabusItems.slice(start, start + moduleSize);
    const moduleId = `${row.id}-generated-module-${moduleIndex + 1}`;
    const lessons = moduleItems.map((item, index) => {
      const globalIndex = start + index;
      const lessonType: CourseLessonType =
        globalIndex % 3 === 2 ? "lab" : globalIndex % 3 === 1 ? "reading" : "video";
      const isPreview = globalIndex === 0;

      return {
        durationMinutes: 14 + ((globalIndex % 3) + 1) * 6,
        id: `${row.id}-generated-lesson-${globalIndex + 1}`,
        isLocked: !hasAccess && !isPreview,
        isPreview,
        lessonType,
        moduleId,
        sortOrder: globalIndex + 1,
        summary:
          row.outcomes[globalIndex % Math.max(row.outcomes.length, 1)] ??
          `Work through ${item.toLowerCase()} inside the ${row.title} learning path.`,
        title: item,
        videoUrl: null,
      };
    });

    modules.push({
      id: moduleId,
      lessons,
      summary:
        row.outcomes[moduleIndex % Math.max(row.outcomes.length, 1)] ??
        `Module ${moduleIndex + 1} keeps the ${row.title} path moving in a structured order.`,
      title:
        moduleItems.length > 1
          ? `Module ${moduleIndex + 1}: ${moduleItems[0]} to ${moduleItems[moduleItems.length - 1]}`
          : `Module ${moduleIndex + 1}: ${moduleItems[0]}`,
    });
  }

  return modules;
}

function buildGeneratedAssessmentQuestions(row: CourseRow): InternalCourseAssessmentQuestion[] {
  const firstSkill = row.skills[0] ?? "Applied execution";
  const secondSkill = row.skills[1] ?? "Portfolio building";
  const firstOutcome = row.outcomes[0] ?? "Demonstrate applied understanding";
  const secondOutcome = row.outcomes[1] ?? "Ship useful proof of work";
  const thirdOutcome = row.outcomes[2] ?? "Explain decisions clearly";
  const focusArea = row.focus_area;
  const category = row.category;
  const pace = row.pace_label;
  const programType = row.program_type;

  return [
    {
      correctOptionId: "a",
      id: `${row.slug}-q1`,
      options: [
        { id: "a", label: firstSkill },
        { id: "b", label: "Campus moderation workflows" },
        { id: "c", label: "University onboarding forms" },
        { id: "d", label: "General social posting" },
      ],
      prompt: `Which skill is directly emphasized in ${row.title}?`,
    },
    {
      correctOptionId: "b",
      id: `${row.slug}-q2`,
      options: [
        { id: "a", label: category },
        { id: "b", label: focusArea },
        { id: "c", label: row.provider_name },
        { id: "d", label: row.skill_level },
      ],
      prompt: "What focus lane does this course primarily belong to?",
    },
    {
      correctOptionId: "c",
      id: `${row.slug}-q3`,
      options: [
        { id: "a", label: "Bootcamp" },
        { id: "b", label: "Workshop" },
        { id: "c", label: programType },
        { id: "d", label: "Open lecture series" },
      ],
      prompt: `How is ${row.title} positioned inside the LerenGO catalog?`,
    },
    {
      correctOptionId: "d",
      id: `${row.slug}-q4`,
      options: [
        { id: "a", label: "Complete the path without applied work" },
        { id: "b", label: "Skip the assessment and auto-issue the certificate" },
        { id: "c", label: "Watch one preview and finish the course" },
        { id: "d", label: firstOutcome },
      ],
      prompt: "Which outcome best matches the promise of this course?",
    },
    {
      correctOptionId: "a",
      id: `${row.slug}-q5`,
      options: [
        { id: "a", label: pace },
        { id: "b", label: "1 hour / month" },
        { id: "c", label: "Self-paced only with no guidance" },
        { id: "d", label: "Weekend-only live sessions" },
      ],
      prompt: "What pace should a learner expect while moving through this path?",
    },
    {
      correctOptionId: "b",
      id: `${row.slug}-q6`,
      options: [
        { id: "a", label: secondOutcome },
        { id: "b", label: thirdOutcome || secondSkill },
        { id: "c", label: "Rely entirely on campus discussion threads" },
        { id: "d", label: "Avoid measurable proof of work" },
      ],
      prompt: "Which completion habit best fits the final certificate expectation?",
    },
  ];
}

function sanitizeAssessmentQuestions(
  questions: InternalCourseAssessmentQuestion[],
): CourseAssessmentQuestion[] {
  return questions.map((question) => ({
    id: question.id,
    options: question.options,
    prompt: question.prompt,
  }));
}

function parseAssessmentQuestions(
  value: Record<string, unknown>[] | null | undefined,
): InternalCourseAssessmentQuestion[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const questions: InternalCourseAssessmentQuestion[] = [];

  for (const entry of value) {
    const id = typeof entry.id === "string" && entry.id ? entry.id : "";
    const prompt = typeof entry.prompt === "string" && entry.prompt ? entry.prompt : "";
    const correctOptionId =
      typeof entry.correctOptionId === "string" && entry.correctOptionId ? entry.correctOptionId : "";
    const rawOptions = Array.isArray(entry.options) ? entry.options : [];
    const options = rawOptions
      .map((option) => {
        if (!option || typeof option !== "object") {
          return null;
        }

        const record = option as Record<string, unknown>;
        const optionId = typeof record.id === "string" ? record.id : "";
        const label = typeof record.label === "string" ? record.label : "";

        if (!optionId || !label) {
          return null;
        }

        return { id: optionId, label };
      })
      .filter(Boolean) as CourseAssessmentQuestionOption[];

    if (!id || !prompt || !correctOptionId || options.length < 2) {
      continue;
    }

    questions.push({
      correctOptionId,
      id,
      options,
      prompt,
    });
  }

  return questions;
}

function buildGeneratedAssessment(row: CourseRow): CourseAssessmentBundle {
  const questions = buildGeneratedAssessmentQuestions(row);

  return {
    assessment: {
      durationMinutes: 22,
      id: `${GENERATED_ASSESSMENT_ID_PREFIX}-${row.id}`,
      kind: "final",
      maxAttempts: 3,
      passPercent: 70,
      summary:
        "A short graded check to confirm applied understanding before the certificate is issued.",
      title: `${row.title} Final Check`,
    },
    questions,
    usesFallback: true,
  };
}

let cachedPublishedCourseRows: { rows: CourseRow[]; usesFallback: boolean } | null = null;
let cachedPublishedCourseRowsTime = 0;
const PUBLISHED_COURSES_CACHE_TTL = 30000; // 30 seconds

async function fetchPublishedCourseRows() {
  const now = Date.now();
  if (cachedPublishedCourseRows && (now - cachedPublishedCourseRowsTime < PUBLISHED_COURSES_CACHE_TTL)) {
    return cachedPublishedCourseRows;
  }

  const admin = getAdminClient();
  if (!admin) {
    const result = { rows: resolveFallbackCourseRows(), usesFallback: true };
    cachedPublishedCourseRows = result;
    cachedPublishedCourseRowsTime = now;
    return result;
  }

  const { data, error } = await admin
    .from("courses")
    .select("*")
    .eq("is_published", true)
    .order("sort_order", { ascending: true });

  if (error) {
    logCoursesFallback("Courses catalog read failed, falling back to seed catalog.", error);
    const result = { rows: resolveFallbackCourseRows(), usesFallback: true };
    cachedPublishedCourseRows = result;
    cachedPublishedCourseRowsTime = now;
    return result;
  }

  if (!data || data.length === 0) {
    const result = { rows: resolveFallbackCourseRows(), usesFallback: true };
    cachedPublishedCourseRows = result;
    cachedPublishedCourseRowsTime = now;
    return result;
  }

  const result = { rows: data as CourseRow[], usesFallback: false };
  cachedPublishedCourseRows = result;
  cachedPublishedCourseRowsTime = now;
  return result;
}

async function fetchEnrollmentRows(userId: string) {
  const admin = getAdminClient();
  if (!admin) {
    return { rows: [] as CourseEnrollmentRow[], usesFallback: true };
  }

  const { data, error } = await admin
    .from("course_enrollments")
    .select("*")
    .eq("user_id", userId)
    .order("started_at", { ascending: false });

  if (error) {
    logCoursesFallback("Course enrollment read failed, returning empty state.", error);
    return { rows: [] as CourseEnrollmentRow[], usesFallback: true };
  }

  return { rows: (data ?? []) as CourseEnrollmentRow[], usesFallback: false };
}

async function fetchCourseModules(courseId: string) {
  const admin = getAdminClient();
  if (!admin) {
    return { rows: [] as CourseModuleRow[], usesFallback: true };
  }

  const { data, error } = await admin
    .from("course_modules")
    .select("*")
    .eq("course_id", courseId)
    .order("sort_order", { ascending: true });

  if (error) {
    logCoursesFallback("Course modules read failed, falling back to generated curriculum.", error);
    return { rows: [] as CourseModuleRow[], usesFallback: true };
  }

  return { rows: (data ?? []) as CourseModuleRow[], usesFallback: false };
}

async function fetchCourseLessons(moduleIds: string[]) {
  if (moduleIds.length === 0) {
    return { rows: [] as CourseLessonRow[], usesFallback: false };
  }

  const admin = getAdminClient();
  if (!admin) {
    return { rows: [] as CourseLessonRow[], usesFallback: true };
  }

  const { data, error } = await admin
    .from("course_lessons")
    .select("*")
    .in("module_id", moduleIds)
    .order("sort_order", { ascending: true });

  if (error) {
    logCoursesFallback("Course lessons read failed, falling back to generated curriculum.", error);
    return { rows: [] as CourseLessonRow[], usesFallback: true };
  }

  return { rows: (data ?? []) as CourseLessonRow[], usesFallback: false };
}

async function fetchCourseAssessment(courseId: string) {
  const admin = getAdminClient();
  if (!admin) {
    return { row: null as CourseAssessmentRow | null, usesFallback: true };
  }

  const { data, error } = await admin
    .from("course_assessments")
    .select("*")
    .eq("course_id", courseId)
    .eq("kind", "final")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    logCoursesFallback("Course assessment read failed, falling back to generated assessment.", error);
    return { row: null as CourseAssessmentRow | null, usesFallback: true };
  }

  return { row: (data as CourseAssessmentRow | null) ?? null, usesFallback: false };
}

async function fetchCourseAttempts(courseId: string, userId: string) {
  const admin = getAdminClient();
  if (!admin) {
    return { rows: [] as CourseAssessmentAttemptRow[], usesFallback: true };
  }

  const { data, error } = await admin
    .from("course_assessment_attempts")
    .select("*")
    .eq("course_id", courseId)
    .eq("user_id", userId)
    .order("submitted_at", { ascending: false });

  if (error) {
    logCoursesFallback("Course assessment attempts read failed, returning empty state.", error);
    return { rows: [] as CourseAssessmentAttemptRow[], usesFallback: true };
  }

  return { rows: (data ?? []) as CourseAssessmentAttemptRow[], usesFallback: false };
}

async function fetchAllCourseAttempts(courseId: string) {
  const admin = getAdminClient();
  if (!admin) {
    return { rows: [] as CourseAssessmentAttemptRow[], usesFallback: true };
  }

  const { data, error } = await admin
    .from("course_assessment_attempts")
    .select("*")
    .eq("course_id", courseId)
    .order("submitted_at", { ascending: false });

  if (error) {
    logCoursesFallback("Course leaderboard read failed, returning empty ranking state.", error);
    return { rows: [] as CourseAssessmentAttemptRow[], usesFallback: true };
  }

  return { rows: (data ?? []) as CourseAssessmentAttemptRow[], usesFallback: false };
}

async function fetchCourseCertificate(courseId: string, userId: string) {
  const admin = getAdminClient();
  if (!admin) {
    return { row: null as CourseCertificateRow | null, usesFallback: true };
  }

  const { data, error } = await admin
    .from("course_certificates")
    .select("*")
    .eq("course_id", courseId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    logCoursesFallback("Course certificate read failed, returning empty state.", error);
    return { row: null as CourseCertificateRow | null, usesFallback: true };
  }

  return { row: (data as CourseCertificateRow | null) ?? null, usesFallback: false };
}

export async function resolveCoursePaymentRow(courseId: string, userId: string) {
  const admin = getAdminClient();
  if (!admin) {
    return null;
  }

  const { data, error } = await admin
    .from("course_payments")
    .select("*")
    .eq("course_id", courseId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    logCoursesFallback("Course payment read failed, treating access as locked.", error);
    return null;
  }

  return (data as CoursePaymentRow | null) ?? null;
}

function hasConfirmedCourseAccess(params: {
  certificate: CourseCertificateRow | null;
  payment: CoursePaymentRow | null;
  priceInr: number;
}) {
  return (
    params.priceInr <= 0 ||
    params.payment?.status === "success" ||
    Boolean(params.certificate)
  );
}

function mapDbCurriculum(
  modules: CourseModuleRow[],
  lessons: CourseLessonRow[],
  hasAccess: boolean,
): CourseModuleSummary[] {
  const lessonsByModule = new Map<string, CourseLessonSummary[]>();

  for (const lesson of lessons) {
    const list = lessonsByModule.get(lesson.module_id) ?? [];
    list.push({
      durationMinutes: lesson.duration_minutes,
      id: lesson.id,
      isLocked: !hasAccess && !lesson.is_preview,
      isPreview: lesson.is_preview,
      lessonType: lesson.lesson_type,
      moduleId: lesson.module_id,
      sortOrder: lesson.sort_order,
      summary: lesson.summary,
      title: lesson.title,
      videoUrl: hasAccess || lesson.is_preview ? lesson.video_url : null,
    });
    lessonsByModule.set(lesson.module_id, list);
  }

  return modules.map((module) => ({
    id: module.id,
    lessons: (lessonsByModule.get(module.id) ?? []).sort((left, right) => left.sortOrder - right.sortOrder),
    summary: module.summary,
    title: module.title,
  }));
}

async function resolveCourseAssessmentBundle(row: CourseRow): Promise<CourseAssessmentBundle> {
  const { row: assessmentRow, usesFallback } = await fetchCourseAssessment(row.id);
  if (!assessmentRow) {
    return buildGeneratedAssessment(row);
  }

  const questions = parseAssessmentQuestions(assessmentRow.questions_json);
  if (questions.length === 0) {
    return buildGeneratedAssessment(row);
  }

  return {
    assessment: {
      durationMinutes: assessmentRow.duration_minutes,
      id: assessmentRow.id,
      kind: assessmentRow.kind,
      maxAttempts: assessmentRow.max_attempts,
      passPercent: assessmentRow.pass_percent,
      summary: assessmentRow.summary,
      title: assessmentRow.title,
    },
    questions,
    usesFallback,
  };
}

async function resolveCourseCurriculum(row: CourseRow, hasAccess: boolean) {
  const { rows: modules, usesFallback: modulesFallback } = await fetchCourseModules(row.id);
  const { rows: lessons, usesFallback: lessonsFallback } = await fetchCourseLessons(modules.map((module) => module.id));

  if (modules.length === 0 || lessons.length === 0) {
    return {
      modules: buildGeneratedModules(row, hasAccess),
      usesFallback: true,
    };
  }

  return {
    modules: mapDbCurriculum(modules, lessons, hasAccess),
    usesFallback: modulesFallback || lessonsFallback,
  };
}

export async function coursesBackendUsesFallback() {
  const { usesFallback } = await fetchPublishedCourseRows();
  return usesFallback;
}

export async function listCourseCatalog(params?: {
  focus?: string;
  limit?: number;
}) {
  const focus = params?.focus?.trim() ?? "";
  const limit = params?.limit ?? 24;
  const { rows, usesFallback } = await fetchPublishedCourseRows();
  const filteredRows = rows.filter((row) => matchesFocus(row, focus)).slice(0, limit);

  return {
    usesFallback,
    items: filteredRows.map(mapCourseCard),
  };
}

export async function getCoursesHomeData(params?: {
  focus?: string;
}): Promise<CoursesHomeData> {
  const focus = params?.focus?.trim() ?? "";
  const { rows, usesFallback } = await fetchPublishedCourseRows();
  const filteredRows = focus ? rows.filter((row) => matchesFocus(row, focus)) : rows;

  const columns = focus
    ? [
        {
          key: "search-results" as any,
          title: `Curated ${focus} Tracks`,
          href: `/courses?focus=${encodeURIComponent(focus)}#catalog`,
          items: filteredRows.map(mapCourseCard),
        },
      ]
    : [
        {
          key: "popular" as const,
          title: "Most popular",
          href: "/courses?focus=Most%20Popular#catalog",
          items: selectSectionRows(rows, rows, "popular").map(mapCourseCard),
        },
        {
          key: "weekly" as const,
          title: "Weekly spotlight",
          href: "/courses?focus=Weekly%20Spotlight#catalog",
          items: selectSectionRows(rows, rows, "weekly").map(mapCourseCard),
        },
        {
          key: "ai" as const,
          title: "In-demand AI skills",
          href: "/courses?focus=Artificial%20Intelligence#catalog",
          items: selectSectionRows(rows, rows, "ai").map(mapCourseCard),
        },
      ];

  const freshDropsList = focus
    ? filteredRows.filter((row) => row.spotlight_bucket === "new").map(mapFreshCourse)
    : rows.filter((row) => row.spotlight_bucket === "new").map(mapFreshCourse);

  return {
    categories: buildCategories(rows),
    courseColumns: columns,
    freshDrops: freshDropsList.slice(0, 4),
    focus,
    matchingCount: filteredRows.length,
    partnerSignals: buildPartnerSignals(rows),
    totalCount: rows.length,
    usesFallback,
  };
}

export async function resolveCourseRowBySlug(slug: string) {
  const normalizedSlug = slug.trim().toLowerCase();
  const { rows, usesFallback } = await fetchPublishedCourseRows();
  const row = rows.find((item) => item.slug === normalizedSlug) ?? null;

  return { row, usesFallback, rows };
}

export async function resolveEnrollmentRow(courseId: string, userId: string) {
  const { rows } = await fetchEnrollmentRows(userId);
  return rows.find((row) => row.course_id === courseId) ?? null;
}

export async function resolveCourseAssessmentForAttempt(slug: string) {
  const { row } = await resolveCourseRowBySlug(slug);
  if (!row) {
    return null;
  }

  const bundle = await resolveCourseAssessmentBundle(row);
  return {
    bundle,
    course: row,
  };
}

export async function getCourseDetailData(
  slug: string,
  userId?: string | null,
): Promise<CourseDetailData | null> {
  const { row, rows, usesFallback } = await resolveCourseRowBySlug(slug);
  if (!row) {
    return null;
  }

  const enrollmentPromise = userId ? resolveEnrollmentRow(row.id, userId) : Promise.resolve(null);
  const paymentPromise = userId ? resolveCoursePaymentRow(row.id, userId) : Promise.resolve(null);
  const attemptsPromise = userId
    ? fetchCourseAttempts(row.id, userId)
    : Promise.resolve({ rows: [] as CourseAssessmentAttemptRow[], usesFallback: false });
  const rankingAttemptsPromise = userId
    ? fetchAllCourseAttempts(row.id)
    : Promise.resolve({ rows: [] as CourseAssessmentAttemptRow[], usesFallback: false });
  const certificatePromise = userId
    ? fetchCourseCertificate(row.id, userId)
    : Promise.resolve({ row: null as CourseCertificateRow | null, usesFallback: false });

  const [enrollment, payment, assessmentBundle, attemptsResult, rankingAttemptsResult, certificateResult] = await Promise.all([
    enrollmentPromise,
    paymentPromise,
    resolveCourseAssessmentBundle(row),
    attemptsPromise,
    rankingAttemptsPromise,
    certificatePromise,
  ]);

  const certificateRow = certificateResult.row;
  const hasAccess = hasConfirmedCourseAccess({
    certificate: certificateRow,
    payment,
    priceInr: row.price_inr,
  });
  const curriculumResult = await resolveCourseCurriculum(row, hasAccess);
  const latestAttempt = attemptsResult.rows[0] ?? null;
  const certificate = certificateRow ? mapCertificate(certificateRow) : null;
  const accessState: CourseAccessState =
    certificate
      ? "completed"
      : hasAccess
        ? "active"
        : "locked";

  const relatedCourses = rows
    .filter((candidate) => candidate.slug !== row.slug)
    .filter(
      (candidate) =>
        candidate.category === row.category ||
        candidate.focus_area === row.focus_area ||
        candidate.provider_name === row.provider_name,
    )
    .slice(0, 3)
    .map(mapCourseCard);

  return {
    accessState,
    assessment: {
      attemptCount: attemptsResult.rows.length,
      durationMinutes: assessmentBundle.assessment.durationMinutes,
      id: assessmentBundle.assessment.id,
      kind: assessmentBundle.assessment.kind,
      latestPassed: latestAttempt?.passed ?? null,
      latestScorePercent: latestAttempt?.score_percent ?? null,
      maxAttempts: assessmentBundle.assessment.maxAttempts,
      passPercent: assessmentBundle.assessment.passPercent,
      questions: hasAccess ? sanitizeAssessmentQuestions(assessmentBundle.questions) : [],
      report:
        latestAttempt && userId
          ? buildAssessmentReport({
              attempts: rankingAttemptsResult.rows.map((attempt) => ({
                scorePercent: attempt.score_percent,
                submittedAt: attempt.submitted_at,
                userId: attempt.user_id,
              })),
              passed: latestAttempt.passed,
              scorePercent: latestAttempt.score_percent,
              userId,
            })
          : null,
      summary: assessmentBundle.assessment.summary,
      title: assessmentBundle.assessment.title,
    },
    certificate,
    course: {
      ...mapCourseCard(row),
      category: row.category,
      certificateSummary: deriveCertificateSummary(row),
      certificateTitle: deriveCertificateTitle(row),
      description: row.description,
      enrollmentCount: row.enrollment_count,
      focusArea: row.focus_area,
      listPriceInr: row.list_price_inr,
      outcomes: row.outcomes,
      paceLabel: row.pace_label,
      priceInr: row.price_inr,
      providerName: row.provider_name,
      skillLevel: row.skill_level,
      skills: row.skills,
      subtitle: row.subtitle,
      summary: row.summary,
      syllabus: row.syllabus,
      tags: row.tags,
    },
    curriculum: curriculumResult.modules,
    enrollment: enrollment ? mapEnrollment(enrollment) : null,
    purchase: {
      hasAccess,
      isPaid: row.price_inr > 0,
      listPriceInr: row.list_price_inr,
      paymentStatus: payment?.status ?? null,
      priceInr: row.price_inr,
    },
    relatedCourses,
    usesFallback:
      usesFallback ||
      curriculumResult.usesFallback ||
      assessmentBundle.usesFallback ||
      attemptsResult.usesFallback ||
      rankingAttemptsResult.usesFallback ||
      certificateResult.usesFallback,
  };
}

export async function listCourseEnrollmentsForUser(userId: string) {
  const [{ rows: courseRows, usesFallback }, { rows: enrollmentRows }] = await Promise.all([
    fetchPublishedCourseRows(),
    fetchEnrollmentRows(userId),
  ]);

  const courseMap = new Map(courseRows.map((row) => [row.id, row]));
  const items: CourseEnrollmentListItem[] = [];

  for (const enrollment of enrollmentRows) {
    const course = courseMap.get(enrollment.course_id);
    if (!course) {
      continue;
    }

    items.push({
      ...mapEnrollment(enrollment),
      courseId: course.id,
      courseSlug: course.slug,
      courseTitle: course.title,
      providerName: course.provider_name,
    });
  }

  return { items, usesFallback };
}

export async function ensureCourseUserProfile(params: {
  email: string | null | undefined;
  userId: string;
}) {
  const admin = getAdminClient();
  if (!admin) {
    return { ok: false as const, status: 503, error: COURSES_SCHEMA_HINT };
  }

  const { data: existing, error: existingError } = await admin
    .from("users")
    .select("id")
    .eq("id", params.userId)
    .maybeSingle();

  if (existingError) {
    return { ok: false as const, status: 500, error: existingError.message };
  }

  if (existing) {
    return { ok: true as const };
  }

  if (!params.email) {
    return { ok: false as const, status: 400, error: "Email is required to create a course enrollment." };
  }

  const { error: insertError } = await admin.from("users").insert({
    email: params.email,
    id: params.userId,
    role: "user",
    verified: false,
  });

  if (insertError) {
    return { ok: false as const, status: 500, error: insertError.message };
  }

  return { ok: true as const };
}

export async function ensureCourseEnrollmentUnlocked(params: {
  courseId: string;
  progressPercent?: number;
  source: string;
  status?: CourseEnrollmentStatus;
  userId: string;
}) {
  const admin = getAdminClient();
  if (!admin) {
    return { ok: false as const, status: 503, error: COURSES_SCHEMA_HINT };
  }

  const timestamp = new Date().toISOString();
  const progressPercent = Math.max(0, Math.min(params.progressPercent ?? 12, 100));

  const { data, error } = await admin
    .from("course_enrollments")
    .upsert(
      {
        course_id: params.courseId,
        last_accessed_at: timestamp,
        progress_percent: progressPercent,
        source: params.source,
        started_at: timestamp,
        status: params.status ?? (progressPercent >= 100 ? "completed" : "active"),
        updated_at: timestamp,
        user_id: params.userId,
      },
      { onConflict: "course_id,user_id" },
    )
    .select("*")
    .maybeSingle();

  if (error) {
    return { ok: false as const, status: 500, error: error.message };
  }

  if (!data) {
    return { ok: false as const, status: 500, error: "Could not unlock course enrollment." };
  }

  return {
    ok: true as const,
    enrollment: data as CourseEnrollmentRow,
  };
}

export async function ensureCourseCertificate(params: {
  course: CourseRow;
  recipientName: string;
  userId: string;
}) {
  const admin = getAdminClient();
  if (!admin) {
    return { ok: false as const, status: 503, error: COURSES_SCHEMA_HINT };
  }

  const { data: existing, error: existingError } = await admin
    .from("course_certificates")
    .select("*")
    .eq("course_id", params.course.id)
    .eq("user_id", params.userId)
    .maybeSingle();

  if (existingError) {
    return { ok: false as const, status: 500, error: existingError.message };
  }

  if (existing) {
    return {
      ok: true as const,
      certificate: existing as CourseCertificateRow,
    };
  }

  const issuedAt = new Date().toISOString();
  const digest = crypto
    .createHash("sha1")
    .update(`${params.course.id}:${params.userId}:${issuedAt}`)
    .digest("hex")
    .slice(0, 8)
    .toUpperCase();
  const certificateNumber = `LGC-${toSlugFragment(params.course.provider_code).toUpperCase()}-${digest}`;

  const { data, error } = await admin
    .from("course_certificates")
    .insert({
      certificate_number: certificateNumber,
      course_id: params.course.id,
      issued_at: issuedAt,
      recipient_name: params.recipientName,
      title: deriveCertificateTitle(params.course),
      user_id: params.userId,
    })
    .select("*")
    .single();

  if (error) {
    return { ok: false as const, status: 500, error: error.message };
  }

  return {
    ok: true as const,
    certificate: data as CourseCertificateRow,
  };
}

export function scoreCourseAssessment(
  questions: InternalCourseAssessmentQuestion[],
  answers: Record<string, string>,
) {
  if (questions.length === 0) {
    return { correctCount: 0, scorePercent: 0 };
  }

  const correctCount = questions.reduce((count, question) => {
    return count + (answers[question.id] === question.correctOptionId ? 1 : 0);
  }, 0);

  return {
    correctCount,
    scorePercent: Math.round((correctCount / questions.length) * 100),
  };
}
