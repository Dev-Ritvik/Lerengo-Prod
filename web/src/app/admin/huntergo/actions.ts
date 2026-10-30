"use server";

import { redirect } from "next/navigation";
import { requireAdminUser } from "@/lib/auth";
import {
  isHunterOpportunityStatus,
  isHunterVerificationStatus,
} from "@/lib/huntergo";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

function getStringValue(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

export async function reviewHunterCompany(formData: FormData) {
  const companyId = getStringValue(formData.get("companyId"));
  const verificationStatus = getStringValue(formData.get("verificationStatus"));
  const adminNotes = getStringValue(formData.get("adminNotes")).slice(0, 2000);

  if (!companyId || !isHunterVerificationStatus(verificationStatus)) {
    redirect("/admin/huntergo?error=invalid_company_review");
  }

  const { appUser } = await requireAdminUser();
  const admin = createSupabaseAdminClient();

  const { error } = await admin
    .from("hunter_companies")
    .update({
      admin_notes: adminNotes || null,
      reviewed_at: new Date().toISOString(),
      reviewed_by: appUser.id,
      updated_at: new Date().toISOString(),
      verification_status: verificationStatus,
    })
    .eq("id", companyId);

  if (error) {
    redirect("/admin/huntergo?error=company_save_failed");
  }

  redirect("/admin/huntergo?success=company_reviewed");
}

export async function reviewHunterRecruiter(formData: FormData) {
  const recruiterId = getStringValue(formData.get("recruiterId"));
  const verificationStatus = getStringValue(formData.get("verificationStatus"));
  const monthlyInviteQuota = Number.parseInt(getStringValue(formData.get("monthlyInviteQuota")), 10);
  const adminNotes = getStringValue(formData.get("adminNotes")).slice(0, 2000);

  if (!recruiterId || !isHunterVerificationStatus(verificationStatus) || Number.isNaN(monthlyInviteQuota) || monthlyInviteQuota < 0) {
    redirect("/admin/huntergo?error=invalid_recruiter_review");
  }

  const { appUser } = await requireAdminUser();
  const admin = createSupabaseAdminClient();

  const { error } = await admin
    .from("hunter_recruiter_profiles")
    .update({
      admin_notes: adminNotes || null,
      monthly_invite_quota: Math.min(monthlyInviteQuota, 500),
      reviewed_at: new Date().toISOString(),
      reviewed_by: appUser.id,
      updated_at: new Date().toISOString(),
      verification_status: verificationStatus,
    })
    .eq("id", recruiterId);

  if (error) {
    redirect("/admin/huntergo?error=recruiter_save_failed");
  }

  redirect("/admin/huntergo?success=recruiter_reviewed");
}

export async function reviewHunterOpportunity(formData: FormData) {
  const opportunityId = getStringValue(formData.get("opportunityId"));
  const status = getStringValue(formData.get("status"));
  const adminNotes = getStringValue(formData.get("adminNotes")).slice(0, 2000);

  if (!opportunityId || !isHunterOpportunityStatus(status)) {
    redirect("/admin/huntergo?error=invalid_opportunity_review");
  }

  const { appUser } = await requireAdminUser();
  const admin = createSupabaseAdminClient();

  const { error } = await admin
    .from("hunter_opportunities")
    .update({
      admin_notes: adminNotes || null,
      reviewed_at: new Date().toISOString(),
      reviewed_by: appUser.id,
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", opportunityId);

  if (error) {
    redirect("/admin/huntergo?error=opportunity_save_failed");
  }

  redirect("/admin/huntergo?success=opportunity_reviewed");
}
