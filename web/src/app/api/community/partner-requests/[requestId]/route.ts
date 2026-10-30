import { NextResponse } from "next/server";
import { requireVerifiedProfileForApi } from "@/lib/tenant";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { CommunityPartnerStatus } from "@/lib/supabase/types";

function normalizeString(value: unknown, maxLength: number) {
  if (typeof value !== "string") {
    return "";
  }

  return value.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function isPartnerStatus(value: string): value is CommunityPartnerStatus {
  return value === "open" || value === "matched" || value === "closed";
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ requestId: string }> },
) {
  const guard = await requireVerifiedProfileForApi();
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  const { requestId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const payload = body as Record<string, unknown>;
  const status = normalizeString(payload.status, 16);
  if (!requestId || !isPartnerStatus(status)) {
    return NextResponse.json({ error: "Invalid partner request action." }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const { data: partnerRequest, error: requestError } = await admin
    .from("community_partner_requests")
    .select("id, status, university_id, user_id")
    .eq("id", requestId)
    .eq("university_id", guard.profile.university_id)
    .maybeSingle();

  if (requestError || !partnerRequest) {
    return NextResponse.json({ error: "Partner request not found." }, { status: 404 });
  }

  const canManage =
    partnerRequest.user_id === guard.profile.id || guard.profile.role === "admin";

  if (!canManage) {
    return NextResponse.json({ error: "You cannot manage this request." }, { status: 403 });
  }

  const patch = {
    matched_by: status === "matched" ? guard.profile.id : null,
    status,
  } satisfies {
    matched_by: string | null;
    status: CommunityPartnerStatus;
  };

  const { error: updateError } = await admin
    .from("community_partner_requests")
    .update(patch)
    .eq("id", partnerRequest.id)
    .eq("university_id", guard.profile.university_id);

  if (updateError) {
    return NextResponse.json({ error: "Could not update the request status." }, { status: 500 });
  }

  return NextResponse.json({ status, success: true });
}
