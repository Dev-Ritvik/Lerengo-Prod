import { NextResponse } from "next/server";
import { buildAssessmentReport } from "@/lib/assessment-reporting";
import {
  COURSES_SCHEMA_HINT,
  ensureCourseCertificate,
  ensureCourseEnrollmentUnlocked,
  getCourseDetailData,
  resolveCourseAssessmentForAttempt,
  scoreCourseAssessment,
} from "@/lib/courses";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSessionUser } from "@/lib/tenant";

type Params = {
  params: Promise<{
    slug: string;
  }>;
};

function toDisplayName(value: string | null | undefined) {
  if (!value) {
    return "LerenGO learner";
  }

  const emailName = value.split("@")[0] ?? value;
  return emailName
    .split(/[.\-_ ]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function normalizeAnswers(value: unknown) {
  if (!value || typeof value !== "object") {
    return {};
  }

  const entries = Object.entries(value as Record<string, unknown>);
  const normalized: Record<string, string> = {};

  for (const [key, answer] of entries) {
    if (typeof answer !== "string" || !answer.trim()) {
      continue;
    }

    normalized[key] = answer.trim();
  }

  return normalized;
}

function isMissingCoursesBackend(error: unknown) {
  const message = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  const normalizedMessage = message.toLowerCase();

  return (
    normalizedMessage.includes("course_assessment_attempts") ||
    normalizedMessage.includes("course_certificates") ||
    normalizedMessage.includes("course_enrollments")
  ) && (
    normalizedMessage.includes("does not exist") ||
    normalizedMessage.includes("schema cache") ||
    normalizedMessage.includes("relation") ||
    normalizedMessage.includes("not found")
  );
}

export async function POST(request: Request, { params }: Params) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { slug } = await params;
  const [detail, assessmentPayload] = await Promise.all([
    getCourseDetailData(slug, session.authUser.id),
    resolveCourseAssessmentForAttempt(slug),
  ]);

  if (!detail || !assessmentPayload) {
    return NextResponse.json({ error: "Course not found." }, { status: 404 });
  }

  if (!detail.purchase.hasAccess) {
    return NextResponse.json(
      { error: "Purchase this course before taking the final assessment." },
      { status: 402 },
    );
  }

  if (!detail.assessment) {
    return NextResponse.json({ error: "Assessment is not configured yet." }, { status: 404 });
  }

  if (
    detail.assessment.latestPassed !== true &&
    detail.assessment.attemptCount >= detail.assessment.maxAttempts
  ) {
    return NextResponse.json(
      { error: "Maximum assessment attempts reached for this course." },
      { status: 409 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const answers = normalizeAnswers((body as Record<string, unknown>).answers);
  if (Object.keys(answers).length !== assessmentPayload.bundle.questions.length) {
    return NextResponse.json({ error: "Answer every question before submitting." }, { status: 400 });
  }

  let admin;
  try {
    admin = createSupabaseAdminClient();
  } catch {
    return NextResponse.json({ error: COURSES_SCHEMA_HINT }, { status: 503 });
  }

  const scoring = scoreCourseAssessment(assessmentPayload.bundle.questions, answers);
  const passed = scoring.scorePercent >= assessmentPayload.bundle.assessment.passPercent;

  try {
    const { error: attemptError } = await admin.from("course_assessment_attempts").insert({
      answers_json: answers,
      assessment_id: detail.assessment.id,
      course_id: assessmentPayload.course.id,
      passed,
      score_percent: scoring.scorePercent,
      user_id: session.authUser.id,
    });

    if (attemptError) {
      if (isMissingCoursesBackend(attemptError.message)) {
        return NextResponse.json({ error: COURSES_SCHEMA_HINT }, { status: 503 });
      }

      return NextResponse.json(
        { error: attemptError.message ?? "Could not record assessment attempt." },
        { status: 500 },
      );
    }

    const enrollmentResult = await ensureCourseEnrollmentUnlocked({
      courseId: assessmentPayload.course.id,
      progressPercent: passed ? 100 : 88,
      source: "course_assessment",
      status: passed ? "completed" : "active",
      userId: session.authUser.id,
    });

    if (!enrollmentResult.ok) {
      return NextResponse.json({ error: enrollmentResult.error }, { status: enrollmentResult.status });
    }

    let certificate = null;
    if (passed) {
      const { data: userProfile } = await admin
        .from("users")
        .select("full_name, email")
        .eq("id", session.authUser.id)
        .maybeSingle();

      const certificateResult = await ensureCourseCertificate({
        course: assessmentPayload.course,
        recipientName: toDisplayName(
          (userProfile as { full_name?: string | null; email?: string | null } | null)?.full_name ??
            session.authUser.email,
        ),
        userId: session.authUser.id,
      });

      if (!certificateResult.ok) {
        return NextResponse.json({ error: certificateResult.error }, { status: certificateResult.status });
      }

      certificate = {
        certificateNumber: certificateResult.certificate.certificate_number,
        href: `/certificates/${certificateResult.certificate.certificate_number}`,
        issuedAt: certificateResult.certificate.issued_at,
        title: certificateResult.certificate.title,
      };
    }

    const { data: rankingAttempts, error: rankingError } = await admin
      .from("course_assessment_attempts")
      .select("user_id, score_percent, submitted_at")
      .eq("course_id", assessmentPayload.course.id)
      .order("submitted_at", { ascending: false });

    if (rankingError) {
      return NextResponse.json(
        { error: rankingError.message ?? "Could not build the assessment report." },
        { status: 500 },
      );
    }

    const report = buildAssessmentReport({
      attempts: (rankingAttempts ?? []).map((attempt: any) => ({
        scorePercent: attempt.score_percent,
        submittedAt: attempt.submitted_at,
        userId: attempt.user_id,
      })),
      passed,
      scorePercent: scoring.scorePercent,
      userId: session.authUser.id,
    });

    return NextResponse.json({
      certificate,
      passed,
      report,
      scorePercent: scoring.scorePercent,
      success: true,
    });
  } catch (error) {
    console.error("Course assessment submission failed:", error);
    return NextResponse.json({ error: "Could not submit assessment." }, { status: 500 });
  }
}
