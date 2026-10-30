import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireVerifiedProfileForApi } from "@/lib/tenant";
import type { MentorshipReportTargetType, NotificationType } from "@/lib/supabase/types";

const TARGET_TYPES: MentorshipReportTargetType[] = ["doubt", "reply"];

function normalizeString(value: unknown, maxLength: number) {
  if (typeof value !== "string") {
    return "";
  }

  return value.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function isTargetType(value: string): value is MentorshipReportTargetType {
  return TARGET_TYPES.includes(value as MentorshipReportTargetType);
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
  const targetType = normalizeString(payload.targetType, 12);
  const targetId = normalizeString(payload.targetId, 80);
  const reason = normalizeString(payload.reason, 300);

  if (!isTargetType(targetType) || !targetId || reason.length < 6) {
    return NextResponse.json({ error: "Invalid report details." }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();

  if (targetType === "doubt") {
    const { data: doubt, error } = await admin
      .from("doubts")
      .select("id, title, moderation_state")
      .eq("id", targetId)
      .eq("university_id", guard.profile.university_id)
      .maybeSingle();

    if (error || !doubt || doubt.moderation_state === "hidden") {
      return NextResponse.json({ error: "Doubt not found." }, { status: 404 });
    }

    const { data: duplicate } = await admin
      .from("mentorship_reports")
      .select("id")
      .eq("university_id", guard.profile.university_id)
      .eq("reporter_id", guard.profile.id)
      .eq("target_type", "doubt")
      .eq("doubt_id", targetId)
      .eq("status", "open")
      .maybeSingle();

    if (duplicate) {
      return NextResponse.json({ error: "This doubt is already reported." }, { status: 409 });
    }

    const { error: insertError } = await admin.from("mentorship_reports").insert({
      university_id: guard.profile.university_id,
      reporter_id: guard.profile.id,
      target_type: "doubt",
      doubt_id: targetId,
      reason,
      status: "open",
    });

    if (insertError) {
      return NextResponse.json({ error: "Could not submit the report. Try again." }, { status: 500 });
    }
  } else {
    const { data: reply, error } = await admin
      .from("doubt_replies")
      .select("id, moderation_state")
      .eq("id", targetId)
      .eq("university_id", guard.profile.university_id)
      .maybeSingle();

    if (error || !reply || reply.moderation_state === "hidden") {
      return NextResponse.json({ error: "Reply not found." }, { status: 404 });
    }

    const { data: duplicate } = await admin
      .from("mentorship_reports")
      .select("id")
      .eq("university_id", guard.profile.university_id)
      .eq("reporter_id", guard.profile.id)
      .eq("target_type", "reply")
      .eq("reply_id", targetId)
      .eq("status", "open")
      .maybeSingle();

    if (duplicate) {
      return NextResponse.json({ error: "This reply is already reported." }, { status: 409 });
    }

    const { error: insertError } = await admin.from("mentorship_reports").insert({
      university_id: guard.profile.university_id,
      reporter_id: guard.profile.id,
      target_type: "reply",
      reply_id: targetId,
      reason,
      status: "open",
    });

    if (insertError) {
      return NextResponse.json({ error: "Could not submit the report. Try again." }, { status: 500 });
    }
  }

  const { data: admins } = await admin
    .from("users")
    .select("id")
    .eq("university_id", guard.profile.university_id)
    .eq("verified", true)
    .eq("role", "admin");

  if (admins?.length) {
    const notificationType: NotificationType = "mentorship_report";
    await admin.from("notifications").insert(
      admins.map((user: any) => ({
        university_id: guard.profile.university_id,
        user_id: user.id,
        type: notificationType,
        title: "New mentorship report",
        body: `${guard.profile.full_name?.trim() || guard.profile.email} reported a ${targetType}.`,
        href: "/admin/mentorship",
      })),
    );
  }

  return NextResponse.json({ success: true }, { status: 201 });
}
