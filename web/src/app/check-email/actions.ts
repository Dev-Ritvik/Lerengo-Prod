"use server";

import { redirect } from "next/navigation";
import { resolveAppUrlAsync } from "@/lib/app-url";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { resolveSafeAppPath } from "@/lib/tenant";

import { setFlashMessageCookie } from "@/lib/flash";

function getStringValue(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

async function redirectToCheckEmail(params: {
  email: string;
  next: string;
  notice?: "error" | "notice";
  noticeMessage?: string;
}): Promise<never> {
  const searchParams = new URLSearchParams({
    email: params.email,
  });

  if (params.next !== "/") {
    searchParams.set("next", params.next);
  }

  if (params.notice && params.noticeMessage) {
    await setFlashMessageCookie(params.notice, params.noticeMessage);
  }

  redirect(`/check-email?${searchParams.toString()}`);
}

export async function resendSignupConfirmation(formData: FormData) {
  const email = getStringValue(formData.get("email")).toLowerCase();
  const next = resolveSafeAppPath(getStringValue(formData.get("next")), "/");

  if (!email) {
    await setFlashMessageCookie("error", "invalid_input");
    redirect("/signup");
  }

  const supabase = await createServerSupabaseClient();
  const appUrl = await resolveAppUrlAsync();
  const emailRedirectTo = `${appUrl}/auth/callback?next=${encodeURIComponent(next)}`;

  let errorMessage = "";

  try {
    const response = await supabase.auth.resend({
      type: "signup",
      email,
      options: {
        emailRedirectTo,
      },
    });

    if (response.error) {
      errorMessage = response.error.message;
    }
  } catch {
    errorMessage = "Auth request failed.";
  }

  if (errorMessage) {
    const normalizedMessage = errorMessage.toLowerCase();

    if (
      normalizedMessage.includes("rate limit") ||
      normalizedMessage.includes("too many requests")
    ) { return await redirectToCheckEmail({ email, next, notice: "error", noticeMessage: "resend_rate_limited" });
    } return await redirectToCheckEmail({ email, next, notice: "error", noticeMessage: "resend_failed" });
  } return await redirectToCheckEmail({ email, next, notice: "notice", noticeMessage: "resent" });
}
