import { NextResponse } from "next/server";
import { createMentorshipMessagePayload } from "@/lib/mentorship";
import type { RouteAdminClient } from "@/lib/route-security";
import { enforceRouteRateLimit, getRouteAdminClient } from "@/lib/route-security";
import type { MentorshipRequestStatus, NotificationType } from "@/lib/supabase/types";
import { requireVerifiedProfileForApi } from "@/lib/tenant";

const ACTIVE_CHAT_STATUSES: MentorshipRequestStatus[] = ["pending", "accepted", "completed"];

function normalizeString(value: unknown, maxLength: number) {
  if (typeof value !== "string") {
    return "";
  }

  return value.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function formatRequestStatusLabel(value: MentorshipRequestStatus) {
  switch (value) {
    case "accepted":
      return "Accepted";
    case "declined":
      return "Declined";
    case "cancelled":
      return "Cancelled";
    case "completed":
      return "Completed";
    default:
      return "Pending";
  }
}

function formatRequestTypeLabel(value: string) {
  switch (value) {
    case "session":
      return "Direct session";
    case "roadmap":
      return "Roadmap help";
    case "office_hour":
      return "Office hour";
    case "boost":
      return "Career boost";
    case "portfolio":
      return "Portfolio audit";
    case "blocker":
      return "Blocker help";
    default:
      return "Mentorship";
  }
}

function formatScheduleLabel(value: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

function buildLockReason(status: MentorshipRequestStatus | null) {
  if (status === "declined") {
    return "This mentor declined the last request, so chat is locked for that thread.";
  }

  if (status === "cancelled") {
    return "This mentor thread was cancelled. Send a new request to reopen chat.";
  }

  return "Send a mentorship request or appointment first to unlock mentor chat.";
}

function isMissingChatTableError(message: string | null | undefined) {
  return Boolean(message?.toLowerCase().includes("mentorship_messages"));
}

async function getThreadContext(admin: RouteAdminClient, universityId: string, currentUserId: string, counterpartyId: string) {
  const { data: counterparty, error: counterpartyError } = await admin
    .from("users")
    .select("id, full_name, email, mentor_approved, verified")
    .eq("id", counterpartyId)
    .eq("university_id", universityId)
    .maybeSingle();

  if (counterpartyError || !counterparty || !counterparty.verified) {
    return { counterparty: null, request: null };
  }

  const { data: request } = await admin
    .from("mentorship_requests")
    .select("id, mentor_id, requester_id, request_type, status, scheduled_for, updated_at")
    .eq("university_id", universityId)
    .or(
      `and(requester_id.eq.${currentUserId},mentor_id.eq.${counterpartyId}),and(requester_id.eq.${counterpartyId},mentor_id.eq.${currentUserId})`,
    )
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    counterparty,
    request: request ?? null,
  };
}

export async function GET(request: Request) {
  const guard = await requireVerifiedProfileForApi();
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  const url = new URL(request.url);
  const counterpartyId = normalizeString(url.searchParams.get("counterpartyId"), 80);
  if (!counterpartyId || counterpartyId === guard.profile.id) {
    return NextResponse.json({ error: "Counterparty not found." }, { status: 400 });
  }

  const adminResult = getRouteAdminClient({
    feature: "Mentorship chat",
    route: "/api/mentorship/messages",
  });
  if (!adminResult.ok) {
    return adminResult.response;
  }
  const admin = adminResult.admin;
  const { counterparty, request: threadRequest } = await getThreadContext(
    admin,
    guard.profile.university_id,
    guard.profile.id,
    counterpartyId,
  );

  if (!counterparty) {
    return NextResponse.json({ error: "Mentor thread not found." }, { status: 404 });
  }

  if (!threadRequest || !ACTIVE_CHAT_STATUSES.includes(threadRequest.status)) {
    return NextResponse.json({
      canChat: false,
      lockReason: buildLockReason(threadRequest?.status ?? null),
      requestId: threadRequest?.id ?? null,
      requestStatus: threadRequest?.status ?? null,
      requestStatusLabel: threadRequest ? formatRequestStatusLabel(threadRequest.status) : null,
      requestTypeLabel: threadRequest ? formatRequestTypeLabel(threadRequest.request_type) : null,
      scheduledLabel: threadRequest ? formatScheduleLabel(threadRequest.scheduled_for) : null,
      messages: [],
    });
  }

  const { data: messages, error: messagesError } = await admin
    .from("mentorship_messages")
    .select("id, sender_id, recipient_id, body, created_at")
    .eq("university_id", guard.profile.university_id)
    .eq("request_id", threadRequest.id)
    .order("created_at", { ascending: true });

  if (messagesError) {
    const errorMessage = isMissingChatTableError(messagesError.message)
      ? "Chat storage is not ready. Apply the mentorship chat schema first."
      : "Could not load mentor chat.";
    return NextResponse.json({ error: errorMessage }, { status: isMissingChatTableError(messagesError.message) ? 503 : 500 });
  }

  const participantIds = Array.from(new Set((messages ?? []).flatMap((message: any) => [message.sender_id, message.recipient_id])));
  const { data: participants } = participantIds.length
    ? await admin
        .from("users")
        .select("id, full_name, email")
        .in("id", participantIds)
    : { data: [] as Array<{ id: string; full_name: string | null; email: string }> };

  const participantsById = new Map<string, any>((participants ?? []).map((participant: any) => [participant.id, participant]));

  return NextResponse.json({
    canChat: true,
    lockReason: null,
    requestId: threadRequest.id,
    requestStatus: threadRequest.status,
    requestStatusLabel: formatRequestStatusLabel(threadRequest.status),
    requestTypeLabel: formatRequestTypeLabel(threadRequest.request_type),
    scheduledLabel: formatScheduleLabel(threadRequest.scheduled_for),
    messages: (messages ?? []).map((message: any) =>
      createMentorshipMessagePayload({
        messageId: message.id,
        sender:
          participantsById.get(message.sender_id) ?? {
            id: message.sender_id,
            full_name: null,
            email: "campus@member",
          },
        body: message.body,
        createdAt: message.created_at,
        currentUserId: guard.profile.id,
      }),
    ),
  });
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
  const counterpartyId = normalizeString(payload.counterpartyId, 80);
  const messageBody = normalizeString(payload.body, 1200);

  if (!counterpartyId || counterpartyId === guard.profile.id) {
    return NextResponse.json({ error: "Counterparty not found." }, { status: 400 });
  }

  if (messageBody.length < 2) {
    return NextResponse.json({ error: "Write a message before sending it." }, { status: 400 });
  }

  const adminResult = getRouteAdminClient({
    feature: "Mentorship chat",
    route: "/api/mentorship/messages",
  });
  if (!adminResult.ok) {
    return adminResult.response;
  }
  const admin = adminResult.admin;

  const rateLimitResponse = await enforceRouteRateLimit({
    request,
    profile: guard.profile,
    routeKey: "api:mentorship:messages:create",
    limit: 30,
    windowMs: 10 * 60 * 1000,
    message: "Too many mentorship messages in a short time. Wait a moment before sending more.",
    persistent: {
      client: admin,
      actorColumn: "sender_id",
      actorId: guard.profile.id,
      extraEq: {
        university_id: guard.profile.university_id,
      },
      table: "mentorship_messages",
      windowMs: 10 * 60 * 1000,
      limit: 30,
    },
  });
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const { counterparty, request: threadRequest } = await getThreadContext(
    admin,
    guard.profile.university_id,
    guard.profile.id,
    counterpartyId,
  );

  if (!counterparty || !threadRequest) {
    return NextResponse.json({ error: "Send a mentorship request before opening chat." }, { status: 409 });
  }

  if (!ACTIVE_CHAT_STATUSES.includes(threadRequest.status)) {
    return NextResponse.json({ error: buildLockReason(threadRequest.status) }, { status: 409 });
  }

  const { data: insertedMessage, error: insertError } = await admin
    .from("mentorship_messages")
    .insert({
      university_id: guard.profile.university_id,
      request_id: threadRequest.id,
      sender_id: guard.profile.id,
      recipient_id: counterpartyId,
      body: messageBody,
    })
    .select("id, body, created_at")
    .single();

  if (insertError || !insertedMessage) {
    const errorMessage = isMissingChatTableError(insertError?.message)
      ? "Chat storage is not ready. Apply the mentorship chat schema first."
      : "Could not send the chat message.";
    return NextResponse.json({ error: errorMessage }, { status: isMissingChatTableError(insertError?.message) ? 503 : 500 });
  }

  const senderName = guard.profile.full_name?.trim() || guard.profile.email;
  const notificationType: NotificationType = "mentorship_message";

  await admin.from("notifications").insert({
    university_id: guard.profile.university_id,
    user_id: counterpartyId,
    type: notificationType,
    title: "New mentorship message",
    body: `${senderName} sent a mentor chat message.`,
    href: "/mentorship",
  });

  return NextResponse.json({
    success: true,
    message: createMentorshipMessagePayload({
      messageId: insertedMessage.id,
      sender: {
        id: guard.profile.id,
        full_name: guard.profile.full_name,
        email: guard.profile.email,
      },
      body: insertedMessage.body,
      createdAt: insertedMessage.created_at,
      currentUserId: guard.profile.id,
    }),
  });
}
