import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { getRouteAdminClient } from "@/lib/route-security";
import { getSessionProfileForApi } from "@/lib/tenant";
import {
  buildIdFrontPath,
  evaluateVerification,
  inspectUploadedImage,
  regIdLast4,
  sha256Hex,
} from "@/lib/verification";
import { cleanupExpiredVerificationArtifacts } from "@/lib/verification-retention";

const MAX_FILE_BYTES = 8 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

export async function POST(request: Request) {
  const session = await getSessionProfileForApi();
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  const { authUser, profile, supabase } = session;
  if (profile.verified) {
    return NextResponse.json(
      { error: "You are already verified for this university." },
      { status: 409 },
    );
  }

  const now = Date.now();
  const cutoffIso = new Date(now - 24 * 60 * 60 * 1000).toISOString();
  const { data: recentAttempts, error: attemptsError } = await supabase
    .from("verification_requests")
    .select("id")
    .eq("user_id", profile.id)
    .gte("created_at", cutoffIso);

  if (attemptsError) {
    return NextResponse.json(
      { error: "Could not validate verification attempts." },
      { status: 500 },
    );
  }

  const maxAttemptsPerDay = env.ID_VERIFICATION_MAX_ATTEMPTS_PER_DAY;
  if ((recentAttempts?.length ?? 0) >= maxAttemptsPerDay) {
    return NextResponse.json(
      { error: `Attempt limit reached (${maxAttemptsPerDay}/day). Try again after 24 hours.` },
      { status: 429 },
    );
  }

  const formData = await request.formData();
  const idFront = formData.get("idFront");
  const regIdValue = formData.get("regId");
  const declaredRegId = typeof regIdValue === "string" ? regIdValue.trim() : "";

  if (!(idFront instanceof File)) {
    return NextResponse.json(
      { error: "ID front image is required." },
      { status: 400 },
    );
  }

  if (!ALLOWED_IMAGE_TYPES.has(idFront.type.toLowerCase())) {
    return NextResponse.json(
      { error: "Only JPG, PNG, or WEBP images are allowed." },
      { status: 400 },
    );
  }

  if (idFront.size > MAX_FILE_BYTES) {
    return NextResponse.json(
      { error: "Image size exceeds 8MB limit." },
      { status: 400 },
    );
  }

  const { data: university, error: universityError } = await supabase
    .from("universities")
    .select("id, name, domain, keywords, min_score, name_variants, reg_id_regex")
    .eq("id", profile.university_id)
    .eq("is_active", true)
    .maybeSingle();

  if (universityError || !university) {
    return NextResponse.json(
      { error: "Invalid university selection." },
      { status: 400 },
    );
  }

  const filePath = buildIdFrontPath(profile.id, idFront.name);
  const fileBytes = await idFront.arrayBuffer();
  const imageInspection = inspectUploadedImage(fileBytes);

  if (!imageInspection.signatureValid) {
    return NextResponse.json(
      { error: "Image appears invalid. Upload a valid JPG, PNG, or WEBP file." },
      { status: 400 },
    );
  }

  if (
    imageInspection.width !== null &&
    imageInspection.height !== null &&
    (imageInspection.width < 520 || imageInspection.height < 280)
  ) {
    return NextResponse.json(
      { error: "ID image is too small. Upload a clearer, higher-resolution photo." },
      { status: 400 },
    );
  }

  const adminResult = getRouteAdminClient({
    feature: "Verification processing",
    route: "/api/verify/upload",
  });
  if (!adminResult.ok) {
    return NextResponse.json(
      { error: "Verification processing requires the Supabase service role key." },
      { status: 503 },
    );
  }
  const supabaseAdmin = adminResult.admin;

  await cleanupExpiredVerificationArtifacts(supabaseAdmin, { limit: 20 });

  const { error: uploadError } = await supabaseAdmin.storage
    .from(env.SUPABASE_ID_CARDS_BUCKET)
    .upload(filePath, fileBytes, {
      contentType: idFront.type,
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json(
      { error: "Could not upload ID image." },
      { status: 500 },
    );
  }
  const attemptNo = (recentAttempts?.length ?? 0) + 1;
  const { data: requestRow, error: createError } = await supabaseAdmin
    .from("verification_requests")
    .insert({
      attempt_no: attemptNo,
      decided_at: null,
      id_front_path: filePath,
      reasons: {},
      score: 0,
      status: "pending",
      university_id: profile.university_id,
      user_id: profile.id,
    })
    .select("id")
    .single();

  if (createError || !requestRow) {
    await supabaseAdmin.storage.from(env.SUPABASE_ID_CARDS_BUCKET).remove([filePath]);
    return NextResponse.json(
      { error: "Could not create verification request." },
      { status: 500 },
    );
  }

  const evaluation = evaluateVerification({
    allowAutoApprove: env.ID_VERIFICATION_AUTO_APPROVE,
    declaredRegId,
    email: authUser.email,
    fileName: idFront.name,
    fileSize: idFront.size,
    fullName: profile.full_name,
    imageInspection,
    university,
  });
  const regIdHash = evaluation.regIdCandidate
    ? sha256Hex(evaluation.regIdCandidate)
    : null;
  const regIdLast4Value = regIdLast4(evaluation.regIdCandidate);

  const decidedAt = new Date().toISOString();
  const isFinalDecision = evaluation.decision !== "pending";
  const { error: requestUpdateError } = await supabaseAdmin
    .from("verification_requests")
    .update({
      decided_at: isFinalDecision ? decidedAt : null,
      reg_id_hash: regIdHash,
      reg_id_last4: regIdLast4Value,
      reasons: evaluation.reasons,
      score: evaluation.score,
      status: evaluation.decision,
    })
    .eq("id", requestRow.id)
    .eq("user_id", profile.id);

  if (requestUpdateError) {
    return NextResponse.json(
      { error: "Verification request processing failed." },
      { status: 500 },
    );
  }

  if (evaluation.decision === "approved") {
    const { error: profileUpdateError } = await supabaseAdmin
      .from("users")
      .update({
        reg_id_hash: regIdHash,
        reg_id_last4: regIdLast4Value,
        verified: true,
        verified_at: decidedAt,
      })
      .eq("id", profile.id);

    if (profileUpdateError) {
      return NextResponse.json(
        { error: "Verification completed but profile update failed." },
        { status: 500 },
      );
    }
  } else if (evaluation.decision === "rejected") {
    await supabaseAdmin
      .from("users")
      .update({
        verified: false,
        verified_at: null,
      })
      .eq("id", profile.id);
  }

  // DPDP compliance: purge the raw ID card image from storage once a
  // final decision (auto-approve or auto-reject) has been recorded.
  // Only reg_id_hash and reg_id_last4 are retained on the user record.
  if (filePath) {
    await supabaseAdmin.storage
      .from(env.SUPABASE_ID_CARDS_BUCKET)
      .remove([filePath]);
  }

  return NextResponse.json({
    request_id: requestRow.id,
    score: evaluation.score,
    status: evaluation.decision,
  });
}
