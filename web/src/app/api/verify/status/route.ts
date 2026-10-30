import { NextResponse } from "next/server";
import { getSessionProfileForApi } from "@/lib/tenant";

export async function GET(request: Request) {
  const session = await getSessionProfileForApi();
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  const { profile, supabase } = session;
  const url = new URL(request.url);
  const requestId = url.searchParams.get("request_id");

  const requestQuery = supabase
    .from("verification_requests")
    .select("id, status, score, reasons, decided_at, created_at")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(1);

  const result = requestId
    ? await supabase
        .from("verification_requests")
        .select("id, status, score, reasons, decided_at, created_at")
        .eq("id", requestId)
        .eq("user_id", profile.id)
        .maybeSingle()
    : await requestQuery.maybeSingle();

  if (result.error) {
    return NextResponse.json(
      { error: "Could not fetch verification status." },
      { status: 500 },
    );
  }

  if (!result.data) {
    return NextResponse.json({
      decided_at: profile.verified ? new Date().toISOString() : null,
      reasons: {},
      request_id: null,
      score: profile.verified ? 100 : 0,
      status: profile.verified ? "approved" : "pending",
      verified: profile.verified,
    });
  }

  const effectiveStatus =
    profile.verified
      ? "approved"
      : result.data.status === "rejected"
        ? "rejected"
        : "pending";

  return NextResponse.json({
    ...result.data,
    request_id: result.data.id,
    status: effectiveStatus,
    verified: profile.verified,
  });
}
