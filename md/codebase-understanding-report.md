# Codebase Understanding Report

Baseline reviewed: `0a5c57f` on `main`, restored from the April 11 product direction.

Local protected clone saved at: `E:\lerengo\lerengo-april-11-best-version`

## 1. Tech Stack

The project is a single Next.js app in `web/`.

Core stack:

- Next.js `16.1.6` with App Router
- React `19.2.3`
- TypeScript
- CSS Modules plus global CSS
- Supabase Auth, Postgres, Storage, and SSR helpers
- Razorpay for payments
- Nodemailer for OTP email
- Vercel for hosting
- GitHub Actions for CI

Why this stack fits:

- Next.js App Router supports the mix of public pages, protected server-rendered pages, API routes, middleware, and server actions.
- Supabase gives one auth/database/storage layer for campus-scoped workflows.
- CSS Modules preserve the highly custom visual design without adding a UI framework.
- Vercel matches the Next.js app and subdomain routing model.

Important files:

- `web/package.json`
- `web/next.config.ts`
- `web/middleware.ts`
- `web/src/app/layout.tsx`
- `.github/workflows/ci.yml`

## 2. Folder Structure

Root:

- `.github/workflows/ci.yml`: GitHub Actions lint/build workflow.
- `graphify-out/`: generated code graph and architecture report.
- `web/`: main application.
- `DESIGN.md`: current design language handover.
- `Tech Stack.md`: current stack handover.
- `srs.md`: current requirements document.
- `codebase-understanding-report.md`: this report.

Inside `web/`:

- `src/app/`: App Router pages, layouts, loading states, route handlers, server actions.
- `src/components/`: shared UI and behavior controllers.
- `src/lib/`: auth, tenant guards, Supabase clients, domain logic, security helpers, data builders.
- `supabase/`: SQL schemas and RLS policies.
- `public/`: logo, icons, and static images.
- `test/`: Node test suite.
- `scripts/`: sample data seed script.

Important app areas:

- `src/app/page.tsx`: public platform homepage.
- `src/app/campus-network/`: CampusGO workspace.
- `src/app/courses/`: SkillGO.
- `src/app/labs/`: ForgeGO.
- `src/app/admin/`: admin workspace.
- `src/app/api/`: backend route handlers.

## 3. Website Workflow

The user enters through the homepage at `/`.

Homepage flow:

1. User sees LerenGO as one product platform.
2. The page explains the three modules: SkillGO, ForgeGO, CampusGO.
3. Visitors can sign in or sign up.
4. Authenticated users see a profile menu.
5. Module buttons route to SkillGO, ForgeGO, or CampusGO origins.

Module workflow:

- SkillGO can be explored as a learning/catalog lane.
- ForgeGO can be explored as an idea/research/build lane.
- CampusGO requires a verified campus journey.

CampusGO journey:

1. Sign in or sign up.
2. Select university.
3. Complete campus profile.
4. Verify by university email OTP or ID upload.
5. Enter CampusGO.
6. Use notes, mentorship, community, and project board.

Admin workflow:

1. Admin signs in.
2. Middleware and guards route admin traffic to `/admin/login` or admin workspace.
3. `requireAdminUser()` checks verified profile plus admin role.
4. Admin manages notes, verification, community, courses, labs, mentorship, universities, analytics, and surfaces.

## 4. Authentication Workflow

Main files:

- `web/src/app/signin/page.tsx`
- `web/src/app/signin/actions.ts`
- `web/src/app/(auth)/signup/page.tsx`
- `web/src/app/(auth)/signup/actions.ts`
- `web/src/app/auth/login/route.ts`
- `web/src/app/auth/callback/route.ts`
- `web/src/app/auth/logout/route.ts`
- `web/src/lib/auth-journey.ts`
- `web/src/lib/tenant.ts`
- `web/src/lib/auth.ts`
- `web/src/lib/supabase/server.ts`
- `web/src/lib/supabase/middleware.ts`
- `web/src/lib/supabase/cookie-options.ts`

Sign in:

- Password sign in posts to `signInWithPassword`.
- Credentials are trimmed and validated.
- Supabase signs the user in.
- The `users` table is upserted.
- The destination is resolved by `resolvePostAuthDestination`.

Sign up:

- Signup validates full name, email, password, and confirmation.
- Password must be at least 8 characters.
- Supabase signUp receives `emailRedirectTo` for `/auth/callback`.
- If a session exists immediately, profile is upserted and user is routed.
- Otherwise user is sent to check email.

Google OAuth:

- `/auth/login` starts Supabase OAuth.
- `/auth/callback` exchanges code or OTP token hash.
- Callback upserts a user profile.
- Admin users headed to admin routes can be sent to `/admin/surfaces`.

Session handling:

- Supabase SSR client reads/writes cookies.
- Middleware refreshes the session.
- Cookie domain is derived from `NEXT_PUBLIC_AUTH_COOKIE_DOMAIN` or the app URL.

Protected routes:

- `requireSessionUser()` requires login.
- `requireUniversityProfile()` requires a selected university.
- `requireVerifiedProfile()` requires selected university and verification.
- `requireAdminUser()` requires verified profile and admin role.

Logout:

- `/auth/logout` calls `supabase.auth.signOut()`.
- User is redirected to `/`.

## 5. Backend/API Workflow

API routes:

- `POST /api/community/comments`
- `POST /api/community/helpful`
- `POST /api/community/partner-requests`
- `PATCH /api/community/partner-requests/[requestId]`
- `POST /api/community/posts`
- `POST /api/community/reports`
- `GET /api/courses`
- `GET /api/courses/[slug]`
- `POST /api/courses/[slug]/assessment`
- `GET, POST /api/courses/enrollments`
- `POST /api/courses/orders`
- `POST /api/create-order`
- `GET, POST /api/doubts`
- `POST /api/doubts/[doubtId]/replies`
- `GET, POST /api/mentorship/messages`
- `POST /api/mentorship/reports`
- `POST /api/mentorship/requests`
- `PATCH /api/mentorship/requests/[requestId]`
- `POST /api/notes/[noteId]/assessment`
- `GET /api/notes/[noteId]/download`
- `PATCH /api/notifications/[notificationId]`
- `POST /api/verify/email/send`
- `POST /api/verify/email/confirm`
- `GET /api/verify/status`
- `POST /api/verify/upload`
- `POST /api/webhook`

Database schemas:

- `web/supabase/schema.sql`: core users, universities, notes, payments, doubts, mentorship, community, verification.
- `web/supabase/courses_schema.sql`: SkillGO course tables.
- `web/supabase/labs_schema.sql`: ForgeGO lab submissions.
- `web/supabase/campus_weekly_schema.sql`: CampusGO weekly items.
- `web/supabase/verification_schema.sql`: verification code support.
- `web/supabase/mentorship_chat.sql`: mentorship messages and notification fields.

Important backend helpers:

- `web/src/lib/route-security.ts`: rate limits and admin service role access.
- `web/src/lib/local-rate-limit.ts`: in-memory IP/user rate limiting.
- `web/src/lib/verification.ts`: ID card scoring, file inspection, hashing.
- `web/src/lib/email-verification.ts`: OTP generation and hashing.
- `web/src/lib/courses.ts`: SkillGO data building, access state, assessments, certificates.
- `web/src/lib/mentorship.ts`: mentorship and doubt data mapping.
- `web/src/app/community/data.ts`: community data mapping.

## 6. Frontend Workflow

Shared components:

- `PageTransitionController`: route enter animation.
- `TransitionLink`: controlled client navigation and fallback hard navigation.
- `ScrollRevealController`: reveal-on-scroll CSS state.
- `ProfileMenu`: portal-based profile menu with profile/admin/mentor/logout links.
- `SiteFooter`: shared footer.
- `InfoPageShell`: shared about/contact/legal shell.
- `AssessmentRoom`: shared assessment UI.

Public frontend:

- Homepage is editorial and module-driven.
- Info pages share one consistent shell.
- Auth pages use centered off-white forms on charcoal backgrounds.

CampusGO frontend:

- dashboard-like verified campus surface
- service cards
- weekly campus signals
- analytics-derived stats
- links to notes, mentorship, community, project board

SkillGO frontend:

- catalog page
- course detail page
- enrollment panel
- learning console
- assessment/test page

ForgeGO frontend:

- public explanation page
- idea submit form
- review/admin state in admin workspace

Admin frontend:

- dark dashboard cards
- module cards
- forms for notes, verification, courses, labs, mentorship, community, universities

## 7. Data Flow Map

Auth data:

1. Supabase Auth creates session.
2. App upserts `users` row.
3. Middleware refreshes cookies.
4. Tenant guards read `users`.
5. Pages and APIs decide access based on profile.

Campus data:

1. User selects university.
2. `users.university_id` is set.
3. Campus profile fields are added.
4. Verification sets `users.verified`.
5. CampusGO queries notes, mentors, community, and weekly items by university.

Notes/payment data:

1. Admin creates verified notes.
2. User browses same-university notes.
3. Free offer or free note grants direct access.
4. Paid note creates Razorpay order.
5. Webhook verifies payment and creates access.
6. Download route creates signed storage URL.

SkillGO data:

1. Course catalog loads DB courses or fallback data.
2. Enrollment records track progress.
3. Assessment attempts store score and pass state.
4. Certificates summarize completed work.

ForgeGO data:

1. User submits lab idea.
2. Submission is stored in `lab_submissions`.
3. Admin reviews and updates status/priority/track.

Community data:

1. Verified users create posts, comments, votes, partner requests, and reports.
2. Data builders aggregate contributor and leaderboard state.
3. Admins moderate reports.

## 8. Design Understanding

The design is not random dark mode. It is a deliberate institutional product language:

- charcoal atmosphere
- off-white content
- cool-grey accents
- Sora typography
- large editorial headings
- low-noise cards
- rounded dark panels
- subtle shadows
- small hover lift
- smooth route transitions
- calm uppercase eyebrows

The strongest design reference is the info page/footer and current homepage dark canvas. Future design changes should preserve:

- three-module platform hierarchy
- dark structural rhythm
- button shape and restrained hover states
- card radius and elevation
- footer language
- mobile wrapping behavior

## 9. Risks and Bugs

Concrete risks found during analysis:

- Production URL env vars are required. If `NEXT_PUBLIC_APP_URL` or module URL env vars are absent, module links can fall back to `http://localhost:3000`.
- The restored baseline has tracked local artifacts such as `cookies.txt`, `devserver.log`, `devserver2.log`, `tmp-cookies.txt`, and response HTML files. They are part of the saved baseline but should be reviewed before any cleanup.
- CI runs lint/build but does not currently run `npm test`.
- Vercel deployment can block commits whose Git author is not associated with the Vercel account.
- Feature completeness depends on Supabase schema files being applied. Missing schema support is handled in several places, but production setup still needs care.
- Razorpay variables are empty in examples; paid flows need production secrets.
- `resolveAppUrl()` currently has a localhost fallback. That is convenient locally but risky in production if env is missing.

## 10. Improvement Plan

Critical fixes before future production polish:

- Configure all Vercel production env vars from `web/.env.vercel.example`.
- Confirm module URLs: `NEXT_PUBLIC_CAMPUS_NETWORK_APP_URL`, `NEXT_PUBLIC_COURSES_APP_URL`, and `NEXT_PUBLIC_LABS_APP_URL`.
- Add `npm test` to CI.
- Decide whether tracked logs/cookie files should remain in the repository.

Important improvements:

- Make production URL fallback safer so deployed builds cannot silently emit localhost.
- Add a production setup checklist for Supabase schema order.
- Expand tests around route-security, safe redirects, and app-url resolution.
- Verify all module subdomains after every deploy.

Nice-to-have polish:

- Consolidate repeated tone helpers across pages.
- Add visual regression screenshots for homepage/module pages.
- Create a design token reference from the current CSS variables.
- Keep `DESIGN.md` and `DESIGN_LANGUAGE_GUIDE.md` synchronized.

## 11. Before Coding

Do not implement new product or design changes until the restored baseline is explicitly approved. This version should be treated as the preferred local reference:

`E:\lerengo\lerengo-april-11-best-version`
