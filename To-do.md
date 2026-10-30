# Campus Network MVP - Task Breakdown

Updated: 2026-02-23

---

## WEEK 1 - Core Platform

[x] Initialize Next.js project
[x] Setup Supabase project (URL, keys, schema, active universities seeded)
[x] Create users table (`web/supabase/schema.sql`)
[x] Create universities table (`web/supabase/schema.sql`)
[x] Create notes table (`web/supabase/schema.sql`)
[x] Implement Google login
[x] Save `university_id` on first login
[x] Create dashboard layout
[x] Implement university-based note filtering
[x] Build admin-only note upload page
[x] Upload PDF to Supabase Storage
[x] Implement free note download

---

## WEEK 2 - Payments Integration

[x] Create payments table (`web/supabase/schema.sql`)
[x] Create note_access table (`web/supabase/schema.sql`)
[ ] Setup Razorpay test account and keys in `.env.local`
[x] Implement `POST /api/create-order`
[x] Implement `POST /api/webhook`
[x] Verify webhook signature
[x] Update payment status after webhook
[x] Create `note_access` record after successful payment
[x] Gate download by `note_access`
[ ] Test INR 1 payment end-to-end (10 runs)
[x] Add Privacy Policy page
[x] Add Terms page
[x] Add Refund Policy page

---

## WEEK 3 - Auth + Onboarding + Verification

[x] Implement role column in users table (`web/supabase/schema.sql`)
[x] Separate sign-in and sign-up pages
[x] Add username/password sign-in
[x] Add Google OAuth sign-in on sign-in and sign-up flow
[x] Build campus profile page (campus search, completion date, department, domain)
[x] Wire flow: Sign in/Sign up -> Campus Profile -> Verify -> Campus Network
[x] Build OTP verification (email send + confirm APIs)
[x] Build ID card upload verification flow (drag/drop + file validation)
[x] Build verification status polling and redirect to Campus Network on approval
[x] Build admin verification page skeleton/actions
[x] Add modern auth/verify transitions and UI cleanup

---

## WEEK 4 - Campus Network Home (Current Work)

[x] Build new Campus Network page (`/campus-network`)
[x] Add dynamic live stats bar (verified students, notes/month, active mentors)
[x] Build reusable weekly cards:
[x] `WeeklyTopSubjectCard`
[x] `WeeklyExamCard`
[x] `WeeklyDiscussionCard`
[x] `WeeklyProjectCard`
[x] Add campus-scoped 7-day rolling analytics logic
[x] Move Core Services above This Week section
[x] Use uploaded icons for Notes, Mentorship, Community
[x] Center and restyle stats bar (compact, no outline)
[x] Reduce hero heading size and tune spacing
[x] Fix transition-link crash (`Failed to fetch`) with safe fallback navigation

---

## OPEN ITEMS (NEXT)

[ ] Razorpay full integration testing in test mode
[ ] Senior verification toggle (admin control)
[ ] Doubt assign/claim UI (backend route exists; full workflow UI pending)
[ ] Sentry/error logging integration
[ ] Domain + DNS + production deployment hardening
[ ] Launch checklist and beta rollout

---

## BLOCKERS

Do NOT launch if:

- Payment unlock works without webhook confirmation.
- Notes are accessible across universities.
- Storage buckets are public for sensitive content.
- Webhook signature verification is disabled.
