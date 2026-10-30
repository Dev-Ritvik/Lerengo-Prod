"use server";

import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { recordAdminAudit } from "@/lib/superadmin";
import type { Database } from "@/lib/supabase/types";
import { setFlashMessageCookie } from "@/lib/flash";

function getStringValue(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

async function redirectControlLoginUrl(params: { error?: string; email?: string }): Promise<never> {
  const searchParams = new URLSearchParams();
  if (params.error) {
    await setFlashMessageCookie("error", params.error);
  }
  if (params.email) {
    searchParams.set("email", params.email);
  }
  const query = searchParams.toString();
  redirect(query ? `/admin/control/login?${query}` : "/admin/control/login");
}

export async function signInSuperAdmin(formData: FormData) {
  const email = getStringValue(formData.get("email")).toLowerCase();
  const password = getStringValue(formData.get("password"));

  if (!email || !password) { return await redirectControlLoginUrl({ error: "missing_credentials", email });
  }

  const supabase = await createServerSupabaseClient();

  let userId: string | null = null;
  let userEmail: string | null = null;
  let errorMessage: string | null = null;

  try {
    const response = await supabase.auth.signInWithPassword({ email, password });
    userId = response.data.user?.id ?? null;
    userEmail = response.data.user?.email ?? null;
    errorMessage = response.error?.message ?? null;
  } catch {
    errorMessage = "auth_request_failed";
  }

  if (errorMessage || !userId) {
    const normalized = (errorMessage ?? "").toLowerCase();
    if (
      normalized.includes("email not confirmed") ||
      normalized.includes("email_not_confirmed")
    ) { return await redirectControlLoginUrl({ error: "email_not_confirmed", email });
    } return await redirectControlLoginUrl({ error: "invalid_credentials", email });
  }

  const { data: profileData } = await supabase
    .from("users")
    .select("id, email, role, verified, is_banned")
    .eq("id", userId)
    .maybeSingle();

  const profile = profileData as Pick<
    Database["public"]["Tables"]["users"]["Row"],
    "id" | "email" | "role" | "verified" | "is_banned"
  > | null;

  if (!profile || profile.role !== "superadmin") {
    await supabase.auth.signOut(); return await redirectControlLoginUrl({ error: "not_superadmin", email });
  }

  if (profile.is_banned) {
    await supabase.auth.signOut(); return await redirectControlLoginUrl({ error: "suspended", email });
  }

  if (!profile.verified) {
    await supabase.auth.signOut(); return await redirectControlLoginUrl({ error: "not_verified", email });
  }

  await recordAdminAudit(
    { id: profile.id, email: profile.email ?? userEmail },
    { action: "superadmin.login", summary: `Superadmin signed in: ${profile.email ?? email}` },
  );

  redirect("/admin/control");
}

export async function signOutSuperAdmin() {
  const supabase = await createServerSupabaseClient();
  try {
    await supabase.auth.signOut();
  } catch {
    // ignore — best effort sign out
  }
  redirect("/admin/control/login");
}
