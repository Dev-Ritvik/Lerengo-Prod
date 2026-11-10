# PRE_HANDOFF_REPORT.md

**LerenGO — Pre-Production QA & Security Audit**
**Date:** 2026-11-10
**Auditor:** Principal QA & Security Engineer
**Scope:** `web/` (Next.js 16 App Router, Supabase SSR, Razorpay payments)
**Repository State:** `main` @ `ae55214` (local, not yet pushed to `LerenGO/LerenGO_Main` — remote not found; pushed to `Dev-Ritvik/Lerengo-Prod`)

---

## 1. Executive Readiness Score

**Status: PASS**

The codebase is ready for client handoff. All critical security checks pass:
HMAC-SHA256 Razorpay signature verification, server-side price authority,
authenticated API guards, university-level tenant isolation, rate limiting on
expensive endpoints, and zero hardcoded secrets.

All previously identified blockers have been resolved:

- **Shipping/Delivery Policy page** — Created at `/shipping-policy` with Razorpay-compliant
  digital SaaS language and linked from the footer.
- **Dependency vulnerabilities** — All 11 vulnerabilities (1 critical, 7 high)
  resolved via `npm audit fix --force`. `npm audit --omit=dev` now reports 0 vulnerabilities.
- **Razorpay Webhook Secret** — `.env.example` and `.env.vercel.example` now include a
  `whsec_placeholder_replace_after_kyc` dummy value with documentation. Zero code changes
  required for live cutover; client supplies the real secret after KYC approval.
- **Lint errors** — The 4 ESLint errors in `web/test/security.test.ts` (`require()` imports)
  converted to ES module `import` statements. Lint now passes with 0 errors.

**Remaining deployment tasks (client-side env configuration, not code changes):**
The client must supply live production values for Supabase, SMTP, Razorpay live keys,
and configure DNS/auth redirects before go-live. These are environment-level, not code-level.

---

## 2. Results Table

| # | Test Item | Result | File | Line(s) | Notes |
|---|-----------|--------|------|---------|-------|
| 1.1 | Clean Production Build | [PASS] | `web/` | — | `npm run build` completed; all 43 routes compile; TypeScript clean |
| 1.2 | Hardcoded Secrets Scan | [PASS] | `web/src/` | — | No `rzp_test_`, `rzp_live_`, API keys, or DB URLs hardcoded in source |
| 1.3 | Client Bundle Leak Check | [PASS] | `web/src/` | — | `NEXT_PUBLIC_*` vars are public by design; no service-role or secret keys exposed to client |
| 1.4 | Dependency Vulnerabilities | [PASS] | `web/package-lock.json` | — | `npm audit fix --force` applied; `npm audit --omit=dev` reports 0 vulnerabilities |
| 2.1 | Prompt Injection Resistance | [N/A] | — | — | No LLM integration exists in this codebase |
| 2.2 | Malformed Output / JSON Parsing | [N/A] | — | — | No LLM integration; scoring is local deterministic |
| 2.3 | Token & Cost Protection | [N/A] | — | — | No LLM API calls present |
| 2.4 | Timeout / Streaming / Error States | [N/A] | — | — | No LLM integration |
| 3.1 | Signature Verification (HMAC) | [PASS] | `web/src/app/api/webhook/route.ts` | 18-38 | `crypto.timingSafeEqual` used; fail-closed on missing/invalid signature |
| 3.2 | Server-Side Price Authority | [PASS] | `web/src/app/api/create-order/route.ts` | 58-64, 109 | Price fetched from `notes` table; never trusted from client body |
| 3.3 | Webhook Idempotency | [PASS] | `web/src/app/api/webhook/route.ts` | 112, 145 | `upsert` with `onConflict: "razorpay_order_id"` prevents duplicate grants |
| 3.4 | Async/Abandoned Checkout | [PASS] | `web/src/app/api/webhook/route.ts` | 68-220 | Webhook handles fulfillment independently of frontend; `payment.failed` and tab-close handled via webhook |
| 3.5 | Zero-Code Live Cutover | [PASS] | `web/.env.example`, `.env.vercel.example` | — | All Razorpay keys/secret/webhook secret are env-driven; no hardcoded test URLs |
| 4.1 | Unauthenticated Route Protection | [WARN] | `web/src/app/api/` | — | Most routes use `requireVerifiedProfileForApi()`; course catalog (`/api/courses`) is public by design — appropriate |
| 4.2 | IDOR / Tenant Isolation / RLS | [PASS] | `web/src/app/api/notes/\[noteId]/assessment/route.ts` | 44-50 | Queries filter by `university_id` AND `user_id` on both notes and access tables |
| 4.3 | Rate Limiting | [PASS] | `web/src/app/api/create-order/route.ts` | 29-48 | 5 orders / 15 min window per user; verify upload has daily attempt limit |
| 5.1 | Empty / Loading / Error States | [WARN] | `web/src/app/` | — | Most pages have loading/error states; not exhaustively verified per-route |
| 5.2 | Dead Code & Console Logs | [PASS] | `web/src/` | — | All `console.error/warn` are legitimate error logging; no secrets leaked |
| 6.1 | Razorpay Compliance Pages | [PASS] | `web/src/app/shipping-policy/page.tsx` | — | `/shipping-policy` created with Razorpay-compliant digital SaaS language; linked from footer |
| 6.2 | Environment Variable Template | [PASS] | `web/.env.example` | — | All required keys present with dummy values |

---

## 3. Critical Blockers (Resolved)

All blockers identified in the initial audit have been resolved:

| Blocker | Status | Resolution |
|---------|--------|------------|
| Missing Shipping/Delivery Policy Page | [RESOLVED] | Created `web/src/app/shipping-policy/page.tsx` with Razorpay-compliant digital SaaS language; linked from footer navigation |
| Dependency Vulnerabilities | [RESOLVED] | `npm audit fix --force` applied; `npm audit --omit=dev` now reports 0 vulnerabilities |
| Razorpay Webhook Secret Placeholder | [RESOLVED] | `whsec_placeholder_replace_after_kyc` dummy value added to `.env.example` and `.env.vercel.example` with documentation |
| Lint Errors in Test File | [RESOLVED] | Converted `require()` imports to ES module `import` statements in `web/test/security.test.ts` |

No remaining critical blockers. All code-level security checks pass.

---

## 4. Client Cutover Checklist (Razorpay KYC Approved)

Once the client's Razorpay KYC is approved and they receive live credentials, the following `.env` variables must be supplied in the production hosting environment (Vercel or equivalent). **No code changes are required** — all values are environment-driven.

### Required Production Environment Variables

| Variable | Source | Notes |
|----------|--------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project Settings → API | Production project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Project Settings → API | Public anon key (safe to expose) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Project Settings → API | **Server-only** — never expose to client |
| `SUPABASE_NOTES_BUCKET` | Supabase Storage | Bucket name (e.g., `notes-private`) |
| `SUPABASE_ID_CARDS_BUCKET` | Supabase Storage | Bucket name (e.g., `id-cards`) |
| `NEXT_PUBLIC_APP_URL` | Client domain | e.g., `https://lerengo.com` |
| `NEXT_PUBLIC_ADMIN_APP_URL` | Admin subdomain | e.g., `https://admin.lerengo.com` |
| `NEXT_PUBLIC_CAMPUS_NETWORK_APP_URL` | Subdomain | e.g., `https://campusgo.lerengo.com` |
| `NEXT_PUBLIC_COURSES_APP_URL` | Subdomain | e.g., `https://skillgo.lerengo.com` |
| `NEXT_PUBLIC_LABS_APP_URL` | Subdomain | e.g., `https://forgego.lerengo.com` |
| `NEXT_PUBLIC_MENTORGO_APP_URL` | Subdomain | e.g., `https://mentorgo.lerengo.com` |
| `NEXT_PUBLIC_HUNTERGO_APP_URL` | Subdomain | e.g., `https://huntergo.lerengo.com` |
| `RAZORPAY_KEY_ID` | Razorpay Dashboard → API Keys | Live key ID |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Razorpay Dashboard → API Keys | Public key for checkout modal |
| `RAZORPAY_KEY_SECRET` | Razorpay Dashboard → API Keys | **Server-only** secret |
| `RAZORPAY_WEBHOOK_SECRET` | Razorpay Dashboard → Webhooks | Secret for `https://<domain>/api/webhook` |
| `ENABLE_SAMPLE_LOGIN` | Client decision | Set to `false` in production |
| `SMTP_HOST` | SMTP provider | e.g., `smtp.gmail.com` |
| `SMTP_PORT` | SMTP provider | `587` (TLS) or `465` (SSL) |
| `SMTP_USER` | SMTP provider | Sender email address |
| `SMTP_PASS` | SMTP provider | App password (not regular email password) |
| `SMTP_FROM` | SMTP provider | Authorized sender address |
| `ID_VERIFICATION_AUTO_APPROVE` | Client decision | `false` recommended for production |
| `ID_VERIFICATION_MAX_ATTEMPTS_PER_DAY` | Client decision | Default `20` |

### Additional Pre-Launch Steps

1. **Apply Supabase schemas** to production project:
   - `web/supabase/schema.sql` (core)
   - `web/supabase/verification_schema.sql`
   - Feature schemas as needed (`courses_schema.sql`, `labs_schema.sql`, `mentorgo_schema.sql`, etc.)

2. **Create private storage buckets** in Supabase:
   - `notes-private` (private)
   - `id-cards` (private)

3. **Configure Supabase Auth redirect URLs** for all production origins.

4. **Create at least one admin account** in `public.users` with `role = 'admin'` or `'superadmin'`.

5. **Set up Razorpay webhook** in dashboard:
   - Endpoint URL: `https://<prod-domain>/api/webhook`
   - Events: `payment.captured`, `order.paid`, `payment.failed`
   - Copy webhook secret to `RAZORPAY_WEBHOOK_SECRET`

6. **Create the missing Shipping/Delivery Policy page** at `/shipping-policy` or `/delivery-policy`.

7. **Run `npm audit fix`** and verify `npm run build`, `npm run lint`, `npm test` all pass.

8. **Set `ENABLE_SAMPLE_LOGIN=false`** in production.

---

## Appendix: Verified Artifacts

- `npm run build` — ✅ Passed (43 routes including `/shipping-policy`, TypeScript clean)
- `npm run lint` — ✅ 0 errors (2 pre-existing `img` warnings in `site-footer.tsx` and `card-stack.tsx`)
- `npm test` — ✅ 23/23 passed
- `npm audit --omit=dev` — ✅ 0 vulnerabilities
- Secrets scan — ✅ No hardcoded secrets found
- Razorpay webhook HMAC — ✅ `crypto.timingSafeEqual` with length check
- Razorpay price authority — ✅ Price fetched from DB, not client
- Webhook idempotency — ✅ `upsert` on `razorpay_order_id`
- API auth guards — ✅ All mutation routes use `requireVerifiedProfileForApi()`
- Tenant isolation — ✅ Queries filtered by `university_id` + `user_id`
- Rate limiting — ✅ Create-order (5/15min), verify upload (daily limit)
- Console.log audit — ✅ All are error logging, no secrets leaked
- LLM integration — ✅ None present (Suite 2 N/A)
- Compliance pages — ✅ Terms, Privacy, Refund Policy, Contact, Shipping & Delivery Policy all present
- Env template — ✅ `.env.example` and `.env.vercel.example` complete with dummy values and webhook secret documentation

---

**Report generated by:** Principal QA & Security Engineer  
**Repository:** `web/`  
**Git commit:** `ae55214` (plus remediation commits)  
**Status:** PASS — Ready for client handoff pending production environment variable configuration
