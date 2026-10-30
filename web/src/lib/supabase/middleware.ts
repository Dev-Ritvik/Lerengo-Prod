import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getRequiredEnv } from "@/lib/env";
import { getSupabaseCookieOptions } from "@/lib/supabase/cookie-options";
import type { Database } from "@/lib/supabase/types";

export async function updateSession(request: NextRequest) {
  const hasSupabaseEnv =
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  if (!hasSupabaseEnv) {
    return {
      authUser: null as { id: string } | null,
      authDegraded: false,
      response: NextResponse.next({
        request,
      }),
    };
  }

  const supabaseUrl = getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL");
  const supabaseAnonKey = getRequiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

  let response = NextResponse.next({
    request,
  });
  let authUser: { id: string } | null = null;

  const supabase = createServerClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookieOptions: getSupabaseCookieOptions(request.headers.get("host")?.split(":")[0] ?? undefined),
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          response = NextResponse.next({
            request,
          });

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  // Check if there are any Supabase auth cookies before making a network request
  const hasAuthCookies = request.cookies.getAll().some(c => c.name.startsWith("sb-") && c.name.endsWith("-auth-token"));

  if (!hasAuthCookies) {
    // Truly signed out (no auth cookies at all) — not a degraded state.
    return { authUser: null, authDegraded: false, response };
  }

  // Refreshes session cookie on every request if needed.
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      // Clear Supabase cookies if the session is invalid or the refresh token has already been used.
      // This prevents the browser from repeatedly sending stale/invalid credentials and spamming the console.
      if (error.code === "refresh_token_already_used" || error.status === 400 || error.status === 401) {
        request.cookies.getAll().forEach((cookie) => {
          if (cookie.name.startsWith("sb-")) {
            response.cookies.set(cookie.name, "", { maxAge: -1 });
          }
        });
      }
    }

    authUser = user ? { id: user.id } : null;
  } catch {
    // Fail-open in middleware when auth service is temporarily unreachable.
    // Route-level guards/components already handle missing sessions safely.
    // M1 fix: mark the response as auth-degraded so downstream layers (and
    // operators) can tell that authUser=null here means "unknown", not
    // "signed out". Middleware uses this flag to refuse rendering auth-gated
    // rewrites while the auth service is down.
    response.headers.set("x-auth-degraded", "1");
    return {
      authUser: null,
      authDegraded: true,
      response,
    };
  }

  return {
    authUser,
    authDegraded: false,
    response,
  };
}
