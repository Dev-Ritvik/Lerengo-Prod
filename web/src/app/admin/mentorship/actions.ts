"use server";

import { redirect } from "next/navigation";
import { requireAdminUser } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { MentorCategory } from "@/lib/supabase/types";

function getStringValue(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

function isMentorCategory(value: string): value is MentorCategory {
  return value === "faculty" || value === "senior" || value === "career";
}

export async function saveMentorSettings(formData: FormData) {
  const userId = getStringValue(formData.get("userId"));
  const mentorCategory = getStringValue(formData.get("mentorCategory"));
  const mentorHeadline = getStringValue(formData.get("mentorHeadline")).slice(0, 140);
  const mentorExpertise = getStringValue(formData.get("mentorExpertise"))
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 8);
  const mentorApproved = getStringValue(formData.get("mentorApproved")) === "true";
  const mentorActive = getStringValue(formData.get("mentorActive")) === "true";

  if (!userId || (mentorCategory && !isMentorCategory(mentorCategory))) {
    redirect("/admin/mentorship?error=invalid_input");
  }

  const { appUser } = await requireAdminUser();
  const admin = createSupabaseAdminClient();

  const { data: targetUser, error: userError } = await admin
    .from("users")
    .select("id, role, university_id, full_name, email")
    .eq("id", userId)
    .eq("university_id", appUser.university_id)
    .maybeSingle();

  if (userError || !targetUser) {
    redirect("/admin/mentorship?error=user_not_found");
  }

  const nextRole =
    mentorCategory === "senior" && targetUser.role === "user"
      ? "senior"
      : targetUser.role;

  const { error: updateError } = await admin
    .from("users")
    .update({
      mentor_active: mentorApproved ? mentorActive : false,
      mentor_approved: mentorApproved,
      mentor_category: mentorCategory ? (mentorCategory as MentorCategory) : null,
      mentor_expertise: mentorExpertise,
      mentor_headline: mentorHeadline || null,
      role: nextRole,
    })
    .eq("id", userId)
    .eq("university_id", appUser.university_id);

  if (updateError) {
    redirect("/admin/mentorship?error=save_failed");
  }

  const { data: existingProfile } = await admin
    .from("mentor_profiles")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (mentorApproved) {
    const slug = `${normalizeSlug(targetUser.full_name || targetUser.email.split("@")[0]) || "mentor"}-${Date.now().toString(36).slice(-4)}`;
    const displayName = targetUser.full_name || targetUser.email.split("@")[0] || "Mentor";
    const typeMap: Record<string, string> = {
      faculty: "faculty",
      senior: "senior_student",
      career: "other",
    };

    if (!existingProfile) {
      await admin.from("mentor_profiles").insert({
        user_id: userId,
        slug,
        display_name: displayName,
        headline: mentorHeadline || "Verified mentor",
        mentor_type: (typeMap[mentorCategory] || "other") as any,
        short_bio: "Verified campus mentor.",
        long_bio: "Verified campus mentor.",
        expertise_tags: mentorExpertise,
        verification_status: "approved",
        is_published: mentorActive,
        reviewed_by: appUser.id,
        reviewed_at: new Date().toISOString(),
      });
    } else {
      await admin
        .from("mentor_profiles")
        .update({
          verification_status: "approved",
          is_published: mentorActive,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);
    }
  } else {
    if (existingProfile) {
      await admin
        .from("mentor_profiles")
        .update({
          verification_status: "suspended",
          is_published: false,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);
    }
  }

  redirect("/admin/mentorship?success=saved");
}

export async function assignDoubtResponder(formData: FormData) {
  const doubtId = getStringValue(formData.get("doubtId"));
  const assignedTo = getStringValue(formData.get("assignedTo"));

  if (!doubtId) {
    redirect("/admin/mentorship?error=invalid_doubt_assignment");
  }

  const { appUser } = await requireAdminUser();
  const admin = createSupabaseAdminClient();

  const [doubtResult, userResult] = await Promise.all([
    admin
      .from("doubts")
      .select("id, title, user_id, assigned_to, status, university_id")
      .eq("id", doubtId)
      .eq("university_id", appUser.university_id)
      .maybeSingle(),
    assignedTo
      ? admin
          .from("users")
          .select("id, full_name, email, role, mentor_approved, mentor_active, mentor_category")
          .eq("id", assignedTo)
          .eq("university_id", appUser.university_id)
          .eq("verified", true)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  const { data: doubt, error: doubtError } = doubtResult;
  const { data: seniorResponder, error: seniorError } = userResult;

  if (doubtError || !doubt) {
    redirect("/admin/mentorship?error=doubt_not_found");
  }

  if (assignedTo) {
    if (seniorError || !seniorResponder) {
      redirect("/admin/mentorship?error=senior_not_found");
    }

    const isEligible =
      (seniorResponder.role === "senior" &&
        seniorResponder.mentor_category === "senior" &&
        seniorResponder.mentor_approved &&
        seniorResponder.mentor_active) ||
      seniorResponder.role === "admin" ||
      seniorResponder.role === "superadmin";

    if (!isEligible) {
      redirect("/admin/mentorship?error=senior_not_found");
    }

    const [updateResult] = await Promise.all([
      admin
        .from("doubts")
        .update({
          assigned_to: seniorResponder.id,
          status: "assigned",
        })
        .eq("id", doubtId)
        .eq("university_id", appUser.university_id),
      doubt.assigned_to !== seniorResponder.id
        ? admin.from("notifications").insert({
            university_id: appUser.university_id,
            user_id: seniorResponder.id,
            type: "system",
            title: "New campus doubt assigned",
            body: `You have been assigned to respond to ${doubt.title?.trim() || "a campus doubt"}.`,
            href: "/mentorship",
          })
        : Promise.resolve({ error: null }),
    ]);

    if (updateResult.error) {
      redirect("/admin/mentorship?error=assignment_failed");
    }

    redirect("/admin/mentorship?success=assigned");
  }

  const { error: clearError } = await admin
    .from("doubts")
    .update({
      assigned_to: null,
      status: "open",
    })
    .eq("id", doubtId)
    .eq("university_id", appUser.university_id);

  if (clearError) {
    redirect("/admin/mentorship?error=assignment_failed");
  }

  redirect("/admin/mentorship?success=unassigned");
}
