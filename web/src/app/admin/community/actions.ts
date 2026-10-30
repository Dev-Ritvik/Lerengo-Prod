"use server";

import { redirect } from "next/navigation";
import {
  CAMPUS_WEEKLY_CATEGORIES,
  CAMPUS_WEEKLY_ITEM_TYPES,
  CAMPUS_WEEKLY_TARGET_TYPES,
} from "@/lib/campus-weekly";
import { requireAdminUser } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type {
  CampusWeeklyCategory,
  CampusWeeklyItemType,
  CampusWeeklyTargetType,
  CommunityModerationState,
  CommunityReportStatus,
} from "@/lib/supabase/types";

function getStringValue(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function isReportStatus(value: string): value is CommunityReportStatus {
  return value === "reviewed" || value === "dismissed";
}

function isModerationState(value: string): value is CommunityModerationState {
  return value === "reviewed" || value === "flagged" || value === "verified" || value === "pinned";
}

function isWeeklyHighlightMode(value: string): value is "save" | "clear" {
  return value === "save" || value === "clear";
}

function isCampusWeeklyItemType(value: string): value is CampusWeeklyItemType {
  return CAMPUS_WEEKLY_ITEM_TYPES.includes(value as CampusWeeklyItemType);
}

function isCampusWeeklyTargetType(value: string): value is CampusWeeklyTargetType {
  return CAMPUS_WEEKLY_TARGET_TYPES.includes(value as CampusWeeklyTargetType);
}

function isCampusWeeklyCategory(value: string): value is CampusWeeklyCategory {
  return CAMPUS_WEEKLY_CATEGORIES.includes(value as CampusWeeklyCategory);
}

function getOptionalIsoValue(value: FormDataEntryValue | null) {
  const normalized = getStringValue(value);
  if (!normalized) {
    return null;
  }

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString();
}

export async function reviewCommunityReport(formData: FormData) {
  const reportId = getStringValue(formData.get("reportId"));
  const reportStatus = getStringValue(formData.get("reportStatus"));
  const moderationState = getStringValue(formData.get("moderationState"));
  const reviewNote = getStringValue(formData.get("reviewNote")).slice(0, 220);

  if (!reportId || !isReportStatus(reportStatus) || !isModerationState(moderationState)) {
    redirect("/admin/community?error=invalid_input");
  }

  const { appUser } = await requireAdminUser();
  const admin = createSupabaseAdminClient();

  const { data: report, error: reportError } = await admin
    .from("community_reports")
    .select("id, post_id, status, university_id")
    .eq("id", reportId)
    .eq("university_id", appUser.university_id)
    .maybeSingle();

  if (reportError || !report) {
    redirect("/admin/community?error=report_not_found");
  }

  if (report.status !== "open") {
    redirect("/admin/community?error=already_reviewed");
  }

  const statusLabel =
    moderationState === "flagged"
      ? "Flagged"
      : moderationState === "verified"
        ? "Verified"
        : moderationState === "pinned"
          ? "Pinned"
          : "Reviewed";

  const [{ error: reportUpdateError }, { error: postUpdateError }] = await Promise.all([
    admin
      .from("community_reports")
      .update({
        review_note: reviewNote || null,
        reviewed_by: appUser.id,
        status: reportStatus,
      })
      .eq("id", report.id)
      .eq("university_id", appUser.university_id),
    admin
      .from("community_posts")
      .update({
        moderation_state: moderationState,
        status_label: statusLabel,
      })
      .eq("id", report.post_id)
      .eq("university_id", appUser.university_id),
  ]);

  if (reportUpdateError || postUpdateError) {
    redirect("/admin/community?error=review_failed");
  }

  redirect(`/admin/community?success=${reportStatus}`);
}

export async function saveCommunityWeeklyHighlight(formData: FormData) {
  const postId = getStringValue(formData.get("postId"));
  const mode = getStringValue(formData.get("mode"));
  const highlightTitle = getStringValue(formData.get("highlightTitle")).slice(0, 90);
  const highlightSubtitle = getStringValue(formData.get("highlightSubtitle")).slice(0, 140);

  if (!postId || !isWeeklyHighlightMode(mode)) {
    redirect("/admin/community?error=weekly_invalid");
  }

  const { appUser } = await requireAdminUser();
  const admin = createSupabaseAdminClient();

  const { data: post, error: postError } = await admin
    .from("community_posts")
    .select("id, is_weekly_highlight")
    .eq("id", postId)
    .eq("university_id", appUser.university_id)
    .maybeSingle();

  if (postError || !post) {
    redirect("/admin/community?error=weekly_post_not_found");
  }

  if (mode === "save" && !post.is_weekly_highlight) {
    const { count, error: countError } = await admin
      .from("community_posts")
      .select("id", { count: "exact", head: true })
      .eq("university_id", appUser.university_id)
      .eq("is_weekly_highlight", true);

    if (countError) {
      redirect("/admin/community?error=weekly_update_failed");
    }

    if ((count ?? 0) >= 3) {
      redirect("/admin/community?error=weekly_limit");
    }
  }

  const updatePayload =
    mode === "save"
      ? {
          highlight_subtitle: highlightSubtitle || null,
          highlight_title: highlightTitle || null,
          is_weekly_highlight: true,
        }
      : {
          highlight_subtitle: null,
          highlight_title: null,
          is_weekly_highlight: false,
        };

  const { error: updateError } = await admin
    .from("community_posts")
    .update(updatePayload)
    .eq("id", postId)
    .eq("university_id", appUser.university_id);

  if (updateError) {
    redirect("/admin/community?error=weekly_update_failed");
  }

  redirect(`/admin/community?success=${mode === "save" ? "weekly_saved" : "weekly_cleared"}`);
}

export async function saveCampusWeeklyItem(formData: FormData) {
  const itemId = getStringValue(formData.get("itemId"));
  const itemType = getStringValue(formData.get("itemType"));
  const category = getStringValue(formData.get("category"));
  const title = getStringValue(formData.get("title")).slice(0, 120);
  const subtitle = getStringValue(formData.get("subtitle")).slice(0, 160);
  const description = getStringValue(formData.get("description")).slice(0, 240);
  const eyebrow = getStringValue(formData.get("eyebrow")).slice(0, 60);
  const pillLabel = getStringValue(formData.get("pillLabel")).slice(0, 40);
  const metaLabel = getStringValue(formData.get("metaLabel")).slice(0, 70);
  const ctaLabel = getStringValue(formData.get("ctaLabel")).slice(0, 40);
  const targetType = getStringValue(formData.get("targetType"));
  const targetUrl = getStringValue(formData.get("targetUrl")).slice(0, 240);
  const communityPostId = getStringValue(formData.get("communityPostId"));
  const startsAt = getOptionalIsoValue(formData.get("startsAt"));
  const endsAt = getOptionalIsoValue(formData.get("endsAt"));
  const sortOrderValue = Number.parseInt(getStringValue(formData.get("sortOrder")), 10);
  const sortOrder = Number.isFinite(sortOrderValue) ? sortOrderValue : 100;
  const isActive = getStringValue(formData.get("isActive")) === "true";

  if (
    !title ||
    !isCampusWeeklyItemType(itemType) ||
    !isCampusWeeklyCategory(category) ||
    !isCampusWeeklyTargetType(targetType)
  ) {
    redirect("/admin/community?error=campus_weekly_invalid");
  }

  if (itemType === "banner" && (targetType !== "external" || !targetUrl)) {
    redirect("/admin/community?error=campus_weekly_invalid");
  }

  if (itemType === "announcement" && (targetType !== "community_post" || !communityPostId)) {
    redirect("/admin/community?error=campus_weekly_invalid");
  }

  const { appUser } = await requireAdminUser();
  const admin = createSupabaseAdminClient();

  if (communityPostId) {
    const { data: linkedPost, error: linkedPostError } = await admin
      .from("community_posts")
      .select("id")
      .eq("id", communityPostId)
      .eq("university_id", appUser.university_id)
      .maybeSingle();

    if (linkedPostError || !linkedPost) {
      redirect("/admin/community?error=campus_weekly_post_not_found");
    }
  }

  const payload = {
    category,
    community_post_id: communityPostId || null,
    created_by: appUser.id,
    cta_label: ctaLabel || null,
    description: description || null,
    ends_at: endsAt,
    eyebrow: eyebrow || null,
    is_active: isActive,
    item_type: itemType,
    meta_label: metaLabel || null,
    pill_label: pillLabel || null,
    sort_order: sortOrder,
    starts_at: startsAt,
    subtitle: subtitle || null,
    target_type: targetType,
    target_url: targetType === "external" ? targetUrl : null,
    title,
    university_id: appUser.university_id,
  };

  const query = itemId
    ? admin
        .from("campus_weekly_items")
        .update(payload)
        .eq("id", itemId)
        .eq("university_id", appUser.university_id)
    : admin.from("campus_weekly_items").insert(payload);

  const { error } = await query;
  if (error) {
    redirect("/admin/community?error=campus_weekly_save_failed");
  }

  redirect(`/admin/community?success=${itemId ? "campus_weekly_updated" : "campus_weekly_created"}`);
}

export async function deleteCampusWeeklyItem(formData: FormData) {
  const itemId = getStringValue(formData.get("itemId"));
  if (!itemId) {
    redirect("/admin/community?error=campus_weekly_invalid");
  }

  const { appUser } = await requireAdminUser();
  const admin = createSupabaseAdminClient();

  const { error } = await admin
    .from("campus_weekly_items")
    .delete()
    .eq("id", itemId)
    .eq("university_id", appUser.university_id);

  if (error) {
    redirect("/admin/community?error=campus_weekly_delete_failed");
  }

  redirect("/admin/community?success=campus_weekly_deleted");
}
