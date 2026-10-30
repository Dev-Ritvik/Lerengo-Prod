# LerenGO Production QA Checklist

Last updated: 2026-03-04

Current code status:
- `npm run lint`: pass
- `npm run build`: pass
- Browse notes uses real subject-level organization from `academic_subject_mappings`
- Admin notes, verification, community, mentorship, universities, analytics, and payments workspaces compile

Non-code blockers before production:
- Run `web/supabase/schema.sql` in the production Supabase project
- Run `web/supabase/verification_schema.sql` in the production Supabase project
- Configure production env vars
- Configure production Supabase auth redirects
- Configure `admin.lerengo` DNS + hosting
- Create at least one real admin account in `public.users`
- Verify storage buckets and RLS in production
- Decide whether shipping scope is `campus admin only` or `super admin + campus admin`

## 1. Production Environment Checklist

- [ ] `NEXT_PUBLIC_SUPABASE_URL` is set to production project URL
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` is set to production anon/public key
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is set in production server env
- [ ] `SUPABASE_NOTES_BUCKET` exists and is private
- [ ] `SUPABASE_ID_CARDS_BUCKET` exists and is private
- [ ] `NEXT_PUBLIC_APP_URL` points to `https://lerengo.com`
- [ ] `NEXT_PUBLIC_ADMIN_APP_URL` points to `https://admin.lerengo`
- [ ] `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` are production-valid
- [ ] `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `NEXT_PUBLIC_RAZORPAY_KEY_ID`, `RAZORPAY_WEBHOOK_SECRET` are production-valid
- [ ] Sample login flags are disabled in production
- [ ] Supabase Google OAuth callback and site URL include production domains
- [ ] Supabase email verification / OTP endpoints work against production env

## 2. Database and Access Control Checklist

- [ ] `public.users` has correct `role`, `verified`, and `university_id` values for real admins
- [ ] `public.universities` contains production campuses and correct domains
- [ ] `public.notes` has live metadata and no missing `subject`, `department`, `program_domain`, or `semester`
- [ ] `public.academic_subject_mappings` exists and is populated for each live campus
- [ ] `community_*` tables exist in production and are campus-scoped
- [ ] `verification_requests` and `verification_codes` exist in production
- [ ] RLS policies are verified on:
- [ ] `universities`
- [ ] `users`
- [ ] `notes`
- [ ] `payments`
- [ ] `note_access`
- [ ] `doubts`
- [ ] `verification_requests`
- [ ] `verification_codes`
- [ ] `community_posts`
- [ ] `community_comments`
- [ ] `community_reports`
- [ ] `community_partner_requests`
- [ ] `community_post_votes`
- [ ] `community_comment_votes`

## 3. Route-by-Route Manual QA

### Public and Marketing Routes

- [ ] `/`
Route status: code-complete
Checks: hero loads, domain cards render correctly, footer spacing is stable, profile menu state is correct for signed-in users, `Select your campus` CTA remains visually emphasized after refresh and navigation.

- [ ] `/about`
Route status: static
Checks: typography, spacing, footer placement, no hydration warnings.

- [ ] `/contact`
Route status: static
Checks: content renders correctly, contact details are correct, no layout overflow.

- [ ] `/privacy`
Route status: static
Checks: legal copy, spacing, footer placement.

- [ ] `/refund-policy`
Route status: static
Checks: legal copy, spacing, footer placement.

- [ ] `/terms`
Route status: static
Checks: legal copy, spacing, footer placement.

### Auth and Onboarding Routes

- [ ] `/signin`
Route status: code-complete
Checks: email/password sign-in works, Google sign-in works, admin user can later reach `/admin`, non-admin user does not see admin menu item, footer sits at bottom, no white seam.

- [ ] `/signup`
Route status: code-complete
Checks: email/password sign-up works, Google sign-up works, redirects are correct, no sample-login leakage in production.

- [ ] `/verify`
Route status: code-complete
Checks: OTP send works, OTP confirm works, invalid email domains reject correctly, real SMTP delivery works, preview/sample mode disabled in production if required.

- [ ] `/verify/status`
Route status: code-complete
Checks: status reflects approved, pending, and rejected states correctly.

- [ ] `/onboarding/university`
Route status: code-complete
Checks: university search works, selected campus persists, no incomplete-schema warning after migrations.

- [ ] `/onboarding/campus-profile`
Route status: code-complete
Checks: search box, completion year, department dropdown, domain dropdown, and selected university-specific mappings all work.

### Main User App Routes

- [ ] `/dashboard`
Route status: code-complete
Checks: recent notes and user data load correctly, archived notes do not appear, CTAs route to real pages.

- [ ] `/campus-network`
Route status: code-complete
Checks: analytics cards load, weekly cards load, core service CTAs route correctly, profile menu works, footer spacing is stable.

- [ ] `/browse-notes`
Route status: code-complete
Checks: sidebar stays fixed on desktop, subject sections are driven by real `academic_subject_mappings`, filters work campus-scope only, archived notes do not show, search and filters update route state correctly.

- [ ] `/browse-notes/[noteId]`
Route status: code-complete
Checks: note detail renders, paid/free logic is correct, offer semester logic is correct, download only works when access exists, checkout opens Razorpay correctly.

- [ ] `/mentorship`
Route status: frontend-complete, workflow-partial
Checks: filters work, cards render, profile menu works, no broken CTAs. Booking/session workflow is still shallow and must be accepted as current scope or expanded before ship.

- [ ] `/community`
Route status: code-complete
Checks: create discussion works, helpful voting works, report action works, project partner form works, right-rail data loads, campus scoping is enforced.

- [ ] `/community/[postId]`
Route status: code-complete
Checks: post detail loads, comment/reply creation works, helpful voting on comments works, related partner info renders.

- [ ] `/community/leaderboard`
Route status: code-complete
Checks: contributor rankings load from real data, campus scoping is correct.

- [ ] `/community/project-board`
Route status: code-complete
Checks: partner requests load, close/match actions work for owner/admin only, new submissions appear after refresh.

### Admin Routes

- [ ] `/admin`
Route status: code-complete
Checks: only admin users can enter, stats load campus-scoped only, module links work.

- [ ] `/admin/notes`
Route status: code-complete
Checks: upload PDF works, metadata save works, publish/unpublish works, archive/restore works, delete works, archived notes never leak to user routes.

- [ ] `/admin/verification`
Route status: code-complete
Checks: signed ID image preview works, approve/reject works, user verified state changes correctly, history reflects decisions, no service-role failure in production.

- [ ] `/admin/community`
Route status: code-complete
Checks: review report works, post moderation state updates, history reflects review note and status.

- [ ] `/admin/mentorship`
Route status: code-complete
Checks: mentor approvals, role assignment, and inactive toggles persist correctly.

- [ ] `/admin/universities`
Route status: code-complete
Checks: university settings save, departments/programs/subject mappings save, browse-notes reflects mapping changes.

- [ ] `/admin/analytics`
Route status: code-complete
Checks: all numbers are campus-scoped, contributor and moderation metrics look sane against actual data.

- [ ] `/admin/payments`
Route status: code-complete, ops-dependent
Checks: audit data loads, amounts match Razorpay records, failed/created/success states reflect webhook outcomes.

## 4. API QA Checklist

- [ ] `/api/create-order`
Checks: rejects archived notes, rejects out-of-campus notes, creates valid Razorpay order.

- [ ] `/api/webhook`
Checks: verifies signature, grants note access on success, does not double-grant access.

- [ ] `/api/notes/[noteId]/download`
Checks: blocks access without entitlement, allows access with entitlement, blocks archived notes.

- [ ] `/api/verify/email/send`
Checks: validates campus domain, creates code, sends real email.

- [ ] `/api/verify/email/confirm`
Checks: accepts valid code, rejects expired or invalid code, updates verification state correctly.

- [ ] `/api/verify/upload`
Checks: uploads ID image, creates verification request, respects attempt limits.

- [ ] `/api/verify/status`
Checks: returns correct verification state for signed-in user.

- [ ] `/api/doubts`
Checks: campus scope is enforced, create/read paths work.

- [ ] `/api/community/posts`
Checks: create discussion post works and is campus-scoped.

- [ ] `/api/community/comments`
Checks: create comment/reply works and updates reply counts.

- [ ] `/api/community/helpful`
Checks: toggles post/comment helpful votes correctly and idempotently.

- [ ] `/api/community/reports`
Checks: creates report, prevents invalid submissions, campus scope holds.

- [ ] `/api/community/partner-requests`
Checks: create partner request works.

- [ ] `/api/community/partner-requests/[requestId]`
Checks: close/match permissions are enforced and status updates persist.

## 5. Security and Scope Checklist

- [ ] Non-admin users cannot access `/admin/*`
- [ ] Campus A users cannot see notes, community data, partner requests, or doubts from Campus B
- [ ] Archived notes cannot be purchased or downloaded
- [ ] ID card previews are signed and time-limited
- [ ] Storage buckets are private and not directly enumerable
- [ ] Sample login and development shortcuts are off in production
- [ ] Error messages do not expose secrets or internal SQL detail

## 6. Performance and UX Checklist

- [ ] No route shows hydration warnings in production
- [ ] No route shows white seam / footer gap regressions
- [ ] Fixed sidebars remain fixed on desktop
- [ ] Mobile breakpoints are usable on:
- [ ] `/`
- [ ] `/signin`
- [ ] `/signup`
- [ ] `/browse-notes`
- [ ] `/mentorship`
- [ ] `/community`
- [ ] `/admin/*`
- [ ] Loading states/skeletons render where expected
- [ ] Hover/focus states remain visible but restrained

## 7. Launch Decision

Production launch is acceptable only when all of the following are true:

- [ ] Lint passes
- [ ] Production build passes
- [ ] Production migrations are applied
- [ ] Production env vars are set
- [ ] Real admin user can sign in and reach `/admin`
- [ ] Payments are verified end-to-end
- [ ] OTP email verification is verified end-to-end
- [ ] Campus verification flow is verified end-to-end
- [ ] Notes purchase/download flow is verified end-to-end
- [ ] Manual QA is complete for every route listed above

## 8. Current Assessment

Current assessment from code:
- Codebase is materially closer to ship than before this pass
- Local lint and production build are both clean
- Main remaining blockers are production configuration, migration application, and manual route QA
- If those external items are handled cleanly, the app is in a viable pre-production state

