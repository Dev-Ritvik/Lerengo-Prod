# LerenGO Software Requirements Specification

Baseline reviewed: `0a5c57f` on `main`, restored from the April 11 product direction.

## 1. Purpose

LerenGO is a web platform that helps students move from practical learning to idea execution to university-backed support. The product has one account and three visible modules:

- CampusGO for verified university workflows
- SkillGO for practical courses, certificates, and learning tracks
- ForgeGO for idea intake, research, patents, publication support, and guided builds

This SRS captures the current codebase behavior and design intent. It should be used before making future changes.

## 2. Scope

The system includes:

- public homepage
- informational pages
- sign in, sign up, email confirmation, and Google OAuth
- campus onboarding
- university selection
- campus profile completion
- campus verification by OTP or ID upload
- CampusGO workspace
- notes browsing, access, assessment, and downloads
- mentorship and doubts
- campus community and project board
- SkillGO course discovery, enrollment, assessments, and certificates
- ForgeGO idea submission and admin review
- admin workspace for managing campus/product data

The system does not currently include:

- a separate standalone Campus Network app
- a fourth homepage module
- a separate UI framework
- a public CMS

## 3. User Roles

### Visitor

Can:

- view homepage
- view info pages
- view public SkillGO and ForgeGO marketing surfaces
- start sign in or sign up

### Authenticated User

Can:

- complete university selection
- complete campus profile
- verify campus identity
- access SkillGO and ForgeGO flows that require login

### Verified Campus User

Can:

- access CampusGO
- browse university-scoped notes
- download accessible notes
- attempt note assessments
- create doubts
- reply where allowed
- participate in campus community
- create partner requests
- create mentorship requests
- submit ForgeGO ideas

### Senior or Mentor

Can:

- appear in mentorship surfaces when approved
- respond to assigned doubts where allowed
- exchange mentorship messages

### Admin

Can:

- access admin workspace after verified profile and admin role checks
- manage notes
- manage verification requests
- manage community reports and moderation
- manage courses
- manage labs submissions
- manage mentorship
- manage campus weekly items and surfaces

## 4. Functional Requirements

### 4.1 Public Platform Homepage

Files:

- `web/src/app/page.tsx`
- `web/src/app/page.module.css`

Requirements:

- show LerenGO as one platform
- present exactly three modules: SkillGO, ForgeGO, CampusGO
- route module CTAs to their configured origins or derived subdomains
- show sign in/sign up when no user is authenticated
- show profile menu when authenticated

### 4.2 Authentication

Files:

- `web/src/app/signin/page.tsx`
- `web/src/app/signin/actions.ts`
- `web/src/app/(auth)/signup/page.tsx`
- `web/src/app/(auth)/signup/actions.ts`
- `web/src/app/auth/login/route.ts`
- `web/src/app/auth/callback/route.ts`
- `web/src/app/auth/logout/route.ts`

Requirements:

- support password sign in
- support Supabase Google OAuth
- support email/password sign up
- preserve safe `next` paths only when they begin with `/` and do not begin with `//`
- create or upsert `users` rows after successful auth
- redirect users according to journey state
- clear auth session on logout and return to homepage

### 4.3 Journey Routing

Files:

- `web/src/lib/auth-journey.ts`
- `web/src/lib/tenant.ts`
- `web/middleware.ts`

Requirements:

- SkillGO and ForgeGO should not require campus verification just to enter their public lanes
- CampusGO must require university selection, campus profile, and verification
- unsafe next paths must be ignored
- post-auth destination must not allow loops into auth/callback/onboarding/verify dead ends

### 4.4 Campus Onboarding

Files:

- `web/src/app/onboarding/university/page.tsx`
- `web/src/app/onboarding/university/actions.ts`
- `web/src/app/onboarding/campus-profile/page.tsx`
- `web/src/app/onboarding/campus-profile/actions.ts`

Requirements:

- users must select an active university
- users must provide campus name, completion date/batch, department, and program domain
- campus profile must update the `users` row
- invalid university selections must redirect with error state

### 4.5 Verification

Files:

- `web/src/app/(auth)/verify/page.tsx`
- `web/src/app/(auth)/verify/verify-upload-client.tsx`
- `web/src/app/api/verify/email/send/route.ts`
- `web/src/app/api/verify/email/confirm/route.ts`
- `web/src/app/api/verify/upload/route.ts`
- `web/src/app/api/verify/status/route.ts`
- `web/src/lib/verification.ts`
- `web/src/lib/email-verification.ts`

Requirements:

- verified state is required for CampusGO
- OTP email must match the selected university domain
- OTP codes must be hashed before storage
- OTP sends must be rate limited
- ID uploads must allow JPG, PNG, and WEBP only
- ID uploads must reject files larger than 8 MB
- ID uploads must inspect file signatures
- verification requests must store status, score, reasons, and decision state
- approved verification must update `users.verified`

### 4.6 CampusGO

Files:

- `web/src/app/campus-network/page.tsx`
- `web/src/app/campus-network/analytics.ts`
- `web/src/lib/campus-weekly.ts`

Requirements:

- only verified users can enter CampusGO
- analytics must be scoped to the user's university
- service cards must link to notes, mentorship, community, and project board
- weekly campus items should use database rows when backend exists and fallback gracefully otherwise

### 4.7 Notes

Files:

- `web/src/app/browse-notes/page.tsx`
- `web/src/app/browse-notes/[noteId]/page.tsx`
- `web/src/app/api/notes/[noteId]/download/route.ts`
- `web/src/app/api/notes/[noteId]/assessment/route.ts`
- `web/src/app/api/create-order/route.ts`
- `web/src/app/api/webhook/route.ts`
- `web/src/lib/note-content.ts`
- `web/src/lib/note-assessments.ts`
- `web/src/lib/note-offers.ts`

Requirements:

- notes must be filtered by university
- archived notes must be excluded from public access
- free semester offer must unlock configured semester without payment
- paid access must depend on payment webhook or existing `note_access`
- signed download URLs must be used for protected files
- assessments must score answers server-side
- assessment attempts must be stored

### 4.8 SkillGO

Files:

- `web/src/app/courses/page.tsx`
- `web/src/app/courses/[slug]/page.tsx`
- `web/src/app/api/courses/route.ts`
- `web/src/app/api/courses/[slug]/route.ts`
- `web/src/app/api/courses/enrollments/route.ts`
- `web/src/app/api/courses/orders/route.ts`
- `web/src/app/api/courses/[slug]/assessment/route.ts`
- `web/src/lib/courses.ts`
- `web/src/lib/courses-seed.ts`

Requirements:

- show a course catalog and spotlight sections
- support fallback course data when enabled
- support paid/free course access state
- support enrollments
- support course assessments
- support certificate summaries

### 4.9 ForgeGO

Files:

- `web/src/app/labs/page.tsx`
- `web/src/app/labs/submit/page.tsx`
- `web/src/app/labs/submit/actions.ts`
- `web/src/lib/labs.ts`
- `web/src/app/admin/labs/actions.ts`

Requirements:

- show ForgeGO as a structured idea/research/build pipeline
- authenticated university-affiliated users can submit ideas
- submissions include idea stage, support track, priority, project context, and supporting details
- admin can review and update lab submissions
- backend-missing state should show actionable setup guidance

### 4.10 Mentorship and Doubts

Files:

- `web/src/app/mentorship/page.tsx`
- `web/src/app/mentorship/mentorship-shell.tsx`
- `web/src/app/api/doubts/route.ts`
- `web/src/app/api/doubts/[doubtId]/replies/route.ts`
- `web/src/app/api/mentorship/requests/route.ts`
- `web/src/app/api/mentorship/messages/route.ts`
- `web/src/lib/mentorship.ts`

Requirements:

- show available mentors, doubts, requests, notifications, and leaderboards
- users can create doubts
- assigned responders/admins can reply where allowed
- users can create mentorship requests
- request participants can exchange messages

### 4.11 Campus Community

Files:

- `web/src/app/community/page.tsx`
- `web/src/app/community/[postId]/page.tsx`
- `web/src/app/community/project-board/page.tsx`
- `web/src/app/api/community/posts/route.ts`
- `web/src/app/api/community/comments/route.ts`
- `web/src/app/api/community/helpful/route.ts`
- `web/src/app/api/community/reports/route.ts`
- `web/src/app/community/data.ts`

Requirements:

- community data must be scoped by university
- users can create posts, comments, helpful votes, reports, and partner requests
- admins can manage reports
- leaderboard and project board derive from campus activity

### 4.12 Admin Workspace

Files:

- `web/src/app/admin/page.tsx`
- `web/src/app/admin/*`
- `web/src/lib/auth.ts`

Requirements:

- admin access requires verified profile and admin role
- in production, admin role is only trusted when `admin_user_id` is present
- admin subdomain routes should redirect/rewrite through middleware
- admin pages use darker dashboard styling and denser cards

## 5. Nonfunctional Requirements

### Security

- no client-side payment unlock
- service role key must only run server-side
- middleware must not expose privileged data
- Supabase RLS must remain enabled
- file uploads must validate type, size, and signature
- route rate limits must protect costly actions
- sample login must stay disabled in production

### Performance

- page data should be fetched server-side where possible
- fallback course data avoids empty states when course backend is incomplete
- heavy public surfaces use static arrays plus dynamic data only when needed
- image assets should remain optimized through Next Image where possible

### Reliability

- missing backend schemas should produce clear setup hints
- auth service failures should fail safely
- generated assessments and fallback data must not crash public views
- email and payment failures must return user-safe errors

### Responsive UX

- all public pages must work on mobile
- cards must collapse cleanly
- navigation must wrap or become full width
- text must not overflow buttons or cards

## 6. Known Risks

- Production URL env vars must be configured. Missing URL values can cause module links to fall back to `http://localhost:3000`.
- Several production features depend on Supabase schema files being applied in the right order.
- Razorpay env vars are optional in examples but required for paid note/course flows.
- CI currently runs lint and build, but not the Node security tests.
- Some root files such as old logs/cookies are tracked in the restored baseline and should be reviewed before future cleanup.
