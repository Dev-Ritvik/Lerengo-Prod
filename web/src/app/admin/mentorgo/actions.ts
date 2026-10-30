"use server";

import { redirect } from "next/navigation";
import { requireAdminUser } from "@/lib/auth";
import {
  isMentorBookingStatus,
  isMentorPaymentStatus,
  isMentorVerificationStatus,
} from "@/lib/mentorgo";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

function getStringValue(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

export async function reviewMentorProfile(formData: FormData) {
  const profileId = getStringValue(formData.get("profileId"));
  const verificationStatus = getStringValue(formData.get("verificationStatus"));
  const isPublished = getStringValue(formData.get("isPublished")) === "true";
  const adminNotes = getStringValue(formData.get("adminNotes")).slice(0, 2000);

  if (!profileId || !isMentorVerificationStatus(verificationStatus)) {
    redirect("/admin/mentorgo?error=invalid_profile_review");
  }

  if (isPublished && verificationStatus !== "approved") {
    redirect("/admin/mentorgo?error=publish_requires_approval");
  }

  const { appUser } = await requireAdminUser();
  const admin = createSupabaseAdminClient();

  const { error } = await admin
    .from("mentor_profiles")
    .update({
      admin_notes: adminNotes || null,
      is_published: verificationStatus === "approved" ? isPublished : false,
      reviewed_at: new Date().toISOString(),
      reviewed_by: appUser.id,
      updated_at: new Date().toISOString(),
      verification_status: verificationStatus,
    })
    .eq("id", profileId);

  if (error) {
    redirect("/admin/mentorgo?error=profile_save_failed");
  }

  // Sync to users table
  const { data: profile } = await admin
    .from("mentor_profiles")
    .select("user_id, headline, mentor_type, expertise_tags")
    .eq("id", profileId)
    .maybeSingle();

  if (profile) {
    const isApproved = verificationStatus === "approved";
    const typeMapInverse: Record<string, string> = {
      industry_expert: "career",
      faculty: "faculty",
      alumni: "career",
      senior_student: "senior",
      founder: "career",
      operator: "career",
      other: "career",
    };
    const category = typeMapInverse[profile.mentor_type] || "career";

    await admin
      .from("users")
      .update({
        mentor_approved: isApproved,
        mentor_active: isApproved && isPublished,
        mentor_category: isApproved ? category : null,
        mentor_expertise: isApproved ? profile.expertise_tags : [],
        mentor_headline: isApproved ? profile.headline : null,
      })
      .eq("id", profile.user_id);
  }

  redirect("/admin/mentorgo?success=profile_reviewed");
}

export async function updateMentorBookingState(formData: FormData) {
  const bookingId = getStringValue(formData.get("bookingId"));
  const bookingStatus = getStringValue(formData.get("bookingStatus"));
  const paymentStatus = getStringValue(formData.get("paymentStatus"));
  const adminNotes = getStringValue(formData.get("adminNotes")).slice(0, 2000);

  if (!bookingId || !isMentorBookingStatus(bookingStatus) || !isMentorPaymentStatus(paymentStatus)) {
    redirect("/admin/mentorgo?error=invalid_booking_state");
  }

  await requireAdminUser();
  const admin = createSupabaseAdminClient();

  const { error } = await admin
    .from("mentor_bookings")
    .update({
      admin_notes: adminNotes || null,
      booking_status: bookingStatus,
      payment_status: paymentStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", bookingId);

  if (error) {
    redirect("/admin/mentorgo?error=booking_save_failed");
  }

  redirect("/admin/mentorgo?success=booking_updated");
}
