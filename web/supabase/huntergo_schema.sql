-- HunterGO schema for talent profiles, recruiter verification, opportunities, shortlists, invites, and pipeline tracking.
-- Apply after web/supabase/schema.sql so public.users exists.

create extension if not exists pgcrypto;

create table if not exists public.hunter_talent_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  headline text not null,
  summary text,
  target_roles text[] not null default '{}',
  open_to_types text[] not null default '{}',
  skills text[] not null default '{}',
  proof_links jsonb not null default '[]'::jsonb,
  resume_url text,
  portfolio_url text,
  preferred_locations text[] not null default '{}',
  discoverability text not null default 'private',
  contact_visibility text not null default 'hidden', 
  is_active boolean not null default false,
  admin_notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint hunter_talent_profiles_user_key unique (user_id),
  constraint hunter_talent_discoverability_check
    check (discoverability in ('private', 'lerengo_only', 'verified_recruiters', 'public_link')),
  constraint hunter_talent_contact_visibility_check
    check (contact_visibility in ('hidden', 'after_invite_acceptance', 'public_to_verified_recruiters')),
  constraint hunter_talent_active_requires_visibility
    check (is_active = false or discoverability <> 'private')
);

create table if not exists public.hunter_companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  website text not null,
  industry text,
  company_size text,
  description text,
  verification_status text not null default 'pending',
  reviewed_by uuid references public.users(id) on delete set null,
  reviewed_at timestamptz,
  admin_notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint hunter_companies_website_key unique (website),
  constraint hunter_companies_verification_check
    check (verification_status in ('pending', 'verified', 'rejected', 'suspended'))
);

create table if not exists public.hunter_recruiter_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  company_id uuid references public.hunter_companies(id) on delete set null,
  display_name text not null,
  work_email text not null,
  title text,
  hiring_intent text not null,
  verification_status text not null default 'pending',
  monthly_invite_quota integer not null default 20 check (monthly_invite_quota >= 0),
  invites_sent_this_month integer not null default 0 check (invites_sent_this_month >= 0),
  reviewed_by uuid references public.users(id) on delete set null,
  reviewed_at timestamptz,
  admin_notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint hunter_recruiter_profiles_user_key unique (user_id),
  constraint hunter_recruiter_profiles_email_key unique (work_email),
  constraint hunter_recruiter_verification_check
    check (verification_status in ('pending', 'verified', 'rejected', 'suspended')),
  constraint hunter_recruiter_invite_quota_check
    check (invites_sent_this_month <= monthly_invite_quota)
);

create table if not exists public.hunter_opportunities (
  id uuid primary key default gen_random_uuid(),
  recruiter_profile_id uuid not null references public.hunter_recruiter_profiles(id) on delete cascade,
  company_id uuid references public.hunter_companies(id) on delete set null,
  title text not null,
  opportunity_type text not null,
  description text not null,
  required_skills text[] not null default '{}',
  location_mode text not null default 'remote',
  location_label text,
  compensation_label text,
  status text not null default 'draft',
  reviewed_by uuid references public.users(id) on delete set null,
  reviewed_at timestamptz,
  admin_notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint hunter_opportunities_status_check
    check (status in ('draft', 'pending_review', 'published', 'paused', 'closed', 'archived')),
  constraint hunter_opportunities_location_mode_check
    check (location_mode in ('remote', 'hybrid', 'onsite'))
);

create table if not exists public.hunter_shortlists (
  id uuid primary key default gen_random_uuid(),
  recruiter_profile_id uuid not null references public.hunter_recruiter_profiles(id) on delete cascade,
  talent_profile_id uuid not null references public.hunter_talent_profiles(id) on delete cascade,
  private_notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint hunter_shortlists_unique_key unique (recruiter_profile_id, talent_profile_id)
);

create table if not exists public.hunter_invites (
  id uuid primary key default gen_random_uuid(),
  recruiter_profile_id uuid not null references public.hunter_recruiter_profiles(id) on delete cascade,
  talent_profile_id uuid not null references public.hunter_talent_profiles(id) on delete cascade,
  opportunity_id uuid references public.hunter_opportunities(id) on delete set null,
  message text not null,
  status text not null default 'sent',
  candidate_visible_note text,
  recruiter_private_note text,
  expires_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint hunter_invites_status_check
    check (status in ('sent', 'viewed', 'accepted', 'declined', 'expired', 'withdrawn'))
);

create table if not exists public.hunter_pipeline_items (
  id uuid primary key default gen_random_uuid(),
  recruiter_profile_id uuid not null references public.hunter_recruiter_profiles(id) on delete cascade,
  talent_profile_id uuid not null references public.hunter_talent_profiles(id) on delete cascade,
  opportunity_id uuid references public.hunter_opportunities(id) on delete set null,
  invite_id uuid references public.hunter_invites(id) on delete set null,
  stage text not null default 'invited',
  candidate_visible_status text,
  recruiter_private_notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint hunter_pipeline_stage_check
    check (stage in ('invited', 'interested', 'applied', 'screening', 'interview', 'offer', 'hired', 'rejected', 'withdrawn'))
);

create table if not exists public.hunter_audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references public.users(id) on delete set null,
  target_type text not null,
  target_id uuid,
  action text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists hunter_talent_public_idx
  on public.hunter_talent_profiles (is_active, discoverability, updated_at desc);
create index if not exists hunter_talent_user_idx
  on public.hunter_talent_profiles (user_id);
create index if not exists hunter_recruiter_status_idx
  on public.hunter_recruiter_profiles (verification_status, updated_at desc);
create index if not exists hunter_recruiter_user_idx
  on public.hunter_recruiter_profiles (user_id);
create index if not exists hunter_company_status_idx
  on public.hunter_companies (verification_status, updated_at desc);
create index if not exists hunter_opportunity_status_idx
  on public.hunter_opportunities (status, updated_at desc);
create index if not exists hunter_opportunity_recruiter_idx
  on public.hunter_opportunities (recruiter_profile_id, status, updated_at desc);
create index if not exists hunter_shortlists_recruiter_idx
  on public.hunter_shortlists (recruiter_profile_id, created_at desc);
create index if not exists hunter_invites_talent_idx
  on public.hunter_invites (talent_profile_id, status, created_at desc);
create index if not exists hunter_invites_recruiter_idx
  on public.hunter_invites (recruiter_profile_id, status, created_at desc);
create index if not exists hunter_pipeline_opportunity_idx
  on public.hunter_pipeline_items (opportunity_id, stage, updated_at desc);

alter table public.hunter_talent_profiles enable row level security;
alter table public.hunter_companies enable row level security;
alter table public.hunter_recruiter_profiles enable row level security;
alter table public.hunter_opportunities enable row level security;
alter table public.hunter_shortlists enable row level security;
alter table public.hunter_invites enable row level security;
alter table public.hunter_pipeline_items enable row level security;
alter table public.hunter_audit_events enable row level security;

drop policy if exists "students can manage own talent profile" on public.hunter_talent_profiles;
create policy "students can manage own talent profile"
  on public.hunter_talent_profiles for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "verified recruiters can read discoverable talent" on public.hunter_talent_profiles;
create policy "verified recruiters can read discoverable talent"
  on public.hunter_talent_profiles for select
  to authenticated
  using (
    is_active = true
    and discoverability in ('verified_recruiters', 'public_link')
    and exists (
      select 1 from public.hunter_recruiter_profiles
      where hunter_recruiter_profiles.user_id = auth.uid()
        and hunter_recruiter_profiles.verification_status = 'verified'
    )
  );

drop policy if exists "company profiles are readable to verified recruiters" on public.hunter_companies;
create policy "company profiles are readable to verified recruiters"
  on public.hunter_companies for select
  to authenticated
  using (
    verification_status = 'verified'
    or exists (
      select 1 from public.hunter_recruiter_profiles
      where hunter_recruiter_profiles.user_id = auth.uid()
        and hunter_recruiter_profiles.company_id = hunter_companies.id
    )
    or exists (select 1 from public.users where users.id = auth.uid() and users.role = 'admin' and users.verified = true)
  );

drop policy if exists "recruiters can read own recruiter profile" on public.hunter_recruiter_profiles;
create policy "recruiters can read own recruiter profile"
  on public.hunter_recruiter_profiles for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "recruiters can insert own recruiter profile" on public.hunter_recruiter_profiles;
create policy "recruiters can insert own recruiter profile"
  on public.hunter_recruiter_profiles for insert
  to authenticated
  with check (auth.uid() = user_id and verification_status = 'pending');

drop policy if exists "published opportunities are readable" on public.hunter_opportunities;
create policy "published opportunities are readable"
  on public.hunter_opportunities for select
  using (status = 'published');

drop policy if exists "verified recruiters manage own opportunities" on public.hunter_opportunities;
drop policy if exists "verified recruiters read own opportunities" on public.hunter_opportunities;
create policy "verified recruiters read own opportunities"
  on public.hunter_opportunities for select
  to authenticated
  using (
    exists (
      select 1 from public.hunter_recruiter_profiles
      where hunter_recruiter_profiles.id = hunter_opportunities.recruiter_profile_id
        and hunter_recruiter_profiles.user_id = auth.uid()
        and hunter_recruiter_profiles.verification_status = 'verified'
    )
  );

drop policy if exists "verified recruiters create draft opportunities" on public.hunter_opportunities;
create policy "verified recruiters create draft opportunities"
  on public.hunter_opportunities for insert
  to authenticated
  with check (
    status in ('draft', 'pending_review')
    and exists (
      select 1 from public.hunter_companies
      where hunter_companies.id = hunter_opportunities.company_id
        and hunter_companies.verification_status = 'verified'
    )
    and exists (
      select 1 from public.hunter_recruiter_profiles
      where hunter_recruiter_profiles.id = hunter_opportunities.recruiter_profile_id
        and hunter_recruiter_profiles.user_id = auth.uid()
        and hunter_recruiter_profiles.verification_status = 'verified'
    )
  );

drop policy if exists "verified recruiters update nonpublished own opportunities" on public.hunter_opportunities;
create policy "verified recruiters update nonpublished own opportunities"
  on public.hunter_opportunities for update
  to authenticated
  using (
    exists (
      select 1 from public.hunter_recruiter_profiles
      where hunter_recruiter_profiles.id = hunter_opportunities.recruiter_profile_id
        and hunter_recruiter_profiles.user_id = auth.uid()
        and hunter_recruiter_profiles.verification_status = 'verified'
    )
    and status in ('draft', 'pending_review', 'paused')
  )
  with check (
    status in ('draft', 'pending_review')
    and exists (
      select 1 from public.hunter_recruiter_profiles
      where hunter_recruiter_profiles.id = hunter_opportunities.recruiter_profile_id
        and hunter_recruiter_profiles.user_id = auth.uid()
        and hunter_recruiter_profiles.verification_status = 'verified'
    )
  );

drop policy if exists "verified recruiters manage own shortlists" on public.hunter_shortlists;
create policy "verified recruiters manage own shortlists"
  on public.hunter_shortlists for all
  to authenticated
  using (exists (select 1 from public.hunter_recruiter_profiles where hunter_recruiter_profiles.id = hunter_shortlists.recruiter_profile_id and hunter_recruiter_profiles.user_id = auth.uid() and hunter_recruiter_profiles.verification_status = 'verified'))
  with check (
    exists (select 1 from public.hunter_recruiter_profiles where hunter_recruiter_profiles.id = hunter_shortlists.recruiter_profile_id and hunter_recruiter_profiles.user_id = auth.uid() and hunter_recruiter_profiles.verification_status = 'verified')
    and exists (
      select 1 from public.hunter_talent_profiles
      where hunter_talent_profiles.id = hunter_shortlists.talent_profile_id
        and hunter_talent_profiles.is_active = true
        and hunter_talent_profiles.discoverability in ('verified_recruiters', 'public_link')
    )
  );

drop policy if exists "invite participants can read invites" on public.hunter_invites;
create policy "invite participants can read invites"
  on public.hunter_invites for select
  to authenticated
  using (
    exists (select 1 from public.hunter_recruiter_profiles where hunter_recruiter_profiles.id = hunter_invites.recruiter_profile_id and hunter_recruiter_profiles.user_id = auth.uid())
    or exists (select 1 from public.hunter_talent_profiles where hunter_talent_profiles.id = hunter_invites.talent_profile_id and hunter_talent_profiles.user_id = auth.uid())
    or exists (select 1 from public.users where users.id = auth.uid() and users.role = 'admin' and users.verified = true)
  );

drop policy if exists "verified recruiters create invites" on public.hunter_invites;
create policy "verified recruiters create invites"
  on public.hunter_invites for insert
  to authenticated
  with check (
    status = 'sent'
    and exists (
      select 1 from public.hunter_recruiter_profiles
      where hunter_recruiter_profiles.id = hunter_invites.recruiter_profile_id
        and hunter_recruiter_profiles.user_id = auth.uid()
        and hunter_recruiter_profiles.verification_status = 'verified'
        and hunter_recruiter_profiles.invites_sent_this_month < hunter_recruiter_profiles.monthly_invite_quota
    )
    and exists (
      select 1 from public.hunter_talent_profiles
      where hunter_talent_profiles.id = hunter_invites.talent_profile_id
        and hunter_talent_profiles.is_active = true
        and hunter_talent_profiles.discoverability in ('verified_recruiters', 'public_link')
    )
  );

drop policy if exists "pipeline participants can read pipeline" on public.hunter_pipeline_items;
create policy "pipeline participants can read pipeline"
  on public.hunter_pipeline_items for select
  to authenticated
  using (
    exists (select 1 from public.hunter_recruiter_profiles where hunter_recruiter_profiles.id = hunter_pipeline_items.recruiter_profile_id and hunter_recruiter_profiles.user_id = auth.uid())
    or exists (select 1 from public.hunter_talent_profiles where hunter_talent_profiles.id = hunter_pipeline_items.talent_profile_id and hunter_talent_profiles.user_id = auth.uid())
    or exists (select 1 from public.users where users.id = auth.uid() and users.role = 'admin' and users.verified = true)
  );

drop policy if exists "verified recruiters manage own pipeline" on public.hunter_pipeline_items;
create policy "verified recruiters manage own pipeline"
  on public.hunter_pipeline_items for all
  to authenticated
  using (
    exists (
      select 1 from public.hunter_recruiter_profiles
      where hunter_recruiter_profiles.id = hunter_pipeline_items.recruiter_profile_id
        and hunter_recruiter_profiles.user_id = auth.uid()
        and hunter_recruiter_profiles.verification_status = 'verified'
    )
  )
  with check (
    exists (
      select 1 from public.hunter_recruiter_profiles
      where hunter_recruiter_profiles.id = hunter_pipeline_items.recruiter_profile_id
        and hunter_recruiter_profiles.user_id = auth.uid()
        and hunter_recruiter_profiles.verification_status = 'verified'
    )
  );

drop policy if exists "admins can manage hunter and mentor trust records" on public.hunter_audit_events;
create policy "admins can manage hunter and mentor trust records"
  on public.hunter_audit_events for all
  to authenticated
  using (exists (select 1 from public.users where users.id = auth.uid() and users.role = 'admin' and users.verified = true))
  with check (exists (select 1 from public.users where users.id = auth.uid() and users.role = 'admin' and users.verified = true));

drop policy if exists "admins can manage hunter companies" on public.hunter_companies;
create policy "admins can manage hunter companies"
  on public.hunter_companies for all
  to authenticated
  using (exists (select 1 from public.users where users.id = auth.uid() and users.role = 'admin' and users.verified = true))
  with check (exists (select 1 from public.users where users.id = auth.uid() and users.role = 'admin' and users.verified = true));

drop policy if exists "admins can manage hunter recruiters" on public.hunter_recruiter_profiles;
create policy "admins can manage hunter recruiters"
  on public.hunter_recruiter_profiles for all
  to authenticated
  using (exists (select 1 from public.users where users.id = auth.uid() and users.role = 'admin' and users.verified = true))
  with check (exists (select 1 from public.users where users.id = auth.uid() and users.role = 'admin' and users.verified = true));

drop policy if exists "admins can manage hunter opportunities" on public.hunter_opportunities;
create policy "admins can manage hunter opportunities"
  on public.hunter_opportunities for all
  to authenticated
  using (exists (select 1 from public.users where users.id = auth.uid() and users.role = 'admin' and users.verified = true))
  with check (exists (select 1 from public.users where users.id = auth.uid() and users.role = 'admin' and users.verified = true));

drop policy if exists "admins can manage hunter talent" on public.hunter_talent_profiles;
create policy "admins can manage hunter talent"
  on public.hunter_talent_profiles for all
  to authenticated
  using (exists (select 1 from public.users where users.id = auth.uid() and users.role = 'admin' and users.verified = true))
  with check (exists (select 1 from public.users where users.id = auth.uid() and users.role = 'admin' and users.verified = true));
