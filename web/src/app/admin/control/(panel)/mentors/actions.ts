"use server";

import { redirect } from "next/navigation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isMentorVerificationStatus } from "@/lib/mentorgo";
import { recordAdminAudit, requireSuperAdminUser } from "@/lib/superadmin";
import { setFlashMessageCookie } from "@/lib/flash";

function getStringValue(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function getArrayValue(value: FormDataEntryValue | null) {
  return getStringValue(value)
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

async function redirectMentorsUrl(params: { success?: string; error?: string }): Promise<never> {
  const searchParams = new URLSearchParams();
  if (params.success) {
    await setFlashMessageCookie("notice", params.success);
  }
  if (params.error) {
    await setFlashMessageCookie("error", params.error);
  }
  const query = searchParams.toString();
  redirect(query ? `/admin/control/mentors?${query}` : "/admin/control/mentors");
}

export async function reviewMentor(formData: FormData) {
  const profileId = getStringValue(formData.get("profileId"));
  const verificationStatus = getStringValue(formData.get("verificationStatus"));

  const { appUser } = await requireSuperAdminUser();

  if (!profileId || !isMentorVerificationStatus(verificationStatus)) { return await redirectMentorsUrl({ error: "invalid_review" });
  }

  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("mentor_profiles")
    .update({
      verification_status: verificationStatus,
      // Anything not approved must not stay published.
      is_published: verificationStatus === "approved" ? undefined : false,
      reviewed_by: appUser.id,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", profileId);

  if (error) { return await redirectMentorsUrl({ error: "update_failed" });
  }

  // Sync to users table
  const { data: profile } = await admin
    .from("mentor_profiles")
    .select("user_id, headline, mentor_type, expertise_tags, is_published")
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
        mentor_active: isApproved && Boolean(profile.is_published),
        mentor_category: isApproved ? category : null,
        mentor_expertise: isApproved ? profile.expertise_tags : [],
        mentor_headline: isApproved ? profile.headline : null,
      })
      .eq("id", profile.user_id);
  }

  await recordAdminAudit(appUser, {
    action: "mentor.review",
    targetTable: "mentor_profiles",
    targetId: profileId,
    summary: `Set mentor ${profileId} to ${verificationStatus}`,
    metadata: { verificationStatus },
  }); return await redirectMentorsUrl({ success: "mentor_reviewed" });
}

export async function setMentorPublished(formData: FormData) {
  const profileId = getStringValue(formData.get("profileId"));
  const publish = getStringValue(formData.get("publish")) === "true";

  const { appUser } = await requireSuperAdminUser();

  if (!profileId) { return await redirectMentorsUrl({ error: "invalid_target" });
  }

  const admin = createSupabaseAdminClient();

  if (publish) {
    const { data: profile } = await admin
      .from("mentor_profiles")
      .select("verification_status")
      .eq("id", profileId)
      .maybeSingle();

    if (!profile || profile.verification_status !== "approved") { return await redirectMentorsUrl({ error: "publish_requires_approval" });
    }
  }

  const { error } = await admin
    .from("mentor_profiles")
    .update({
      is_published: publish,
      updated_at: new Date().toISOString(),
    })
    .eq("id", profileId);

  if (error) { return await redirectMentorsUrl({ error: "update_failed" });
  }

  // Sync to users table
  const { data: profile } = await admin
    .from("mentor_profiles")
    .select("user_id, verification_status")
    .eq("id", profileId)
    .maybeSingle();

  if (profile) {
    const isApproved = profile.verification_status === "approved";
    await admin
      .from("users")
      .update({
        mentor_active: isApproved && publish,
      })
      .eq("id", profile.user_id);
  }

  await recordAdminAudit(appUser, {
    action: publish ? "mentor.publish" : "mentor.unpublish",
    targetTable: "mentor_profiles",
    targetId: profileId,
    summary: `${publish ? "Published" : "Unpublished"} mentor ${profileId}`,
  }); return await redirectMentorsUrl({ success: publish ? "mentor_published" : "mentor_unpublished" });
}

export async function deleteMentor(formData: FormData) {
  const profileId = getStringValue(formData.get("profileId"));

  const { appUser } = await requireSuperAdminUser();

  if (!profileId) { return await redirectMentorsUrl({ error: "invalid_target" });
  }

  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("mentor_profiles").delete().eq("id", profileId);

  if (error) { return await redirectMentorsUrl({ error: "delete_failed" });
  }

  await recordAdminAudit(appUser, {
    action: "mentor.delete",
    targetTable: "mentor_profiles",
    targetId: profileId,
    summary: `Deleted mentor ${profileId}`,
  }); return await redirectMentorsUrl({ success: "mentor_deleted" });
}

export async function createMentor(formData: FormData) {
  const email = getStringValue(formData.get("email")).toLowerCase();
  const displayName = getStringValue(formData.get("displayName"));
  const headline = getStringValue(formData.get("headline"));
  const mentorType = getStringValue(formData.get("mentorType")) || "other";
  const shortBio = getStringValue(formData.get("shortBio"));
  const longBio = getStringValue(formData.get("longBio")) || shortBio;
  const expertise = getArrayValue(formData.get("expertise"));

  const { appUser } = await requireSuperAdminUser();

  if (!email || !displayName || !headline || !shortBio) { return await redirectMentorsUrl({ error: "missing_fields" });
  }

  const admin = createSupabaseAdminClient();

  const { data: targetUser } = await admin
    .from("users")
    .select("id, email")
    .eq("email", email)
    .maybeSingle();

  if (!targetUser) { return await redirectMentorsUrl({ error: "user_not_found" });
  }

  const slug = `${normalizeSlug(displayName) || "mentor"}-${Date.now().toString(36).slice(-4)}`;

  const { data: inserted, error } = await admin
    .from("mentor_profiles")
    .insert({
      user_id: targetUser.id,
      slug,
      display_name: displayName,
      headline,
      mentor_type: mentorType as never,
      short_bio: shortBio,
      long_bio: longBio,
      expertise_tags: expertise,
      verification_status: "approved",
      is_published: true,
      reviewed_by: appUser.id,
      reviewed_at: new Date().toISOString(),
    })
    .select("id")
    .maybeSingle();

  if (error) {
    const message = error.message.toLowerCase();
    if (message.includes("duplicate") || message.includes("unique")) { return await redirectMentorsUrl({ error: "mentor_exists" });
    } return await redirectMentorsUrl({ error: "create_failed" });
  }

  // Sync to users table
  const typeMapInverse: Record<string, string> = {
    industry_expert: "career",
    faculty: "faculty",
    alumni: "career",
    senior_student: "senior",
    founder: "career",
    operator: "career",
    other: "career",
  };
  const category = typeMapInverse[mentorType] || "career";

  await admin
    .from("users")
    .update({
      mentor_approved: true,
      mentor_active: true,
      mentor_category: category,
      mentor_headline: headline,
      mentor_expertise: expertise,
    })
    .eq("id", targetUser.id);

  await recordAdminAudit(appUser, {
    action: "mentor.create",
    targetTable: "mentor_profiles",
    targetId: inserted?.id ?? null,
    summary: `Created mentor profile for ${email}`,
    metadata: { email, displayName },
  }); return await redirectMentorsUrl({ success: "mentor_created" });
}
