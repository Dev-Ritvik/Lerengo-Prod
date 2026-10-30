"use server";

import { redirect } from "next/navigation";
import { requireAdminUser } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

function getStringValue(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

type Decision = "approved" | "rejected";

function parseDecision(rawDecision: string): Decision | null {
  if (rawDecision === "approved" || rawDecision === "rejected") {
    return rawDecision;
  }

  return null;
}

export async function reviewVerificationRequest(formData: FormData) {
  const requestId = getStringValue(formData.get("requestId"));
  const reviewNote = getStringValue(formData.get("reviewNote"));
  const decision = parseDecision(getStringValue(formData.get("decision")));

  if (!requestId || !decision) {
    redirect("/admin/verification?error=invalid_input");
  }

  const { appUser } = await requireAdminUser();

  let supabaseAdmin: ReturnType<typeof createSupabaseAdminClient>;
  try {
    supabaseAdmin = createSupabaseAdminClient();
  } catch {
    redirect("/admin/verification?error=service_role_missing");
  }

  const { data: request, error: requestError } = await supabaseAdmin
    .from("verification_requests")
    .select("id, user_id, university_id, status, reasons, reg_id_hash, reg_id_last4")
    .eq("id", requestId)
    .eq("university_id", appUser.university_id)
    .maybeSingle();

  if (requestError || !request) {
    redirect("/admin/verification?error=request_not_found");
  }

  if (request.status !== "pending") {
    redirect("/admin/verification?error=already_reviewed");
  }

  const decidedAt = new Date().toISOString();
  const baseReasons =
    request.reasons && typeof request.reasons === "object" && !Array.isArray(request.reasons)
      ? request.reasons
      : {};

  const nextReasons = {
    ...baseReasons,
    admin_review: {
      note: reviewNote || null,
      reviewed_at: decidedAt,
      reviewed_by: appUser.id,
      status: decision,
    },
  };

  const { error: updateRequestError } = await supabaseAdmin
    .from("verification_requests")
    .update({
      status: decision,
      decided_at: decidedAt,
      reasons: nextReasons,
    })
    .eq("id", request.id)
    .eq("university_id", appUser.university_id);

  if (updateRequestError) {
    redirect("/admin/verification?error=request_update_failed");
  }

  const profilePatch =
    decision === "approved"
      ? {
          reg_id_hash: request.reg_id_hash,
          reg_id_last4: request.reg_id_last4,
          verified: true,
          verified_at: decidedAt,
        }
      : {
          reg_id_hash: null,
          reg_id_last4: null,
          verified: false,
          verified_at: null,
        };

  const { error: userUpdateError } = await supabaseAdmin
    .from("users")
    .update(profilePatch)
    .eq("id", request.user_id)
    .eq("university_id", appUser.university_id);

  if (userUpdateError) {
    redirect("/admin/verification?error=user_update_failed");
  }

  redirect(`/admin/verification?success=${decision}`);
}
