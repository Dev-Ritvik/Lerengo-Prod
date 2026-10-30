import { NextResponse } from "next/server";
import { enforceRouteRateLimit, getRouteAdminClient } from "@/lib/route-security";
import { requireVerifiedProfileForApi } from "@/lib/tenant";
import type { MentorshipRequestType } from "@/lib/supabase/types";

const REQUEST_TYPES: MentorshipRequestType[] = [
  "session",
  "roadmap",
  "office_hour",
  "boost",
  "portfolio",
  "blocker",
];

function normalizeString(value: unknown, maxLength: number) {
  if (typeof value !== "string") {
    return "";
  }

  return value.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function isRequestType(value: string): value is MentorshipRequestType {
  return REQUEST_TYPES.includes(value as MentorshipRequestType);
}

function normalizeScheduledFor(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

function formatRequestTypeLabel(value: MentorshipRequestType) {
  switch (value) {
    case "session":
      return "session";
    case "roadmap":
      return "roadmap help";
    case "office_hour":
      return "office hour";
    case "boost":
      return "boost session";
    case "portfolio":
      return "portfolio audit";
    case "blocker":
      return "blocker help";
    default:
      return "mentorship request";
  }
}

export async function POST(request: Request) {
  const guard = await requireVerifiedProfileForApi();
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const payload = body as Record<string, unknown>;
  const mentorId = normalizeString(payload.mentorId, 80);
  const requestType = normalizeString(payload.requestType, 24);
  const message = normalizeString(payload.message, 400);
  const scheduledFor = normalizeScheduledFor(payload.scheduledFor);

  if (!mentorId || !isRequestType(requestType)) {
    return NextResponse.json({ error: "Invalid mentorship request." }, { status: 400 });
  }

  if (mentorId === guard.profile.id) {
    return NextResponse.json({ error: "You cannot create a request for yourself." }, { status: 400 });
  }

  const adminResult = getRouteAdminClient({
    feature: "Mentorship requests",
    route: "/api/mentorship/requests",
  });
  if (!adminResult.ok) {
    return adminResult.response;
  }
  const admin = adminResult.admin;

  const rateLimitResponse = await enforceRouteRateLimit({
    request,
    profile: guard.profile,
    routeKey: "api:mentorship:requests:create",
    limit: 8,
    windowMs: 60 * 60 * 1000,
    message: "Too many mentorship requests in a short time. Wait before sending more.",
    persistent: {
      client: admin,
      actorColumn: "requester_id",
      actorId: guard.profile.id,
      extraEq: {
        university_id: guard.profile.university_id,
      },
      table: "mentorship_requests",
      windowMs: 60 * 60 * 1000,
      limit: 8,
    },
  });
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const { data: mentor, error: mentorError } = await admin
    .from("users")
    .select("id, full_name, email, mentor_approved, mentor_active, mentor_category")
    .eq("id", mentorId)
    .eq("university_id", guard.profile.university_id)
    .eq("verified", true)
    .maybeSingle();

  if (mentorError || !mentor || !mentor.mentor_approved || !mentor.mentor_active || !mentor.mentor_category) {
    return NextResponse.json({ error: "Mentor is not available for requests." }, { status: 404 });
  }

  const { data: existingRequest } = await admin
    .from("mentorship_requests")
    .select("id")
    .eq("university_id", guard.profile.university_id)
    .eq("mentor_id", mentorId)
    .eq("requester_id", guard.profile.id)
    .eq("request_type", requestType)
    .eq("status", "pending")
    .maybeSingle();

  if (existingRequest) {
    return NextResponse.json({ error: "A pending request of this type already exists." }, { status: 409 });
  }

  const { data: insertedRequest, error: insertError } = await admin
    .from("mentorship_requests")
    .insert({
      university_id: guard.profile.university_id,
      mentor_id: mentorId,
      requester_id: guard.profile.id,
      request_type: requestType,
      status: "pending",
      message: message || null,
      scheduled_for: scheduledFor,
    })
    .select("id, status, request_type, created_at")
    .single();

  if (insertError || !insertedRequest) {
    return NextResponse.json({ error: "Could not create the request. Try again." }, { status: 500 });
  }

  const requesterName = guard.profile.full_name?.trim() || guard.profile.email;
  const requestTypeLabel = formatRequestTypeLabel(requestType);
  await admin.from("notifications").insert([
    {
      university_id: guard.profile.university_id,
      user_id: mentorId,
      type: "mentorship_request",
      title: "New mentorship request",
      body: `${requesterName} asked for ${requestTypeLabel}.`,
      href: "/mentorship",
    },
    {
      university_id: guard.profile.university_id,
      user_id: guard.profile.id,
      type: "mentorship_request_update",
      title: "Request sent",
      body: `Your ${requestTypeLabel} request was sent to ${mentor.full_name?.trim() || mentor.email}.`,
      href: "/mentorship",
    },
  ]);

  return NextResponse.json({ success: true, requestId: insertedRequest.id }, { status: 201 });
}
