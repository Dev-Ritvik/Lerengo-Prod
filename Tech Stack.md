# LerenGO Tech Stack

Baseline reviewed: `0a5c57f` on `main`, restored from the April 11 product direction.

## 1. Application Framework

- Next.js `16.1.6`
- React `19.2.3`
- React DOM `19.2.3`
- TypeScript `^5`
- App Router
- Server Components by default
- Server Actions where form workflows need server-side mutation

Important files:

- `web/package.json`
- `web/next.config.ts`
- `web/src/app/layout.tsx`
- `web/middleware.ts`

## 2. Runtime and Hosting

- Vercel hosting
- GitHub Actions CI for lint/build
- Vercel project root directory: `web`
- Local development command: `npm run dev`
- Production build command: `npm run build`

Important files:

- `.github/workflows/ci.yml`
- `web/README.md`
- `web/.env.vercel.example`

## 3. Frontend Styling

- CSS Modules for page and component styling
- Global CSS for theme tokens, base layout, footer, transitions, and common controls
- Google Font: Sora
- No Tailwind, shadcn, or UI component framework in this baseline

Important files:

- `web/src/app/globals.css`
- `web/src/app/page.module.css`
- `web/src/components/info-page-shell.module.css`
- `web/src/app/(auth)/auth-flow.module.css`

## 4. Database and Auth

- Supabase Postgres
- Supabase Auth
- Supabase SSR helpers via `@supabase/ssr`
- Typed database surface in `web/src/lib/supabase/types.ts`
- Server-side auth checks in `web/src/lib/auth.ts` and `web/src/lib/tenant.ts`
- Session refresh in `web/src/lib/supabase/middleware.ts`

Main tables include:

- `universities`
- `users`
- `notes`
- `payments`
- `note_access`
- `doubts`
- `doubt_replies`
- `mentorship_requests`
- `mentorship_messages`
- `notifications`
- `community_posts`
- `community_comments`
- `community_partner_requests`
- `verification_requests`
- `verification_codes`
- course tables from `courses_schema.sql`
- lab tables from `labs_schema.sql`
- campus weekly tables from `campus_weekly_schema.sql`

## 5. Storage

- Supabase Storage
- Private notes bucket
- Private ID cards bucket

Important env vars:

- `SUPABASE_NOTES_BUCKET`
- `SUPABASE_ID_CARDS_BUCKET`

Important routes:

- `web/src/app/api/notes/[noteId]/download/route.ts`
- `web/src/app/api/verify/upload/route.ts`

## 6. Payments

- Razorpay Node SDK `^2.9.6`
- Order creation for notes
- Webhook verification for final access
- Frontend checkout must not unlock content by itself

Important files:

- `web/src/app/api/create-order/route.ts`
- `web/src/app/api/webhook/route.ts`
- `web/src/components/assessment-room.tsx`

Important env vars:

- `RAZORPAY_KEY_ID`
- `NEXT_PUBLIC_RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`

## 7. Email

- Nodemailer `^8.0.1`
- SMTP credentials for university email OTP verification

Important files:

- `web/src/app/api/verify/email/send/route.ts`
- `web/src/app/api/verify/email/confirm/route.ts`
- `web/src/lib/email-verification.ts`

Important env vars:

- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`

## 8. Security and Routing

- Next.js middleware for subdomain routing and session refresh
- Supabase RLS policies in SQL files
- Route-level guards for verified campus users and admins
- Local and persistent rate limiting helpers
- CSP and security headers in Next config

Important files:

- `web/middleware.ts`
- `web/src/lib/route-security.ts`
- `web/src/lib/local-rate-limit.ts`
- `web/next.config.ts`
- `web/test/security.test.ts`

## 9. Testing and Quality

Scripts:

- `npm run lint`
- `npm run build`
- `npm test`
- `npm run seed:sample`

CI runs:

- install dependencies
- lint
- build

The current test suite focuses on:

- sample login production disable behavior
- course fallback behavior
- local rate limiting
- forwarded IP parsing

## 10. Environment Variables

Primary public URLs:

- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_ADMIN_APP_URL`
- `NEXT_PUBLIC_CAMPUS_NETWORK_APP_URL`
- `NEXT_PUBLIC_COURSES_APP_URL`
- `NEXT_PUBLIC_LABS_APP_URL`
- `NEXT_PUBLIC_AUTH_COOKIE_DOMAIN`

Supabase:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Feature flags:

- `ALLOW_COURSE_FALLBACK`
- `ENABLE_SAMPLE_LOGIN`
- `ID_VERIFICATION_AUTO_APPROVE`
- `ID_VERIFICATION_AUTO_APPROVE_DELAY_SECONDS`
- `ID_VERIFICATION_MAX_ATTEMPTS_PER_DAY`
- `NOTES_FREE_OFFER_SEMESTER`

Production must set URL env vars correctly. If missing, the current helper can fall back to `http://localhost:3000`, which is the cause of localhost links in deployed module buttons.
