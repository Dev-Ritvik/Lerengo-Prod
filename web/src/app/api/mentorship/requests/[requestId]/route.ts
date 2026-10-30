import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireVerifiedProfileForApi } from "@/lib/tenant";
import type { MentorshipRequestStatus, NotificationType } from "@/lib/supabase/types";

const REQUEST_STATUSES: MentorshipRequestStatus[] = [
  "pending",
  "accepted",
  "declined",
  "cancelled",
  "completed",
];

function normalizeString(value: unknown, maxLength: number) {
  if (typeof value !== "string") {
    return "";
  }

  return value.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function isRequestStatus(value: string): value is MentorshipRequestStatus {
  return REQUEST_STATUSES.includes(value as MentorshipRequestStatus);
}

function formatRequestTypeLabel(value: string) {
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

type RouteContext = {
  params: Promise<{ requestId: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const guard = await requireVerifiedProfileForApi();
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  const { requestId } = await context.params;
  if (!requestId) {
    return NextResponse.json({ error: "Request not found." }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const payload = body as Record<string, unknown>;
  const status = normalizeString(payload.status, 24);
  const responseNote = normalizeString(payload.responseNote, 300);

  if (!isRequestStatus(status) || status === "pending") {
    return NextResponse.json({ error: "Invalid request status." }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const { data: mentorshipRequest, error: requestError } = await admin
    .from("mentorship_requests")
    .select("id, mentor_id, requester_id, request_type, status")
    .eq("id", requestId)
    .eq("university_id", guard.profile.university_id)
    .maybeSingle();

  if (requestError || !mentorshipRequest) {
    return NextResponse.json({ error: "Request not found." }, { status: 404 });
  }

  const isMentor = mentorshipRequest.mentor_id === guard.profile.id;
  const isRequester = mentorshipRequest.requester_id === guard.profile.id;
  const isAdmin = guard.profile.role === "admin";

  if (!isMentor && !isRequester && !isAdmin) {
    return NextResponse.json({ error: "You cannot update this request." }, { status: 403 });
  }

  if (isRequester && !isAdmin) {
    if (status !== "cancelled") {
      return NextResponse.json({ error: "Requesters can only cancel requests." }, { status: 403 });
    }

    if (!["pending", "accepted"].includes(mentorshipRequest.status)) {
      return NextResponse.json({ error: "This request can no longer be cancelled." }, { status: 409 });
    }
  }

  if (isMentor && !isAdmin) {
    if (status === "accepted" || status === "declined") {
      if (mentorshipRequest.status !== "pending") {
        return NextResponse.json({ error: "Only pending requests can be reviewed." }, { status: 409 });
      }
    } else if (status === "completed") {
      if (mentorshipRequest.status !== "accepted") {
        return NextResponse.json({ error: "Only accepted requests can be completed." }, { status: 409 });
      }
    } else {
      return NextResponse.json({ error: "Mentors cannot apply that status." }, { status: 403 });
    }
  }

  const { error: updateError } = await admin
    .from("mentorship_requests")
    .update({
      status,
      response_note: responseNote || null,
    })
    .eq("id", requestId)
    .eq("university_id", guard.profile.university_id);

  if (updateError) {
    return NextResponse.json({ error: "Could not update the request. Try again." }, { status: 500 });
  }

  const requestTypeLabel = formatRequestTypeLabel(mentorshipRequest.request_type);
  const actorName = guard.profile.full_name?.trim() || guard.profile.email;
  const notificationTargets = isAdmin
    ? [mentorshipRequest.requester_id, mentorshipRequest.mentor_id]
    : [isMentor ? mentorshipRequest.requester_id : mentorshipRequest.mentor_id];
  const notificationType: NotificationType = "mentorship_request_update";

  await admin.from("notifications").insert(
    notificationTargets.map((userId) => ({
      university_id: guard.profile.university_id,
      user_id: userId,
      type: notificationType,
      title: "Mentorship request updated",
      body: `${actorName} marked the ${requestTypeLabel} request as ${status}.`,
      href: "/mentorship",
    })),
  );

  return NextResponse.json({ success: true });
}
