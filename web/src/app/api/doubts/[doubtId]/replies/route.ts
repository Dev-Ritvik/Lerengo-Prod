import { NextResponse } from "next/server";
import { createMentorshipReplyPayload } from "@/lib/mentorship";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireVerifiedProfileForApi } from "@/lib/tenant";

function normalizeString(value: unknown, maxLength: number) {
  if (typeof value !== "string") {
    return "";
  }

  return value.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

type RouteContext = {
  params: Promise<{ doubtId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const guard = await requireVerifiedProfileForApi();
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  const { doubtId } = await context.params;
  if (!doubtId) {
    return NextResponse.json({ error: "Doubt not found." }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const payload = body as Record<string, unknown>;
  const replyBody = normalizeString(payload.body, 1200);

  if (replyBody.length < 4) {
    return NextResponse.json({ error: "Write a meaningful reply before posting." }, { status: 400 });
  }

  const isEligible =
    (guard.profile.role === "senior" &&
      guard.profile.mentor_approved &&
      guard.profile.mentor_active &&
      guard.profile.mentor_category === "senior") ||
    guard.profile.role === "admin" ||
    guard.profile.role === "superadmin";

  if (!isEligible) {
    return NextResponse.json(
      { error: "Only the assigned senior responder or administrator can reply to campus doubts." },
      { status: 403 },
    );
  }

  const { data: doubt, error: doubtError } = await guard.supabase
    .from("doubts")
    .select("id, user_id, title, moderation_state, assigned_to, status")
    .eq("id", doubtId)
    .eq("university_id", guard.profile.university_id)
    .maybeSingle();

  if (doubtError || !doubt || doubt.moderation_state === "hidden") {
    return NextResponse.json({ error: "Doubt not found." }, { status: 404 });
  }

  if (doubt.status === "resolved") {
    return NextResponse.json({ error: "This doubt is already marked as resolved." }, { status: 409 });
  }

  if (doubt.assigned_to !== guard.profile.id) {
    return NextResponse.json(
      { error: "This doubt is waiting for its assigned senior responder." },
      { status: 403 },
    );
  }

  const { data: reply, error: replyError } = await guard.supabase
    .from("doubt_replies")
    .insert({
      body: replyBody,
      doubt_id: doubtId,
      university_id: guard.profile.university_id,
      user_id: guard.profile.id,
    })
    .select("id, body, created_at")
    .single();

  if (replyError || !reply) {
    return NextResponse.json({ error: "Could not post the reply. Try again." }, { status: 500 });
  }

  if (doubt.user_id !== guard.profile.id) {
    const admin = createSupabaseAdminClient();
    const responderName = guard.profile.full_name?.trim() || guard.profile.email;
    await admin.from("notifications").insert({
      university_id: guard.profile.university_id,
      user_id: doubt.user_id,
      type: "doubt_reply",
      title: "New reply on your doubt",
      body: `${responderName} replied to ${doubt.title?.trim() || "your campus doubt"}.`,
      href: "/mentorship",
    });
  }

  return NextResponse.json(
    createMentorshipReplyPayload({
      replyId: reply.id,
      author: guard.profile,
      body: reply.body,
      createdAt: reply.created_at,
    }),
    { status: 201 },
  );
}
