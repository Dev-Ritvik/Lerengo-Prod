"use server";

import { redirect } from "next/navigation";
import { resolveAppUrlAsync } from "@/lib/app-url";
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

export async function createSignupAccount(formData: FormData) {
  const fullName = getStringValue(formData.get("fullName"));
  const email = getStringValue(formData.get("email")).toLowerCase();
  const password = getStringValue(formData.get("password"));
  const confirmPassword = getStringValue(formData.get("confirmPassword"));
  const next = resolveSafeAppPath(getStringValue(formData.get("next")), "/");

  if (!fullName || !email || !password || !confirmPassword) {
    redirect(`/signup?next=${encodeURIComponent(next)}&error=invalid_input`);
  }

  if (password.length < 8) {
    redirect(`/signup?next=${encodeURIComponent(next)}&error=password_too_short`);
  }

  if (password !== confirmPassword) {
    redirect(`/signup?next=${encodeURIComponent(next)}&error=password_mismatch`);
  }

  const supabase = await createServerSupabaseClient();
  let data: { session: unknown | null } = { session: null };
  let error: { message: string } | null = null;

  try {
    const appUrl = await resolveAppUrlAsync();
    const response = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
        emailRedirectTo: `${appUrl}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    data = { session: response.data.session };
    error = response.error ? { message: response.error.message } : null;
  } catch {
    error = { message: "Auth request failed." };
  }

  if (error) {
    const message = error.message.toLowerCase();
    if (message.includes("already") || message.includes("registered")) {
      redirect(`/signin?next=${encodeURIComponent(next)}&error=account_exists`);
    }

    redirect(`/signup?next=${encodeURIComponent(next)}&error=signup_failed`);
  }

  if (data.session) {
    const { data: authUserData } = await supabase.auth.getUser();
    const authUser = authUserData.user;

    if (authUser) {
      await supabase.from("users").upsert(
        {
          id: authUser.id,
          email: authUser.email ?? email,
          full_name: fullName,
        },
        {
          onConflict: "id",
        },
      );

      const { data: profileData } = await supabase
        .from("users")
        .select("*")
        .eq("id", authUser.id)
        .maybeSingle();

      redirect(
        resolvePostAuthDestination(
          profileData as Database["public"]["Tables"]["users"]["Row"] | null,
          next,
        ),
      );
    }

    redirect("/onboarding/university");
  }

  redirect(buildCheckEmailUrl(email, next, "signup_created"));
}
