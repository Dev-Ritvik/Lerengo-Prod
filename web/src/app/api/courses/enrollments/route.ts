import { NextResponse } from "next/server";
import {
  COURSES_SCHEMA_HINT,
  coursesBackendUsesFallback,
  ensureCourseEnrollmentUnlocked,
  ensureCourseUserProfile,
  listCourseEnrollmentsForUser,
  resolveCoursePaymentRow,
  resolveCourseRowBySlug,
  resolveEnrollmentRow,
} from "@/lib/courses";
import { getRouteAdminClient } from "@/lib/route-security";
import { getSessionUser } from "@/lib/tenant";

/**
 * H3 fix: mirror the orders-route guard — banned accounts must not be able
 * to enroll (even into free courses), and we fail closed when the
 * service-role client is unavailable for mutation paths.
 */
async function getCourseBuyerGuard(): Promise<
  { ok: true; session: NonNullable<Awaited<ReturnType<typeof getSessionUser>>> } |
  { ok: false; status: number; error: string }
> {
  const session = await getSessionUser();
  if (!session) {
    return { ok: false, status: 401, error: "Unauthorized." };
  }

  const adminResult = getRouteAdminClient({
    feature: "Course enrollment",
    route: "/api/courses/enrollments",
  });
  if (!adminResult.ok) {
    return { ok: false, status: 503, error: COURSES_SCHEMA_HINT };
  }

  const { data } = await adminResult.admin
    .from("users")
    .select("is_banned")
    .eq("id", session.authUser.id)
    .maybeSingle();

  if (data?.is_banned) {
    return { ok: false, status: 403, error: "Account suspended." };
  }

  return { ok: true, session };
}

function normalizeString(value: unknown, maxLength: number) {
  if (typeof value !== "string") {
    return "";
  }

  return value.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function isMissingCoursesBackend(error: unknown) {
  const message = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  const normalizedMessage = message.toLowerCase();

  return (
    normalizedMessage.includes("course_enrollments") ||
    normalizedMessage.includes("courses")
  ) && (
    normalizedMessage.includes("does not exist") ||
    normalizedMessage.includes("schema cache") ||
    normalizedMessage.includes("relation") ||
    normalizedMessage.includes("not found")
  );
}

export async function GET() {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const data = await listCourseEnrollmentsForUser(session.authUser.id);
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const guard = await getCourseBuyerGuard();
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }
  const session = guard.session;

  if (await coursesBackendUsesFallback()) {
    return NextResponse.json({ error: COURSES_SCHEMA_HINT }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const payload = body as Record<string, unknown>;
  const courseSlug = normalizeString(payload.courseSlug, 120);
  if (!courseSlug) {
    return NextResponse.json({ error: "Course slug is required." }, { status: 400 });
  }

  const { row: course } = await resolveCourseRowBySlug(courseSlug);
  if (!course) {
    return NextResponse.json({ error: "Course not found." }, { status: 404 });
  }

  const ensuredProfile = await ensureCourseUserProfile({
    email: session.authUser.email,
    userId: session.authUser.id,
  });

  if (!ensuredProfile.ok) {
    return NextResponse.json({ error: ensuredProfile.error }, { status: ensuredProfile.status });
  }

  if (course.price_inr > 0) {
    const payment = await resolveCoursePaymentRow(course.id, session.authUser.id);
    if (payment?.status !== "success") {
      return NextResponse.json(
        { error: "This course is paid. Complete purchase before enrollment is activated." },
        { status: 402 },
      );
    }
  }

  const existingEnrollment = await resolveEnrollmentRow(course.id, session.authUser.id);
  if (existingEnrollment) {
    return NextResponse.json(
      {
        enrollmentId: existingEnrollment.id,
        alreadyEnrolled: true,
      },
      { status: 200 },
    );
  }

  const enrollmentResult = await ensureCourseEnrollmentUnlocked({
    courseId: course.id,
    progressPercent: 12,
    source: "course_purchase",
    status: "active",
    userId: session.authUser.id,
  });

  if (!enrollmentResult.ok) {
    if (isMissingCoursesBackend(enrollmentResult.error)) {
      return NextResponse.json({ error: COURSES_SCHEMA_HINT }, { status: 503 });
    }

    return NextResponse.json({ error: enrollmentResult.error }, { status: enrollmentResult.status });
  }

  return NextResponse.json(
    {
      enrollment: {
        id: enrollmentResult.enrollment.id,
        lastAccessedAt: enrollmentResult.enrollment.last_accessed_at,
        progressPercent: enrollmentResult.enrollment.progress_percent,
        source: enrollmentResult.enrollment.source,
        startedAt: enrollmentResult.enrollment.started_at,
        status: enrollmentResult.enrollment.status,
      },
      success: true,
    },
    { status: 201 },
  );
}
