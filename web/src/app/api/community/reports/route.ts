import { NextResponse } from "next/server";
import { enforceRouteRateLimit, getRouteAdminClient } from "@/lib/route-security";
import { requireVerifiedProfileForApi } from "@/lib/tenant";

function normalizeString(value: unknown, maxLength: number) {
  if (typeof value !== "string") {
    return "";
  }

  return value.replace(/\s+/g, " ").trim().slice(0, maxLength);
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
  const postId = normalizeString(payload.postId, 64);
  const reason = normalizeString(payload.reason, 180);

  if (!postId || reason.length < 8) {
    return NextResponse.json(
      { error: "Add a clear report reason before submitting." },
      { status: 400 },
    );
  }

  const { data: post, error: postError } = await guard.supabase
    .from("community_posts")
    .select("id, university_id")
    .eq("id", postId)
    .eq("university_id", guard.profile.university_id)
    .maybeSingle();

  if (postError || !post) {
    return NextResponse.json({ error: "Post not found." }, { status: 404 });
  }

  const { data: existingOpenReport } = await guard.supabase
    .from("community_reports")
    .select("id")
    .eq("post_id", postId)
    .eq("user_id", guard.profile.id)
    .eq("status", "open")
    .maybeSingle();

  if (existingOpenReport) {
    return NextResponse.json({ error: "You already reported this discussion." }, { status: 409 });
  }

  const adminResult = getRouteAdminClient({
    feature: "Community reporting",
    route: "/api/community/reports",
  });
  if (!adminResult.ok) {
    return adminResult.response;
  }
  const admin = adminResult.admin;

  const rateLimitResponse = await enforceRouteRateLimit({
    request,
    profile: guard.profile,
    routeKey: "api:community:reports:create",
    limit: 15,
    windowMs: 60 * 60 * 1000,
    message: "Too many moderation reports in a short time. Wait before sending more.",
    persistent: {
      client: admin,
      actorColumn: "user_id",
      actorId: guard.profile.id,
      extraEq: {
        university_id: guard.profile.university_id,
      },
      table: "community_reports",
      windowMs: 60 * 60 * 1000,
      limit: 15,
    },
  });
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const { error } = await admin.from("community_reports").insert({
    post_id: postId,
    reason,
    review_note: null,
    reviewed_by: null,
    status: "open",
    university_id: guard.profile.university_id,
    user_id: guard.profile.id,
  });

  if (error) {
    return NextResponse.json({ error: "Could not submit the report. Try again." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
