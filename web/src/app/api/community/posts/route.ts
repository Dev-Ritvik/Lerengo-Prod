import { NextResponse } from "next/server";
import { enforceRouteRateLimit, getRouteAdminClient } from "@/lib/route-security";
import { requireVerifiedProfileForApi } from "@/lib/tenant";
import type { CommunityChannel } from "@/lib/supabase/types";

const ALLOWED_CHANNELS = new Set<CommunityChannel>(["Projects", "Research", "Exams", "Labs"]);

function normalizeString(value: unknown, maxLength: number) {
  if (typeof value !== "string") {
    return "";
  }

  return value.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function normalizeTags(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean)
    .slice(0, 6);
}

function buildBadgeLabel(role: string) {
  if (role === "admin") return "Campus Lead";
  if (role === "senior") return "Mentor";
  return "Contributor";
}

function buildTrustScore(role: string) {
  if (role === "admin") return 95;
  if (role === "senior") return 88;
  return 80;
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
  const channel = normalizeString(payload.channel, 24) as CommunityChannel;
  const title = normalizeString(payload.title, 100);
  const summary = normalizeString(payload.summary, 320);
  const topic = normalizeString(payload.topic, 80) || null;
  const tags = normalizeTags(payload.tags);

  if (!ALLOWED_CHANNELS.has(channel) || !title || !summary) {
    return NextResponse.json(
      { error: "Complete the required fields before posting." },
      { status: 400 },
    );
  }

  const adminResult = getRouteAdminClient({
    feature: "Community posting",
    route: "/api/community/posts",
  });
  if (!adminResult.ok) {
    return adminResult.response;
  }
  const admin = adminResult.admin;

  const rateLimitResponse = await enforceRouteRateLimit({
    request,
    profile: guard.profile,
    routeKey: "api:community:posts:create",
    limit: 8,
    windowMs: 30 * 60 * 1000,
    message: "Too many discussion posts in a short time. Wait before publishing another one.",
    persistent: {
      client: admin,
      actorColumn: "user_id",
      actorId: guard.profile.id,
      extraEq: {
        university_id: guard.profile.university_id,
      },
      table: "community_posts",
      windowMs: 30 * 60 * 1000,
      limit: 8,
    },
  });
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const { error } = await admin.from("community_posts").insert({
    badge_label: buildBadgeLabel(guard.profile.role),
    channel,
    helpful_count: 0,
    is_weekly_highlight: false,
    moderation_state: "reviewed",
    program_domain: guard.profile.program_domain,
    reply_count: 0,
    status_label: "Open",
    summary,
    tags,
    title,
    topic,
    trust_score: buildTrustScore(guard.profile.role),
    university_id: guard.profile.university_id,
    user_id: guard.profile.id,
  });

  if (error) {
    return NextResponse.json({ error: "Could not publish the discussion. Try again." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
