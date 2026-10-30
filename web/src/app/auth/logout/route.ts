import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// L1 fix: primary logout is POST. Plain `<a href="/auth/logout">` links let any
// third-party page (or an <img> tag) force-sign users out — CSRF logout. In-app
// callers now submit a small POST form instead.
export async function POST(request: Request) {
  const requestUrl = new URL(request.url);
  const supabase = await createServerSupabaseClient();
  try {
    await supabase.auth.signOut();
  } catch {
    // Ignore network/auth API failures and still clear client navigation state.
  }

  return NextResponse.redirect(new URL("/", requestUrl.origin));
}

// Deprecated compatibility shim so existing bookmarks/external links keep
// working during the transition window. Remove once all UI surfaces use POST.
export async function GET(request: Request) {
  return POST(request);
}
