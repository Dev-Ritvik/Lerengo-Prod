# Context
We already have a homepage. DO NOT refactor or restyle it. Add new onboarding + verification system as new routes + new components + new API routes only.

Tech stack locked:
- Next.js App Router + TypeScript
- Supabase Postgres + Supabase Storage (private bucket)
- Supabase Auth with Google OAuth
- Hosting on Vercel
No stack changes.

# Goal
Implement secure multi-tenant university isolation + Level-2 verification (ID card upload auto-approve) so students can ONLY access their university’s data.

# Critical security rule (non-negotiable)
Verification is not the security wall. Tenant isolation is:
- Every user has university_id
- Every university-scoped table has university_id
- Every campus API query MUST filter by university_id derived from Supabase session (server-side)
- NEVER accept university_id from client request body/query
- Block all campus endpoints unless user.verified=true
This prevents cross-university access even if users tamper with requests (IDOR).

# New routes (App Router)
Create these pages:
- app/(auth)/signup/page.tsx           # Step 1 of 3 (Create account)
- app/(auth)/verify/page.tsx           # Step 2 of 3 (Upload ID)
- app/(auth)/verify/status/page.tsx    # Step 3 of 3 (Approved/Rejected)

Do not modify existing routes except adding links.

# UI style requirement
Match homepage style exactly:
- dark navy/blue gradient background
- centered large white rounded card (big radius)
- top chip showing selected university: "University: <name>  Change"
- step indicator top-right: "Step X of 3"
- rounded inputs, pill primary button (dark)
Keep CSS scoped to new components; don’t change globals.

# Data model (Supabase tables + types)
Create migrations for:
1) universities
- id uuid pk default gen_random_uuid()
- name text not null
- name_variants text[] default '{}'
- reg_id_regex text[] default '{}'
- keywords text[] default '{}'
- min_score int default 80
- created_at timestamptz default now()

2) profiles (extend Supabase auth users)
NOTE: use public.profiles with id = auth.users.id pattern.
- id uuid pk references auth.users(id) on delete cascade
- full_name text
- university_id uuid references universities(id)
- verified boolean default false
- verified_at timestamptz
- reg_id_hash text
- reg_id_last4 text
- created_at timestamptz default now()

3) verification_requests
- id uuid pk default gen_random_uuid()
- user_id uuid references auth.users(id) on delete cascade
- university_id uuid references universities(id)
- status text check in ('pending','approved','rejected') default 'pending'
- id_front_path text not null   # storage path in private bucket
- score int default 0
- reasons jsonb default '{}'::jsonb
- attempt_no int default 1
- created_at timestamptz default now()
- decided_at timestamptz

Also ensure all future campus tables include university_id and are filtered.

# RLS (mandatory)
Enable RLS and write policies:
- profiles: user can select/update only their own row (id = auth.uid()).
- universities: readable by all (select policy).
- verification_requests: user can select only their own rows (user_id=auth.uid()).
IMPORTANT: Campus tables must have policies restricting rows to profile.university_id.

# Auth flow
We use Supabase Google OAuth. Implement:
- After Google login callback, create/ensure profiles row exists.
- Step 1 collects full_name + selected university_id and writes to profiles.
- verified remains false until auto-approval passes.

# Step 1 UI (signup)
Inputs:
- Full name
- (Email shown read-only from Google session OR skipped since Google OAuth)
Buttons:
- Continue -> saves full_name + university_id to profiles then routes to /verify

IMPORTANT:
University is selected on homepage and passed via query param ?uni=<uuid> to /signup.
Validate the uni exists.

# Step 2 UI (verify upload)
Upload front image only.
POST to /api/verify/upload (Next Route Handler):
- require Supabase session
- check profiles.verified=false
- attempt limit: max 3 attempts per 24h (query verification_requests created_at)
- upload image to Supabase Storage private bucket (e.g. bucket "id-cards")
- create verification_requests row status=pending with storage path
- trigger processing (see below)
Return: {request_id}

Then poll:
GET /api/verify/status?request_id=...
every 2 seconds and navigate to /verify/status when decided.

# Processing (auto-approve)
We are on Vercel, so no long-running workers. Implement processing as:
Option A (simple MVP): process inline in the upload route AFTER upload, but respond within reasonable time. If OCR is too slow, then:
Option B: create a second route /api/verify/process that is called immediately after upload (client or server action) and does the OCR/scoring.
Choose A if feasible; otherwise B.

OCR:
- Use a server-side OCR library or service already available in codebase. If none exists, implement a placeholder scoring with regex+keywords only BUT keep interfaces so OCR can be plugged in without refactor.
(Do NOT introduce new external paid services without approval.)

Scoring (0-100):
- if image quality fails (basic checks if available): reject
- reg_id extracted: +40
- reg_id matches any universities.reg_id_regex: +30
- university keyword or name_variants found: +20
- optional name similarity: +10
Decision:
- score >= universities.min_score => approve
- else reject

On approve:
- update profiles: verified=true, verified_at=now()
- store reg_id_hash (sha256) and reg_id_last4
- update verification_requests status approved, score, reasons, decided_at
On reject:
- update verification_requests rejected with reasons and decided_at

Image retention:
- keep path, but set a TODO to delete after 24-72h (can be a cron later). For now, at least don’t expose URLs.

# API routes (App Router route handlers)
Create:
- app/api/verify/upload/route.ts  (POST)
- app/api/verify/status/route.ts  (GET)

Security:
- status route must confirm request.user_id == auth.uid()
- never accept university_id from client; always read it from profiles.

# Tenant isolation helper (must be used)
Create server helper:
- lib/tenant.ts
  - getSessionUser()
  - requireVerifiedProfile()
  - getTenantUniversityId()
Use it in every campus data route:
- if not verified -> 403
- always filter by tenant university_id
Do NOT trust any client university_id.

# Deliverables
- New pages for Step 1/2/3 with matching style
- Supabase SQL migrations (tables + RLS policies)
- API routes upload/status
- Tenant isolation helper for campus routes
- No changes to homepage except navigation link to /signup?uni=...
