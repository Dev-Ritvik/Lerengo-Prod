"use server";

import { redirect } from "next/navigation";
import { resolveAdminAppUrlAsync } from "@/lib/app-url";
import { isProvisionedAdminUser } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { resolveSafeAppPath } from "@/lib/tenant";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/types";
import { setFlashMessageCookie } from "@/lib/flash";

function getStringValue(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function buildCheckEmailUrl(email: string) {
  const searchParams = new URLSearchParams({
    email,
    notice: "signin_unconfirmed",
    next: "/admin",
  });

  return `/check-email?${searchParams.toString()}`;
}

async function redirectAdminLoginUrl(params: {
  next?: string;
  error?: string;
  notice?: string;
  userId?: string;
  email?: string;
}): Promise<never> {
  const searchParams = new URLSearchParams();
  if (params.next && params.next !== "/admin") {
    searchParams.set("next", params.next);
  }
  if (params.error) {
    await setFlashMessageCookie("error", params.error);
  }
  if (params.notice) {
    await setFlashMessageCookie("notice", params.notice);
  }
  const loginIdentifier = params.userId ?? params.email;
  if (loginIdentifier) {
    searchParams.set("userId", loginIdentifier);
  }

  const query = searchParams.toString();
  redirect(query ? `/admin/login?${query}` : "/admin/login");
}

function buildAdminRequestAccessUrl(reason: string, email?: string) {
  const searchParams = new URLSearchParams();
  searchParams.set("reason", reason);
  if (email) {
    searchParams.set("email", email);
  }
  return `/admin/request-access?${searchParams.toString()}`;
}

async function getAdminProfileByEmail(email: string) {
  const admin = createSupabaseAdminClient();
  const response = await admin
    .from("users")
    .select("admin_user_id, email, role, verified")
    .eq("email", email)
    .maybeSingle();

  if (response.error) {
    throw new Error(response.error.message);
  }

  return response.data as Pick<
  Database["public"]["Tables"]["users"]["Row"],
    "admin_user_id" | "email" | "role" | "verified"
  > | null;
}

async function getAdminLoginProfile(identifier: string) {
  const admin = createSupabaseAdminClient();
  const normalizedIdentifier = identifier.trim().toLowerCase();

  if (!normalizedIdentifier) {
    return null;
  }

  const byAdminUserId = await admin
    .from("users")
    .select("admin_user_id, email, role, verified")
    .filter("admin_user_id", "eq", normalizedIdentifier)
    .maybeSingle();

  if (byAdminUserId.error) {
    throw new Error(byAdminUserId.error.message);
  }

  if (byAdminUserId.data) {
    return byAdminUserId.data as Pick<
      Database["public"]["Tables"]["users"]["Row"],
      "admin_user_id" | "email" | "role" | "verified"
    > | null;
  }

  if (normalizedIdentifier.includes("@")) {
    return getAdminProfileByEmail(normalizedIdentifier);
  }

  return null;
}

export async function signInAdminWithPassword(formData: FormData) {
  const identifier = getStringValue(formData.get("username")).toLowerCase();
  const password = getStringValue(formData.get("password"));
  const next = resolveSafeAppPath(getStringValue(formData.get("next")), "/admin");

  if (!identifier || !password) { return await redirectAdminLoginUrl({
      next,
      error: "missing_credentials",
      userId: identifier,
    });
  }

  let loginProfile:
    | Pick<Database["public"]["Tables"]["users"]["Row"], "admin_user_id" | "email" | "role" | "verified">
    | null = null;
  try {
    loginProfile = await getAdminLoginProfile(identifier);
  } catch { return await redirectAdminLoginUrl({
      next,
      error: "password_signin_failed",
      userId: identifier,
    });
  }

  if (!loginProfile?.email) { return await redirectAdminLoginUrl({
      next,
      error: "invalid_credentials",
      userId: identifier,
    });
  }

  if (!isProvisionedAdminUser(loginProfile)) {
    redirect(buildAdminRequestAccessUrl("admin_not_provisioned", loginProfile.email));
  }

  const supabase = await createServerSupabaseClient();
  let data: { user: { id: string; email?: string | null; user_metadata?: Record<string, unknown> } | null } = {
    user: null,
  };
  let error: { message: string } | null = null;

  try {
    const response = await supabase.auth.signInWithPassword({
      email: loginProfile.email,
      password,
    });
    data = {
      user: response.data.user
        ? {
            id: response.data.user.id,
            email: response.data.user.email,
            user_metadata: response.data.user.user_metadata as Record<string, unknown>,
          }
        : null,
    };
    error = response.error ? { message: response.error.message } : null;
  } catch {
    error = { message: "Auth request failed." };
  }

  if (error || !data.user) {
    const message = (error?.message ?? "").toLowerCase();
    if (
      message.includes("invalid login credentials") ||
      message.includes("invalid credentials")
    ) { return await redirectAdminLoginUrl({
        next,
        error: "invalid_credentials",
        userId: identifier,
      });
    }

    if (
      message.includes("email not confirmed") ||
      message.includes("email_not_confirmed") ||
      message.includes("confirm your email")
    ) {
      redirect(buildCheckEmailUrl(loginProfile.email));
    } return await redirectAdminLoginUrl({
      next,
      error: "password_signin_failed",
      userId: identifier,
    });
  }

  const fullName = typeof data.user.user_metadata?.full_name === "string"
    ? data.user.user_metadata.full_name
    : null;

  await supabase.from("users").upsert(
    {
      id: data.user.id,
      email: data.user.email ?? loginProfile.email,
      full_name: fullName,
    },
    {
      onConflict: "id",
    },
  );

  const { data: profileData } = await supabase
    .from("users")
    .select("*")
    .eq("id", data.user.id)
    .maybeSingle();

  const profile = profileData as Database["public"]["Tables"]["users"]["Row"] | null;
  if (!profile || profile.role !== "admin") {
    await supabase.auth.signOut();
    redirect(buildAdminRequestAccessUrl("not_admin", loginProfile.email));
  }

  if (!isProvisionedAdminUser(profile)) {
    await supabase.auth.signOut();
    redirect(buildAdminRequestAccessUrl("admin_not_provisioned", loginProfile.email));
  }

  if (!profile.verified) {
    await supabase.auth.signOut();
    redirect(buildAdminRequestAccessUrl("not_verified", loginProfile.email));
  }

  redirect(next);
}

export async function sendAdminPasswordReset(formData: FormData) {
  const email = getStringValue(formData.get("email")).toLowerCase();

  if (!email) { return await redirectAdminLoginUrl({ error: "email_required" });
  }

  let profile:
    | Pick<Database["public"]["Tables"]["users"]["Row"], "admin_user_id" | "email" | "role" | "verified">
    | null = null;
  try {
    profile = await getAdminProfileByEmail(email);
  } catch { return await redirectAdminLoginUrl({ error: "reset_failed", email });
  }

  if (!profile || profile.role !== "admin") {
    redirect(buildAdminRequestAccessUrl("not_admin", email));
  }

  if (!isProvisionedAdminUser(profile)) {
    redirect(buildAdminRequestAccessUrl("admin_not_provisioned", email));
  }

  if (!profile.verified) {
    redirect(buildAdminRequestAccessUrl("not_verified", email));
  }

  const supabase = await createServerSupabaseClient();
  const adminAppUrl = await resolveAdminAppUrlAsync();
  const redirectTo = `${adminAppUrl}/auth/callback?next=${encodeURIComponent("/admin/reset-password/update")}`;

  try {
    const response = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    if (response.error) { return await redirectAdminLoginUrl({ error: "reset_failed", email });
    }
  } catch { return await redirectAdminLoginUrl({ error: "reset_failed", email });
  } return await redirectAdminLoginUrl({ notice: "reset_sent", email });
}

export async function sendAdminOtpLink(formData: FormData) {
  const email = getStringValue(formData.get("email")).toLowerCase();

  if (!email) { return await redirectAdminLoginUrl({ error: "email_required" });
  }

  let profile:
    | Pick<Database["public"]["Tables"]["users"]["Row"], "admin_user_id" | "email" | "role" | "verified">
    | null = null;
  try {
    profile = await getAdminProfileByEmail(email);
  } catch { return await redirectAdminLoginUrl({ error: "otp_failed", email });
  }

  if (!profile || profile.role !== "admin") {
    redirect(buildAdminRequestAccessUrl("not_admin", email));
  }

  if (!isProvisionedAdminUser(profile)) {
    redirect(buildAdminRequestAccessUrl("admin_not_provisioned", email));
  }

  if (!profile.verified) {
    redirect(buildAdminRequestAccessUrl("not_verified", email));
  }

  const supabase = await createServerSupabaseClient();
  const adminAppUrl = await resolveAdminAppUrlAsync();
  const emailRedirectTo = `${adminAppUrl}/auth/callback?next=${encodeURIComponent("/admin/surfaces")}`;

  try {
    const response = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo,
        shouldCreateUser: false,
      },
    });

    if (response.error) { return await redirectAdminLoginUrl({ error: "otp_failed", email });
    }
  } catch { return await redirectAdminLoginUrl({ error: "otp_failed", email });
  } return await redirectAdminLoginUrl({ notice: "otp_sent", email });
}

export async function updateAdminPassword(formData: FormData) {
  const password = getStringValue(formData.get("password"));
  const confirmPassword = getStringValue(formData.get("confirmPassword"));

  if (!password || !confirmPassword) {
    redirect("/admin/reset-password/update?error=missing_password");
  }

  if (password.length < 8) {
    redirect("/admin/reset-password/update?error=password_too_short");
  }

  if (password !== confirmPassword) {
    redirect("/admin/reset-password/update?error=password_mismatch");
  }

  const supabase = await createServerSupabaseClient();
  const userResponse = await supabase.auth.getUser();
  const user = userResponse.data.user;

  if (userResponse.error || !user) {
    redirect("/admin/login?error=recovery_required");
  }

  const { data: profileData } = await supabase
    .from("users")
    .select("role, verified")
    .eq("id", user.id)
    .maybeSingle();

  const profile = profileData as Pick<
    Database["public"]["Tables"]["users"]["Row"],
    "admin_user_id" | "role" | "verified"
  > | null;

  if (!profile || profile.role !== "admin") {
    await supabase.auth.signOut();
    redirect(buildAdminRequestAccessUrl("not_admin", user.email ?? undefined));
  }

  if (!isProvisionedAdminUser(profile)) {
    await supabase.auth.signOut();
    redirect(buildAdminRequestAccessUrl("admin_not_provisioned", user.email ?? undefined));
  }

  if (!profile.verified) {
    await supabase.auth.signOut();
    redirect(buildAdminRequestAccessUrl("not_verified", user.email ?? undefined));
  }

  const response = await supabase.auth.updateUser({
    password,
  });

  if (response.error) {
    redirect("/admin/reset-password/update?error=update_failed");
  }

  redirect("/admin?notice=password_reset_complete");
}
