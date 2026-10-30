import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const supabase = await createServerSupabaseClient();
  try {
    await supabase.auth.signOut();
  } catch {
    // Ignore network/auth API failures and still clear client navigation state.
  }

  return NextResponse.redirect(new URL("/", requestUrl.origin));
}
