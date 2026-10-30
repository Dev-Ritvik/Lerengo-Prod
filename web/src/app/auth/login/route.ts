import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getRequiredEnv } from "@/lib/env";
import { getSupabaseCookieOptions } from "@/lib/supabase/cookie-options";
import { resolveSafeAppPath } from "@/lib/tenant";
import type { Database } from "@/lib/supabase/types";
import { setFlashMessage } from "@/lib/flash";

function buildSigninRedirect(url: URL, nextPath: string, error: string) {
  const destination = new URL("/signin", url.origin);
  destination.searchParams.set("next", nextPath);
  let response = NextResponse.redirect(destination);
  response = setFlashMessage(response, "error", error);
  return response;
}

function resolveProvider(): "google" {
  return "google";
}

function copyCookies(source: NextResponse, target: NextResponse) {
  source.cookies.getAll().forEach(({ name, value, ...options }) => {
    target.cookies.set(name, value, options);
  });

  return target;
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

async function getEnabledProviders() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/settings`, {
      cache: "no-store",
      headers: {
        apikey: supabaseAnonKey,
      },
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as {
      external?: {
        google?: boolean;
      };
    };

    const googleEnabled = typeof payload.external?.google === "boolean"
      ? payload.external.google
      : null;

    if (googleEnabled !== null) {
      return {
        google: googleEnabled,
      };
    }
  } catch {
    return null;
  }

  return null;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const nextPath = resolveSafeAppPath(requestUrl.searchParams.get("next"), "/");
  const provider = resolveProvider();
  const hasSupabaseEnv =
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  if (!hasSupabaseEnv) {
    const destination = new URL("/", requestUrl.origin);
    destination.pathname = nextPath;
    return NextResponse.redirect(destination);
  }

  const enabledProviders = await getEnabledProviders();
  const providerEnabled = enabledProviders?.google;

  if (providerEnabled === false) {
    return buildSigninRedirect(requestUrl, nextPath, "oauth_google_disabled");
  }

  try {
    const { supabase, getResponse } = await createRouteHandlerSupabaseClient(requestUrl);
    const origin = process.env.NODE_ENV === "development" ? "http://localhost:3000" : requestUrl.origin;
    const callbackUrl = new URL("/auth/callback", origin);
    // Removed callbackUrl.searchParams.set("next", nextPath) to avoid redirect_uri mismatch issues in Supabase.

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: callbackUrl.toString(),
      },
    });

    if (!error && data.url) {
      console.log("Generated OAuth URL:", data.url);
      const redirectResponse = NextResponse.redirect(data.url);
      return copyCookies(getResponse(), redirectResponse);
    }
  } catch {
    // Fallback below.
  }

  {
    return buildSigninRedirect(requestUrl, nextPath, "oauth_start_failed");
  }
}
