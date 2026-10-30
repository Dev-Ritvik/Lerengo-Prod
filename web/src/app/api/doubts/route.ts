import { NextResponse } from "next/server";
import {
  createMentorshipDoubtPayload,
} from "@/lib/mentorship";
import { enforceRouteRateLimit, getRouteAdminClient } from "@/lib/route-security";
import { requireVerifiedProfileForApi } from "@/lib/tenant";

function normalizeString(value: unknown, maxLength: number) {
  if (typeof value !== "string") {
    return "";
  }

  return value.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function deriveTitle(value: string) {
  const normalized = normalizeString(value, 120);
  if (!normalized) {
    return "";
  }

  const sentence = normalized.split(/[.?!]/, 1)[0]?.trim() ?? normalized;
  return sentence.slice(0, 72) || normalized.slice(0, 72);
}

export async function GET() {
  const session = await requireVerifiedProfileForApi();
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  const { profile, supabase } = session;

  const { data: doubts, error } = await supabase
    .from("doubts")
    .select("id, title, description, status, created_at, user_id, assigned_to, moderation_state")
    .eq("university_id", profile.university_id)
    .neq("moderation_state", "hidden")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(doubts);
}

export async function POST(request: Request) {
  const session = await requireVerifiedProfileForApi();
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  const { profile } = session;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const payload = body as Record<string, unknown>;
  const description = normalizeString(payload.description, 800);
  const title = normalizeString(payload.title, 120) || deriveTitle(description);

  if (description.length < 8 || !title) {
    return NextResponse.json(
      { error: "Write a meaningful doubt before posting." },
      { status: 400 },
    );
  }

  const adminResult = getRouteAdminClient({
    feature: "Doubt posting",
    route: "/api/doubts",
  });
  if (!adminResult.ok) {
    return adminResult.response;
  }
  const admin = adminResult.admin;

  const rateLimitResponse = await enforceRouteRateLimit({
    request,
    profile,
    routeKey: "api:doubts:create",
    limit: 6,
    windowMs: 15 * 60 * 1000,
    message: "Too many doubts posted in a short time. Wait a bit before posting another.",
    persistent: {
      client: admin,
      actorColumn: "user_id",
      actorId: profile.id,
      extraEq: {
        university_id: profile.university_id,
      },
      table: "doubts",
      windowMs: 15 * 60 * 1000,
      limit: 6,
    },
  });
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const { data: doubt, error } = await admin
    .from("doubts")
    .insert({
      assigned_to: null,
      title,
      description,
      moderation_state: "visible",
      university_id: profile.university_id,
      user_id: profile.id,
      status: "open",
    })
    .select("id, title, description, created_at")
    .single();

  if (error || !doubt) {
    return NextResponse.json({ error: "Could not post the doubt. Try again." }, { status: 500 });
  }

  return NextResponse.json(
    createMentorshipDoubtPayload({
      doubtId: doubt.id,
      author: profile,
      subject: doubt.title,
      question: doubt.description,
      createdAt: doubt.created_at,
    }),
    { status: 201 },
  );
}
