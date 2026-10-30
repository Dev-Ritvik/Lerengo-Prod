import { NextResponse } from "next/server";
import type { RouteAdminClient } from "@/lib/route-security";
import { enforceRouteRateLimit, getRouteAdminClient } from "@/lib/route-security";
import { requireVerifiedProfileForApi } from "@/lib/tenant";

type TargetType = "post" | "comment";
type SyncCountResult =
  | { error: true }
  | { error: false; helpfulCount: number };

function normalizeString(value: unknown, maxLength: number) {
  if (typeof value !== "string") {
    return "";
  }

  return value.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function isTargetType(value: string): value is TargetType {
  return value === "post" || value === "comment";
}

async function syncPostHelpfulCount(
  admin: RouteAdminClient,
  params: { postId: string; universityId: string },
): Promise<SyncCountResult> {
  const { count, error: countError } = await admin
    .from("community_post_votes")
    .select("*", { count: "exact", head: true })
    .eq("post_id", params.postId)
    .eq("university_id", params.universityId);

  if (countError) {
    return { error: true };
  }

  const helpfulCount = count ?? 0;
  const { error: updateError } = await admin
    .from("community_posts")
    .update({ helpful_count: helpfulCount })
    .eq("id", params.postId)
    .eq("university_id", params.universityId);

  if (updateError) {
    return { error: true };
  }

  return { error: false, helpfulCount };
}

async function syncCommentHelpfulCount(
  admin: RouteAdminClient,
  params: { commentId: string; universityId: string },
): Promise<SyncCountResult> {
  const { count, error: countError } = await admin
    .from("community_comment_votes")
    .select("*", { count: "exact", head: true })
    .eq("comment_id", params.commentId)
    .eq("university_id", params.universityId);

  if (countError) {
    return { error: true };
  }

  const helpfulCount = count ?? 0;
  const { error: updateError } = await admin
    .from("community_comments")
    .update({ helpful_count: helpfulCount })
    .eq("id", params.commentId)
    .eq("university_id", params.universityId);

  if (updateError) {
    return { error: true };
  }

  return { error: false, helpfulCount };
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
  const targetTypeRaw = normalizeString(payload.targetType, 12);
  const targetId = normalizeString(payload.targetId, 64);

  if (!isTargetType(targetTypeRaw) || !targetId) {
    return NextResponse.json({ error: "Invalid helpful request." }, { status: 400 });
  }

  const rateLimitResponse = await enforceRouteRateLimit({
    request,
    profile: guard.profile,
    routeKey: "api:community:helpful",
    limit: 60,
    windowMs: 10 * 60 * 1000,
    message: "Helpful voting is temporarily rate limited. Wait a moment before trying again.",
  });
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const adminResult = getRouteAdminClient({
    feature: "Helpful voting",
    route: "/api/community/helpful",
  });
  if (!adminResult.ok) {
    return adminResult.response;
  }
  const admin = adminResult.admin;
  if (targetTypeRaw === "post") {
    const { data: post, error: postError } = await admin
      .from("community_posts")
      .select("id, university_id")
      .eq("id", targetId)
      .eq("university_id", guard.profile.university_id)
      .maybeSingle();

    if (postError || !post) {
      return NextResponse.json({ error: "Discussion not found." }, { status: 404 });
    }

    const { data: existingVote } = await admin
      .from("community_post_votes")
      .select("id")
      .eq("post_id", targetId)
      .eq("user_id", guard.profile.id)
      .eq("university_id", guard.profile.university_id)
      .maybeSingle();

    if (existingVote) {
      const { error: deleteVoteError } = await admin.from("community_post_votes").delete().eq("id", existingVote.id);
      if (deleteVoteError) {
        return NextResponse.json({ error: "Could not update helpful state." }, { status: 500 });
      }

      const syncResult = await syncPostHelpfulCount(admin, {
        postId: targetId,
        universityId: guard.profile.university_id,
      });
      if (syncResult.error) {
        return NextResponse.json({ error: "Could not update helpful state." }, { status: 500 });
      }

      return NextResponse.json({
        helpfulCount: syncResult.helpfulCount,
        success: true,
        voted: false,
      });
    }

    const { error: insertVoteError } = await admin.from("community_post_votes").insert({
        post_id: targetId,
        university_id: guard.profile.university_id,
        user_id: guard.profile.id,
      });

    if (insertVoteError && insertVoteError.code !== "23505") {
      return NextResponse.json({ error: "Could not update helpful state." }, { status: 500 });
    }

    const syncResult = await syncPostHelpfulCount(admin, {
      postId: targetId,
      universityId: guard.profile.university_id,
    });
    if (syncResult.error) {
      return NextResponse.json({ error: "Could not update helpful state." }, { status: 500 });
    }

    return NextResponse.json({
      helpfulCount: syncResult.helpfulCount,
      success: true,
      voted: true,
    });
  }

  const { data: comment, error: commentError } = await admin
    .from("community_comments")
    .select("id, university_id")
    .eq("id", targetId)
    .eq("university_id", guard.profile.university_id)
    .maybeSingle();

  if (commentError || !comment) {
    return NextResponse.json({ error: "Reply not found." }, { status: 404 });
  }

  const { data: existingVote } = await admin
    .from("community_comment_votes")
    .select("id")
    .eq("comment_id", targetId)
    .eq("user_id", guard.profile.id)
    .eq("university_id", guard.profile.university_id)
    .maybeSingle();

  if (existingVote) {
    const { error: deleteVoteError } = await admin.from("community_comment_votes").delete().eq("id", existingVote.id);
    if (deleteVoteError) {
      return NextResponse.json({ error: "Could not update helpful state." }, { status: 500 });
    }

    const syncResult = await syncCommentHelpfulCount(admin, {
      commentId: targetId,
      universityId: guard.profile.university_id,
    });
    if (syncResult.error) {
      return NextResponse.json({ error: "Could not update helpful state." }, { status: 500 });
    }

    return NextResponse.json({
      helpfulCount: syncResult.helpfulCount,
      success: true,
      voted: false,
    });
  }

  const { error: insertVoteError } = await admin.from("community_comment_votes").insert({
      comment_id: targetId,
      university_id: guard.profile.university_id,
      user_id: guard.profile.id,
    });

  if (insertVoteError && insertVoteError.code !== "23505") {
    return NextResponse.json({ error: "Could not update helpful state." }, { status: 500 });
  }

  const syncResult = await syncCommentHelpfulCount(admin, {
    commentId: targetId,
    universityId: guard.profile.university_id,
  });
  if (syncResult.error) {
    return NextResponse.json({ error: "Could not update helpful state." }, { status: 500 });
  }

  return NextResponse.json({
    helpfulCount: syncResult.helpfulCount,
    success: true,
    voted: true,
  });
}
