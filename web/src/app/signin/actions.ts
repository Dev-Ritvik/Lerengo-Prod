"use server";

import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import { resolvePostAuthDestination, resolveSafeAppPath } from "@/lib/tenant";

function getStringValue(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function buildCheckEmailUrl(email: string, next: string, notice: string) {
  const searchParams = new URLSearchParams({
    email,
    notice,
  });

  if (next !== "/") {
    searchParams.set("next", next);
  }

  return `/check-email?${searchParams.toString()}`;
}

export async function signInWithPassword(formData: FormData) {
  const username = getStringValue(formData.get("username")).toLowerCase();
  const password = getStringValue(formData.get("password"));
  const next = resolveSafeAppPath(getStringValue(formData.get("next")), "/");

  if (!username || !password) {
    redirect(`/signin?next=${encodeURIComponent(next)}&error=missing_credentials`);
  }

  if (!username.includes("@")) {
    redirect(`/signin?next=${encodeURIComponent(next)}&error=email_required`);
  }

  const supabase = await createServerSupabaseClient();
  let data: { user: { id: string; email?: string | null; user_metadata?: Record<string, unknown> } | null } = {
    user: null,
  };
  let error: { message: string } | null = null;

  try {
    const response = await supabase.auth.signInWithPassword({
      email: username,
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
    ) {
      redirect(`/signin?next=${encodeURIComponent(next)}&error=invalid_credentials`);
    }

    if (
      message.includes("email not confirmed") ||
      message.includes("email_not_confirmed") ||
      message.includes("confirm your email")
    ) {
      redirect(buildCheckEmailUrl(username, next, "signin_unconfirmed"));
    }

    redirect(`/signin?next=${encodeURIComponent(next)}&error=password_signin_failed`);
  }

  const fullName = typeof data.user.user_metadata?.full_name === "string"
    ? data.user.user_metadata.full_name
    : null;

  await supabase.from("users").upsert(
    {
      id: data.user.id,
      email: data.user.email ?? username,
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

  redirect(
    resolvePostAuthDestination(
      profileData as Database["public"]["Tables"]["users"]["Row"] | null,
      next,
    ),
  );
}
