# LerenGO Production Readiness Status

Last updated: 2026-04-06

This file is the current plain-language assessment of what is still not ready for production in the LerenGO codebase. It is intentionally direct. The goal is not to sound optimistic. The goal is to prevent a premature launch based on UI polish alone.

## Current state in one sentence

LerenGO is now a strong pre-production build, but it is not yet a production-complete system.

That means the product has:

- a much more coherent UI
- working main app domains
- better route coverage
- real backend flows for notes, mentorship, community, verification, and courses

But it still lacks some of the operational, testing, security, and content guarantees required for a confident public launch.

## What is already in a good state

These things are materially better than before:

- local lint passes
- production build passes
- the main user routes compile
- admin routes compile
- the design system is far more consistent
- campus network, landing page, and courses page now communicate clearly
- courses now has real backend structure instead of only static marketing UI
- verification and community logic have been improved compared with earlier snapshots

That matters. The repo is not a broken prototype anymore.

## What is still not ready for production

### 1. There is no real automated test suite

This is the largest engineering risk.

Current CI only runs:

- `npm run lint`
- `npm run build`

That means CI only proves:

- the code parses
- the code types
- the app compiles

It does **not** prove:

- sign in behavior
- sign up behavior
- onboarding persistence
- OTP send / confirm correctness
- note purchase and unlock behavior
- Razorpay success / failure behavior
- webhook correctness
- mentorship request and chat behavior
- community comment, reply, helpful vote, and report behavior
- courses enrollment, assessment, and certificate behavior

Until there is browser E2E coverage or at least route-level integration testing, the app is still vulnerable to hidden regressions on every release.

### 2. Production configuration is still a real launch risk

The product depends on external services:

- Supabase
- SMTP
- Razorpay
- Google OAuth
- production domains

The code may be ready while production is not.

The most likely production failures are still:

- missing or wrong env vars
- broken callback URLs
- bad OAuth redirects
- wrong webhook secret
- missing service role key
- wrong app URL values
- wrong admin domain values
- bucket misconfiguration

So launch is still blocked until the deployed environment is validated end to end, not only by code review.

### 3. Database migrations still have to be fully applied and verified

The current repo contains important SQL files:

- `web/supabase/schema.sql`
- `web/supabase/verification_schema.sql`
- `web/supabase/courses_schema.sql`
- `web/supabase/mentorship_chat.sql`

If production does not match those schema expectations, parts of the app will fail or silently degrade.

Courses is especially sensitive here because the code can fall back to seed-backed behavior if the schema is incomplete. That fallback is helpful for development, but it is not acceptable as a hidden production state.

Production is not ready until:

- all required migrations are applied
- all required tables exist
- all required columns exist
- all RLS policies are checked against real users

### 4. Observability is still weak

The app still relies too much on local logging patterns like:

- `console.error(...)`
- thrown runtime errors

What is still missing in any serious launch sense:

- central error monitoring
- alerting
- request tracing
- log aggregation
- payment failure alerts
- OTP anomaly alerts
- moderation anomaly alerts

Without observability, even a small production issue can take too long to diagnose.

### 5. Abuse prevention and rate limiting are still incomplete

The codebase does not yet show a clear system-wide rate limiting strategy.

This matters for routes such as:

- auth entry
- OTP send
- OTP confirm
- ID verification upload
- course orders
- reports
- helpful votes
- mentorship messages

Campus scoping is useful, but it is not an abuse-prevention system.

### 6. Courses backend exists, but course operations are not fully productized

The Courses domain now has:

- catalog structures
- enrollments
- payments
- course detail pages
- assessment flow
- certificate-oriented logic

But a production course business also needs operational workflows for:

- course creation
- module and lesson editing
- private video management
- assessment authoring
- certificate auditing
- learner progress review

The user-facing lane is stronger than the operator tooling behind it.

### 7. Real content is still a production blocker

A polished empty product still feels unfinished.

Launch readiness still depends on real content in:

- universities
- departments
- academic subject mappings
- verified notes
- mentors
- community discussions
- project board requests
- course records
- course lessons
- private videos
- assessment items

If this content is thin or inconsistent, the experience will feel dead even if the code works.

### 8. Manual QA still has to be run on live-like data

The repo already has `web/PRODUCTION_QA_CHECKLIST.md`, but a checklist file is not proof that QA actually happened.

Before launch, the team still needs real route-by-route manual QA with:

- a student account
- a mentor account
- an admin account
- multiple campuses
- at least one paid note flow
- at least one paid course flow
- at least one real OTP flow
- at least one approved and rejected verification case
- at least one Razorpay success and one failure path

### 9. Legal and support ownership still matter

Static legal pages exist, but production also requires:

- legal review of the text
- refund policy alignment with actual course/payment behavior
- support ownership
- report-handling process
- verification dispute process
- admin moderation SOP

If operational ownership is unclear, production quality still is not real.

### 10. Mobile and device validation is still required

The app has been redesigned heavily. That is good, but it increases the need for real device testing.

Still required:

- mobile layout checks
- overflow checks
- CTA readability checks
- header/footer stability checks
- low-memory browser checks
- performance checks on large pages

Desktop alone is not enough.

### 11. The repo is still in active change mode

The worktree is still moving fast. That is normal during iteration, but it means the product has not yet reached a stable release-candidate phase.

Production gets safer when:

- design churn stops
- migration scope stabilizes
- QA window is fixed
- route behavior stops shifting

That freeze point has not fully happened yet.

## Practical production verdict

The correct current verdict is:

**pre-production capable, but not launch-complete**

That means you can keep building on this repo confidently, but you should not confuse “builds successfully” with “safe to launch publicly.”

## The shortest serious path to production

If you want the highest-value order of work, do this:

1. Apply and verify all production database migrations.
2. Validate all production env vars, redirects, buckets, and webhook secrets.
3. Run real end-to-end QA for auth, verification, notes payments, and courses payments.
4. Add automated integration or E2E tests to CI.
5. Add observability and rate limiting.
6. Seed strong real content across notes, mentors, community, and courses.
7. Freeze UI churn and test mobile behavior before launch.

## Final rule for future chats

If a future chat claims the app is ready for production, it should only say that after checking:

- migrations
- envs
- live QA
- payment flow
- verification flow
- content readiness
- monitoring
- abuse controls
- automated tests

Without those, the correct answer is still: **not production-ready yet**.
