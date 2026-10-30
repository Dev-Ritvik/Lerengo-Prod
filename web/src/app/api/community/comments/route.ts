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
  const parentId = normalizeString(payload.parentId, 64) || null;
  const commentBody = normalizeString(payload.body, 600);

  if (!postId || commentBody.length < 4) {
    return NextResponse.json({ error: "Write a meaningful reply before posting." }, { status: 400 });
  }

  const adminResult = getRouteAdminClient({
    feature: "Community replies",
    route: "/api/community/comments",
  });
  if (!adminResult.ok) {
    return adminResult.response;
  }
  const admin = adminResult.admin;

  const rateLimitResponse = await enforceRouteRateLimit({
    request,
    profile: guard.profile,
    routeKey: "api:community:comments:create",
    limit: 20,
    windowMs: 15 * 60 * 1000,
    message: "Too many replies in a short time. Wait a bit before posting another.",
    persistent: {
      client: admin,
      actorColumn: "user_id",
      actorId: guard.profile.id,
      extraEq: {
        university_id: guard.profile.university_id,
      },
      table: "community_comments",
      windowMs: 15 * 60 * 1000,
      limit: 20,
    },
  });
  if (rateLimitResponse) {
    return rateLimitResponse;
  }
  const { data: post, error: postError } = await guard.supabase
    .from("community_posts")
    .select("id, university_id")
    .eq("id", postId)
    .eq("university_id", guard.profile.university_id)
    .maybeSingle();

  if (postError || !post) {
    return NextResponse.json({ error: "Discussion not found." }, { status: 404 });
  }

  if (parentId) {
    const { data: parent } = await guard.supabase
      .from("community_comments")
      .select("id")
      .eq("id", parentId)
      .eq("post_id", postId)
      .eq("university_id", guard.profile.university_id)
      .maybeSingle();

    if (!parent) {
      return NextResponse.json({ error: "Parent reply not found." }, { status: 404 });
    }
  }

  const { error: insertError } = await guard.supabase.from("community_comments").insert({
    body: commentBody,
    parent_id: parentId,
    post_id: postId,
    university_id: guard.profile.university_id,
    user_id: guard.profile.id,
  });

  if (insertError) {
    return NextResponse.json({ error: "Could not post the reply. Try again." }, { status: 500 });
  }

  const { count: replyCount, error: countError } = await admin
    .from("community_comments")
    .select("*", { count: "exact", head: true })
    .eq("post_id", postId)
    .eq("university_id", guard.profile.university_id);

  if (countError) {
    return NextResponse.json({ error: "Reply saved, but count update failed." }, { status: 500 });
  }

  const { error: updateError } = await admin
    .from("community_posts")
    .update({ reply_count: replyCount ?? 0 })
    .eq("id", postId)
    .eq("university_id", guard.profile.university_id);

  if (updateError) {
    return NextResponse.json({ error: "Reply saved, but count update failed." }, { status: 500 });
  }

  return NextResponse.json({ replyCount: replyCount ?? 0, success: true });
}
