"use server";

import { redirect } from "next/navigation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isAssignableRole, recordAdminAudit, requireSuperAdminUser } from "@/lib/superadmin";
import { setFlashMessageCookie } from "@/lib/flash";

function getStringValue(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

async function redirectUsersUrl(params: { q?: string; success?: string; error?: string }): Promise<never> {
  const searchParams = new URLSearchParams();
  if (params.q) {
    searchParams.set("q", params.q);
  }
  if (params.success) {
    await setFlashMessageCookie("notice", params.success);
  }
  if (params.error) {
    await setFlashMessageCookie("error", params.error);
  }
  const query = searchParams.toString();
  redirect(query ? `/admin/control/users?${query}` : "/admin/control/users");
}

export async function banUser(formData: FormData) {
  const userId = getStringValue(formData.get("userId"));
  const reason = getStringValue(formData.get("reason")).slice(0, 500);
  const q = getStringValue(formData.get("q"));

  const { appUser } = await requireSuperAdminUser();

  if (!userId) { return await redirectUsersUrl({ q, error: "invalid_target" });
  }

  if (userId === appUser.id) { return await redirectUsersUrl({ q, error: "cannot_ban_self" });
  }

  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("users")
    .update({
      is_banned: true,
      banned_at: new Date().toISOString(),
      banned_by: appUser.id,
      banned_reason: reason || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) { return await redirectUsersUrl({ q, error: "update_failed" });
  }

  await recordAdminAudit(appUser, {
    action: "user.ban",
    targetTable: "users",
    targetId: userId,
    summary: `Banned user ${userId}`,
    metadata: { reason },
  }); return await redirectUsersUrl({ q, success: "user_banned" });
}

export async function unbanUser(formData: FormData) {
  const userId = getStringValue(formData.get("userId"));
  const q = getStringValue(formData.get("q"));

  const { appUser } = await requireSuperAdminUser();

  if (!userId) { return await redirectUsersUrl({ q, error: "invalid_target" });
  }

  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("users")
    .update({
      is_banned: false,
      banned_at: null,
      banned_by: null,
      banned_reason: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) { return await redirectUsersUrl({ q, error: "update_failed" });
  }

  await recordAdminAudit(appUser, {
    action: "user.unban",
    targetTable: "users",
    targetId: userId,
    summary: `Unbanned user ${userId}`,
  }); return await redirectUsersUrl({ q, success: "user_unbanned" });
}

export async function setUserRole(formData: FormData) {
  const userId = getStringValue(formData.get("userId"));
  const role = getStringValue(formData.get("role"));
  const q = getStringValue(formData.get("q"));

  const { appUser } = await requireSuperAdminUser();

  if (!userId || !isAssignableRole(role)) { return await redirectUsersUrl({ q, error: "invalid_role" });
  }

  // Don't let a superadmin accidentally strip their own superadmin access.
  if (userId === appUser.id && role !== "superadmin") { return await redirectUsersUrl({ q, error: "cannot_demote_self" });
  }

  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("users")
    .update({
      role,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) { return await redirectUsersUrl({ q, error: "update_failed" });
  }

  await recordAdminAudit(appUser, {
    action: "user.set_role",
    targetTable: "users",
    targetId: userId,
    summary: `Set role of ${userId} to ${role}`,
    metadata: { role },
  }); return await redirectUsersUrl({ q, success: "role_updated" });
}

export async function setUserVerified(formData: FormData) {
  const userId = getStringValue(formData.get("userId"));
  const verified = getStringValue(formData.get("verified")) === "true";
  const q = getStringValue(formData.get("q"));

  const { appUser } = await requireSuperAdminUser();

  if (!userId) { return await redirectUsersUrl({ q, error: "invalid_target" });
  }

  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("users")
    .update({
      verified,
      verified_at: verified ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) { return await redirectUsersUrl({ q, error: "update_failed" });
  }

  await recordAdminAudit(appUser, {
    action: verified ? "user.verify" : "user.unverify",
    targetTable: "users",
    targetId: userId,
    summary: `${verified ? "Verified" : "Unverified"} user ${userId}`,
  }); return await redirectUsersUrl({ q, success: verified ? "user_verified" : "user_unverified" });
}
