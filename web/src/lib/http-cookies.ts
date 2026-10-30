import { NextResponse } from "next/server";

/**
 * Shared cookie-copy helper (L3 hygiene fix).
 *
 * Previously duplicated in `auth/callback/route.ts` and `auth/login/route.ts`.
 * Route handlers build a fresh `NextResponse.redirect(...)` / `NextResponse.next()`
 * after interacting with the Supabase SSR client; the session cookies the client
 * wrote onto its internal response must be transferred onto the outgoing one or
 * the login/session refresh silently fails.
 *
 * @param source  Response carrying cookies set by the Supabase SSR client.
 * @param target  The response actually returned to the browser.
 * @param options - `exclude`: cookie names to skip during the copy (e.g. a
 *   one-shot OAuth destination cookie that is handled explicitly by the caller).
 *   - `deleteAfterCopy`: names to remove from `target` afterwards so stale
 *   values never survive a completed flow.
 */
export function copyCookies(
  source: NextResponse,
  target: NextResponse,
  options?: { exclude?: string[]; deleteAfterCopy?: string[] },
): NextResponse {
  const excluded = new Set(options?.exclude ?? []);

  source.cookies.getAll().forEach(({ name, value, ...rest }) => {
    if (excluded.has(name)) return;
    target.cookies.set(name, value, rest);
  });

  for (const name of options?.deleteAfterCopy ?? []) {
    target.cookies.delete(name);
  }

  return target;
}
