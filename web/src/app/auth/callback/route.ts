import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getRequiredEnv } from "@/lib/env";
import { getSupabaseCookieOptions } from "@/lib/supabase/cookie-options";
import type { Database } from "@/lib/supabase/types";
import { resolvePostAuthDestination, resolveSafeAppPath } from "@/lib/tenant";
import { hasAdminJourneyRole } from "@/lib/auth-journey";
import { setFlashMessage } from "@/lib/flash";
import { copyCookies as sharedCopyCookies } from "@/lib/http-cookies";

function buildSigninRedirect(url: URL, nextPath: string, error: string, detail?: string) {
  const destination = new URL("/signin", url.origin);
  destination.searchParams.set("next", nextPath);
  let response = NextResponse.redirect(destination);
  response = setFlashMessage(response, "error", error);
  if (detail) {
    response = setFlashMessage(response, "detail", detail);
  }
  // One-shot: never let a stale pending-OAuth destination survive a failed login.
  response.cookies.delete("lerengo_oauth_next");
  return response;
}

// L3 hygiene: shared helper replaces the local duplicate. Callback semantics
// preserved exactly — the one-shot OAuth destination cookie is never copied
// back and is always cleared on every callback response (success or failure).
function copyCookies(source: NextResponse, target: NextResponse) {
  return sharedCopyCookies(source, target, {
    exclude: ["lerengo_oauth_next"],
    deleteAfterCopy: ["lerengo_oauth_next"],
  });
}

async function createRouteHandlerSupabaseClient(requestUrl: URL) {
  const cookieStore = await cookies();
  const supabaseUrl = getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL");
  const supabaseAnonKey = getRequiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const response = NextResponse.next();

  const supabase = createServerClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookieOptions: getSupabaseCookieOptions(requestUrl.hostname),
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  return {
    supabase,
    getResponse() {
      return response;
    },
  };
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const otpType = requestUrl.searchParams.get("type");
  // Priority for post-login destination:
  //   1. ?next= query param (email-OTP links include it explicitly)
  //   2. lerengo_oauth_next cookie set by /auth/login before the OAuth hop
  //   3. safe default (/campus-network)
  // The cookie is one-shot: it is cleared on every response we return below.
  const cookieStoreForNext = await cookies();
  const pendingOAuthNext = cookieStoreForNext.get("lerengo_oauth_next")?.value ?? null;
  const nextPath = resolveSafeAppPath(
    requestUrl.searchParams.get("next") ?? pendingOAuthNext,
    "/campus-network",
  );
  const hasSupabaseEnv =
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  if (!hasSupabaseEnv) {
    return buildSigninRedirect(requestUrl, nextPath, "auth_callback_failed", "missing_supabase_env");
  }

  if (code || (tokenHash && otpType)) {
    const { supabase, getResponse } = await createRouteHandlerSupabaseClient(requestUrl);
    let exchangeError: { message: string } | null = null;

    if (code) {
      try {
        const response = await supabase.auth.exchangeCodeForSession(code);
        exchangeError = response.error ? { message: response.error.message } : null;
      } catch {
        exchangeError = { message: "OAuth exchange failed." };
      }
    } else if (tokenHash && otpType) {
      try {
        const response = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: otpType as "signup" | "invite" | "recovery" | "email_change" | "email",
        });
        exchangeError = response.error ? { message: response.error.message } : null;
      } catch {
        exchangeError = { message: "Email confirmation failed." };
      }
    }

    if (exchangeError) {
      console.error("Auth callback exchange failed:", exchangeError.message);
      return buildSigninRedirect(
        requestUrl,
        nextPath,
        "auth_callback_failed",
        exchangeError.message,
      );
    }

    {
      let user: { id: string; email?: string | null; user_metadata?: Record<string, unknown> } | null = null;

      try {
        const response = await supabase.auth.getUser();
        user = response.data.user
          ? {
              id: response.data.user.id,
              email: response.data.user.email,
              user_metadata: response.data.user.user_metadata as Record<string, unknown>,
            }
          : null;
      } catch {
        user = null;
      }

      if (user) {
        const fullName =
          typeof user.user_metadata?.full_name === "string"
            ? user.user_metadata.full_name
            : null;

        try {
          await supabase.from("users").upsert(
            {
              email: user.email ?? "",
              full_name: fullName,
              id: user.id,
            },
            {
              onConflict: "id",
            },
          );
        } catch {
          // Auth session is still valid; profile row can be backfilled later.
        }

        try {
          const { data: profileData } = await supabase
            .from("users")
            .select("*")
            .eq("id", user.id)
            .maybeSingle();

          const profile = profileData as Database["public"]["Tables"]["users"]["Row"] | null;
          const destinationPath = resolvePostAuthDestination(
            profile,
            nextPath,
          );
          const adminDestinationPath =
            hasAdminJourneyRole(profile) && profile?.verified && nextPath.startsWith("/admin")
              ? "/admin/surfaces"
              : destinationPath;
          const destination = new URL(adminDestinationPath, requestUrl.origin);
          if (tokenHash && otpType) {
            let response = NextResponse.redirect(destination);
            response = setFlashMessage(response, "notice", "email_confirmed");
            return copyCookies(getResponse(), response);
          }

          const redirectResponse = NextResponse.redirect(destination);
          return copyCookies(getResponse(), redirectResponse);
        } catch {
          const fallbackPath = resolvePostAuthDestination(null, nextPath);
          const destination = new URL(fallbackPath, requestUrl.origin);
          if (tokenHash && otpType) {
            let response = NextResponse.redirect(destination);
            response = setFlashMessage(response, "notice", "email_confirmed");
            return copyCookies(getResponse(), response);
          }
          const redirectResponse = NextResponse.redirect(destination);
          return copyCookies(getResponse(), redirectResponse);
        }
      }

      return buildSigninRedirect(requestUrl, nextPath, "auth_callback_failed", "session_not_available");
    }
  }

  return buildSigninRedirect(requestUrl, nextPath, "auth_callback_failed", "missing_oauth_code");
}
