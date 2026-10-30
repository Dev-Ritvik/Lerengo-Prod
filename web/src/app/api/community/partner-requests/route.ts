import { NextResponse } from "next/server";
import { enforceRouteRateLimit, getRouteAdminClient } from "@/lib/route-security";
import { requireVerifiedProfileForApi } from "@/lib/tenant";

function normalizeString(value: unknown, maxLength: number) {
  if (typeof value !== "string") {
    return "";
  }

  return value.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function normalizeSkills(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean)
    .slice(0, 6);
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
  const title = normalizeString(payload.title, 100);
  const description = normalizeString(payload.description, 280);
  const openRoles = normalizeString(payload.openRoles, 80);
  const teamSizeLabel = normalizeString(payload.teamSizeLabel, 60);
  const skills = normalizeSkills(payload.skills);

  if (!title || !description || !openRoles || !teamSizeLabel || skills.length === 0) {
    return NextResponse.json(
      { error: "Complete all fields before submitting your partner request." },
      { status: 400 },
    );
  }

  const adminResult = getRouteAdminClient({
    feature: "Partner requests",
    route: "/api/community/partner-requests",
  });
  if (!adminResult.ok) {
    return adminResult.response;
  }
  const admin = adminResult.admin;

  const rateLimitResponse = await enforceRouteRateLimit({
    request,
    profile: guard.profile,
    routeKey: "api:community:partner-requests:create",
    limit: 6,
    windowMs: 60 * 60 * 1000,
    message: "Too many partner requests in a short time. Wait before posting another.",
    persistent: {
      client: admin,
      actorColumn: "user_id",
      actorId: guard.profile.id,
      extraEq: {
        university_id: guard.profile.university_id,
      },
      table: "community_partner_requests",
      windowMs: 60 * 60 * 1000,
      limit: 6,
    },
  });
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const { error } = await admin.from("community_partner_requests").insert({
    description,
    matched_by: null,
    open_roles: openRoles,
    skills,
    status: "open",
    team_size_label: teamSizeLabel,
    title,
    university_id: guard.profile.university_id,
    user_id: guard.profile.id,
  });

  if (error) {
    return NextResponse.json({ error: "Could not submit the request. Try again." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
