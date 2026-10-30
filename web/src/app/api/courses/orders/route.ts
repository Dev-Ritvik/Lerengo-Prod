import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import {
  COURSES_SCHEMA_HINT,
  coursesBackendUsesFallback,
  ensureCourseUserProfile,
  resolveCoursePaymentRow,
  resolveCourseRowBySlug,
} from "@/lib/courses";
import { enforceRouteRateLimit, getRouteAdminClient } from "@/lib/route-security";
import { logServerEvent } from "@/lib/server-log";
import { getSessionUser } from "@/lib/tenant";

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
    normalizedMessage.includes("course_payments") ||
    normalizedMessage.includes("course_enrollments") ||
    normalizedMessage.includes("courses")
  ) && (
    normalizedMessage.includes("does not exist") ||
    normalizedMessage.includes("schema cache") ||
    normalizedMessage.includes("relation") ||
    normalizedMessage.includes("not found")
  );
}

export async function POST(request: Request) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (await coursesBackendUsesFallback()) {
    return NextResponse.json({ error: COURSES_SCHEMA_HINT }, { status: 503 });
  }

  const razorpayKeyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID?.trim() ?? "";
  const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET?.trim() ?? "";
  if (!razorpayKeyId || !razorpayKeySecret) {
    return NextResponse.json(
      {
        error:
          "Payments are not configured yet. Add NEXT_PUBLIC_RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env.local.",
      },
      { status: 503 },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const courseSlug = normalizeString((payload as Record<string, unknown>).courseSlug, 120);
  if (!courseSlug) {
    return NextResponse.json({ error: "Course slug is required." }, { status: 400 });
  }

  const { row: course } = await resolveCourseRowBySlug(courseSlug);
  if (!course) {
    return NextResponse.json({ error: "Course not found." }, { status: 404 });
  }

  if (course.price_inr <= 0) {
    return NextResponse.json({ error: "This course does not require payment." }, { status: 400 });
  }

  const ensuredProfile = await ensureCourseUserProfile({
    email: session.authUser.email,
    userId: session.authUser.id,
  });
  if (!ensuredProfile.ok) {
    return NextResponse.json({ error: ensuredProfile.error }, { status: ensuredProfile.status });
  }

  const adminResult = getRouteAdminClient({
    feature: "Course payments",
    route: "/api/courses/orders",
  });
  if (!adminResult.ok) {
    return NextResponse.json({ error: COURSES_SCHEMA_HINT }, { status: 503 });
  }
  const admin = adminResult.admin;

  const rateLimitResponse = await enforceRouteRateLimit({
    request,
    profile: {
      id: session.authUser.id,
      university_id: "skillgo-global",
    },
    routeKey: "api:courses:orders",
    limit: 5,
    windowMs: 15 * 60 * 1000,
    message: "Too many checkout attempts. Wait a few minutes before trying again.",
    persistent: {
      client: admin,
      actorColumn: "user_id",
      actorId: session.authUser.id,
      table: "course_payments",
      windowMs: 15 * 60 * 1000,
      limit: 5,
    },
  });

  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const existingPayment = await resolveCoursePaymentRow(course.id, session.authUser.id);
  if (existingPayment?.status === "success") {
    return NextResponse.json(
      {
        alreadyPurchased: true,
        error: "This course is already unlocked for your account.",
      },
      { status: 409 },
    );
  }

  try {
    const razorpay = new Razorpay({
      key_id: razorpayKeyId,
      key_secret: razorpayKeySecret,
    });

    const amountPaise = Math.round(course.price_inr * 100);
    const order = await razorpay.orders.create({
      amount: amountPaise,
      currency: "INR",
      notes: {
        courseId: course.id,
        courseSlug: course.slug,
        userId: session.authUser.id,
      },
      receipt: `course_${course.slug}_${session.authUser.id}`.slice(0, 40),
    });

    const { error } = await admin.from("course_payments").insert({
      amount_paise: amountPaise,
      course_id: course.id,
      currency: order.currency,
      payment_provider: "razorpay",
      razorpay_order_id: order.id,
      status: "created",
      user_id: session.authUser.id,
    });

    if (error) {
      if (isMissingCoursesBackend(error.message)) {
        return NextResponse.json({ error: COURSES_SCHEMA_HINT }, { status: 503 });
      }

      return NextResponse.json(
        { error: error.message ?? "Could not start course checkout." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      amount: order.amount,
      courseTitle: course.title,
      currency: order.currency,
      key: razorpayKeyId,
      orderId: order.id,
    });
  } catch (error) {
    logServerEvent("error", "courses.order_creation_failed", {
      courseSlug,
      error,
      userId: session.authUser.id,
    });
    return NextResponse.json({ error: "Could not start course checkout." }, { status: 500 });
  }
}
