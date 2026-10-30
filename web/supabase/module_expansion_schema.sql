create extension if not exists pgcrypto;
create extension if not exists btree_gist;

create table if not exists public.mentor_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  slug text not null unique,
  display_name text not null,
  profile_image_url text,
  headline text not null,
  affiliation text,
  mentor_type text not null default 'other',
  short_bio text not null,
  long_bio text not null,
  expertise_tags text[] not null default '{}',
  skills text[] not null default '{}',
  industries text[] not null default '{}',
  languages text[] not null default '{}',
  timezone text not null default 'Asia/Kolkata',
  country text,
  city text,
  social_links jsonb not null default '{}'::jsonb,
  credentials jsonb not null default '{}'::jsonb,
  verification_status text not null default 'draft',
  is_published boolean not null default false,
  average_rating numeric(3,2),
  review_count integer not null default 0,
  starting_price integer,
  admin_notes text,
  reviewed_by uuid references public.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint mentor_profiles_user_key unique (user_id),
  constraint mentor_profiles_type_check
    check (mentor_type in ('industry_expert', 'faculty', 'alumni', 'senior_student', 'founder', 'operator', 'other')),
  constraint mentor_profiles_verification_check
    check (verification_status in ('draft', 'submitted', 'approved', 'rejected', 'suspended')),
  constraint mentor_profiles_rating_check
    check (average_rating is null or (average_rating >= 0 and average_rating <= 5)),
  constraint mentor_profiles_publish_requires_approval
    check (is_published = false or verification_status = 'approved')
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'mentor_profiles_review_count_check'
  ) then
    alter table public.mentor_profiles
      add constraint mentor_profiles_review_count_check check (review_count >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'mentor_profiles_starting_price_check'
  ) then
    alter table public.mentor_profiles
      add constraint mentor_profiles_starting_price_check check (starting_price is null or starting_price >= 0);
  end if;
end $$;

create table if not exists public.mentor_session_types (
  id uuid primary key default gen_random_uuid(),
  mentor_profile_id uuid not null references public.mentor_profiles(id) on delete cascade,
  title text not null,
  description text not null,
  duration_minutes integer not null check (duration_minutes in (30, 45, 60, 90, 120)),
  price_amount integer not null check (price_amount >= 0),
  currency text not null default 'INR',
  outcomes text[] not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.mentor_availability_rules (
  id uuid primary key default gen_random_uuid(),
  mentor_profile_id uuid not null references public.mentor_profiles(id) on delete cascade,
  day_of_week integer check (day_of_week between 0 and 6),
  start_time_local time not null,
  end_time_local time not null,
  timezone text not null default 'Asia/Kolkata',
  is_recurring boolean not null default true,
  specific_date date,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint mentor_availability_time_check check (end_time_local > start_time_local),
  constraint mentor_availability_specific_date_check
    check ((is_recurring = true and specific_date is null) or (is_recurring = false and specific_date is not null))
);

create table if not exists public.mentor_blocked_times (
  id uuid primary key default gen_random_uuid(),
  mentor_profile_id uuid not null references public.mentor_profiles(id) on delete cascade,
  start_at timestamptz not null,
  end_at timestamptz not null,
  reason text,
  created_at timestamptz not null default timezone('utc', now()),
  constraint mentor_blocked_times_range_check check (end_at > start_at)
);

create table if not exists public.mentor_bookings (
  id uuid primary key default gen_random_uuid(),
  student_user_id uuid not null references public.users(id) on delete cascade,
  mentor_profile_id uuid not null references public.mentor_profiles(id) on delete cascade,
  session_type_id uuid references public.mentor_session_types(id) on delete set null,
  start_at timestamptz not null,
  end_at timestamptz not null,
  timezone_snapshot text not null default 'Asia/Kolkata',
  session_goal text not null,
  student_context text,
  meeting_link text,
  price_amount integer not null check (price_amount >= 0),
  platform_fee_amount integer not null default 0 check (platform_fee_amount >= 0),
  mentor_payout_amount integer not null default 0 check (mentor_payout_amount >= 0),
  currency text not null default 'INR',
  payment_provider text not null default 'manual',
  payment_reference text,
  payment_status text not null default 'pending',
  booking_status text not null default 'pending_payment',
  cancellation_reason text,
  admin_notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint mentor_bookings_range_check check (end_at > start_at),
  constraint mentor_bookings_payment_status_check
    check (payment_status in ('not_required', 'pending', 'paid', 'failed', 'refunded', 'partial_refund')),
  constraint mentor_bookings_status_check
    check (booking_status in ('draft', 'pending_payment', 'payment_failed', 'pending_mentor_approval', 'confirmed', 'reschedule_requested', 'cancelled_by_student', 'cancelled_by_mentor', 'completed', 'no_show', 'refunded', 'disputed'))
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'mentor_bookings_payout_check'
  ) then
    alter table public.mentor_bookings
      add constraint mentor_bookings_payout_check
      check (mentor_payout_amount <= price_amount and platform_fee_amount <= price_amount);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'mentor_bookings_no_active_overlap'
  ) then
    alter table public.mentor_bookings
      add constraint mentor_bookings_no_active_overlap
      exclude using gist (
        mentor_profile_id with =,
        tstzrange(start_at, end_at, '[)') with &&
      )
      where (booking_status in ('pending_mentor_approval', 'confirmed'));
  end if;
end $$;

create table if not exists public.mentor_reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.mentor_bookings(id) on delete cascade,
  mentor_profile_id uuid not null references public.mentor_profiles(id) on delete cascade,
  student_user_id uuid not null references public.users(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  body text,
  is_public boolean not null default false,
  moderation_status text not null default 'pending',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint mentor_reviews_booking_key unique (booking_id),
  constraint mentor_reviews_moderation_check
    check (moderation_status in ('pending', 'approved', 'rejected', 'hidden'))
);

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

create index if not exists mentor_profiles_public_idx
  on public.mentor_profiles (verification_status, is_published, updated_at desc);
create index if not exists mentor_profiles_user_idx
  on public.mentor_profiles (user_id);
create index if not exists mentor_bookings_student_idx
  on public.mentor_bookings (student_user_id, start_at desc);
create index if not exists mentor_bookings_mentor_idx
  on public.mentor_bookings (mentor_profile_id, booking_status, start_at desc);
create index if not exists hunter_talent_public_idx
  on public.hunter_talent_profiles (is_active, discoverability, updated_at desc);
create index if not exists hunter_recruiter_status_idx
  on public.hunter_recruiter_profiles (verification_status, updated_at desc);
create index if not exists hunter_company_status_idx
  on public.hunter_companies (verification_status, updated_at desc);
create index if not exists hunter_opportunity_status_idx
  on public.hunter_opportunities (status, updated_at desc);

alter table public.mentor_profiles enable row level security;
alter table public.mentor_session_types enable row level security;
alter table public.mentor_availability_rules enable row level security;
alter table public.mentor_blocked_times enable row level security;
alter table public.mentor_bookings enable row level security;
alter table public.mentor_reviews enable row level security;
alter table public.hunter_talent_profiles enable row level security;
alter table public.hunter_companies enable row level security;
alter table public.hunter_recruiter_profiles enable row level security;
alter table public.hunter_opportunities enable row level security;
alter table public.hunter_shortlists enable row level security;
alter table public.hunter_invites enable row level security;
alter table public.hunter_pipeline_items enable row level security;
alter table public.hunter_audit_events enable row level security;

drop policy if exists "approved published mentor profiles are readable" on public.mentor_profiles;
create policy "approved published mentor profiles are readable"
  on public.mentor_profiles for select
  using (verification_status = 'approved' and is_published = true);

drop policy if exists "mentors can read own mentor profile" on public.mentor_profiles;
create policy "mentors can read own mentor profile"
  on public.mentor_profiles for select
  using (auth.uid() = user_id);

drop policy if exists "mentors can manage own draft mentor profile" on public.mentor_profiles;
create policy "mentors can manage own draft mentor profile"
  on public.mentor_profiles for all
  using (auth.uid() = user_id and verification_status <> 'suspended')
  with check (auth.uid() = user_id and verification_status in ('draft', 'submitted'));

drop policy if exists "admins can manage mentor profiles" on public.mentor_profiles;
create policy "admins can manage mentor profiles"
  on public.mentor_profiles for all
  using (exists (select 1 from public.users where users.id = auth.uid() and users.role = 'admin' and users.verified = true))
  with check (exists (select 1 from public.users where users.id = auth.uid() and users.role = 'admin' and users.verified = true));

drop policy if exists "published mentor session types are readable" on public.mentor_session_types;
create policy "published mentor session types are readable"
  on public.mentor_session_types for select
  using (
    is_active = true and exists (
      select 1 from public.mentor_profiles
      where mentor_profiles.id = mentor_session_types.mentor_profile_id
        and mentor_profiles.verification_status = 'approved'
        and mentor_profiles.is_published = true
    )
  );

drop policy if exists "mentor owners manage session types" on public.mentor_session_types;
create policy "mentor owners manage session types"
  on public.mentor_session_types for all
  using (exists (select 1 from public.mentor_profiles where mentor_profiles.id = mentor_session_types.mentor_profile_id and mentor_profiles.user_id = auth.uid()))
  with check (exists (select 1 from public.mentor_profiles where mentor_profiles.id = mentor_session_types.mentor_profile_id and mentor_profiles.user_id = auth.uid()));

drop policy if exists "mentor owners manage availability" on public.mentor_availability_rules;
create policy "mentor owners manage availability"
  on public.mentor_availability_rules for all
  using (exists (select 1 from public.mentor_profiles where mentor_profiles.id = mentor_availability_rules.mentor_profile_id and mentor_profiles.user_id = auth.uid()))
  with check (exists (select 1 from public.mentor_profiles where mentor_profiles.id = mentor_availability_rules.mentor_profile_id and mentor_profiles.user_id = auth.uid()));

drop policy if exists "mentor owners manage blocked time" on public.mentor_blocked_times;
create policy "mentor owners manage blocked time"
  on public.mentor_blocked_times for all
  using (exists (select 1 from public.mentor_profiles where mentor_profiles.id = mentor_blocked_times.mentor_profile_id and mentor_profiles.user_id = auth.uid()))
  with check (exists (select 1 from public.mentor_profiles where mentor_profiles.id = mentor_blocked_times.mentor_profile_id and mentor_profiles.user_id = auth.uid()));

drop policy if exists "booking parties can read mentor bookings" on public.mentor_bookings;
create policy "booking parties can read mentor bookings"
  on public.mentor_bookings for select
  using (
    auth.uid() = student_user_id
    or exists (select 1 from public.mentor_profiles where mentor_profiles.id = mentor_bookings.mentor_profile_id and mentor_profiles.user_id = auth.uid())
    or exists (select 1 from public.users where users.id = auth.uid() and users.role = 'admin' and users.verified = true)
  );

drop policy if exists "students can insert own mentor bookings" on public.mentor_bookings;
create policy "students can insert own mentor bookings"
  on public.mentor_bookings for insert
  with check (
    auth.uid() = student_user_id
    and booking_status = 'pending_payment'
    and payment_status = 'pending'
    and exists (
      select 1
      from public.mentor_profiles
      where mentor_profiles.id = mentor_bookings.mentor_profile_id
        and mentor_profiles.verification_status = 'approved'
        and mentor_profiles.is_published = true
    )
    and exists (
      select 1
      from public.mentor_session_types
      where mentor_session_types.id = mentor_bookings.session_type_id
        and mentor_session_types.mentor_profile_id = mentor_bookings.mentor_profile_id
        and mentor_session_types.is_active = true
        and mentor_session_types.price_amount = mentor_bookings.price_amount
        and mentor_session_types.currency = mentor_bookings.currency
    )
  );

drop policy if exists "booking parties can update mentor bookings" on public.mentor_bookings;
drop policy if exists "admins can update mentor bookings" on public.mentor_bookings;
create policy "admins can update mentor bookings"
  on public.mentor_bookings for update
  using (exists (select 1 from public.users where users.id = auth.uid() and users.role = 'admin' and users.verified = true))
  with check (exists (select 1 from public.users where users.id = auth.uid() and users.role = 'admin' and users.verified = true));

drop policy if exists "public approved mentor reviews are readable" on public.mentor_reviews;
create policy "public approved mentor reviews are readable"
  on public.mentor_reviews for select
  using (is_public = true and moderation_status = 'approved');

drop policy if exists "review owners can insert mentor reviews" on public.mentor_reviews;
create policy "review owners can insert mentor reviews"
  on public.mentor_reviews for insert
  with check (auth.uid() = student_user_id);

drop policy if exists "students can manage own talent profile" on public.hunter_talent_profiles;
create policy "students can manage own talent profile"
  on public.hunter_talent_profiles for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "verified recruiters can read discoverable talent" on public.hunter_talent_profiles;
create policy "verified recruiters can read discoverable talent"
  on public.hunter_talent_profiles for select
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
  using (auth.uid() = user_id);

drop policy if exists "recruiters can insert own recruiter profile" on public.hunter_recruiter_profiles;
create policy "recruiters can insert own recruiter profile"
  on public.hunter_recruiter_profiles for insert
  with check (auth.uid() = user_id);

drop policy if exists "published opportunities are readable" on public.hunter_opportunities;
create policy "published opportunities are readable"
  on public.hunter_opportunities for select
  using (status = 'published');

drop policy if exists "verified recruiters manage own opportunities" on public.hunter_opportunities;
drop policy if exists "verified recruiters read own opportunities" on public.hunter_opportunities;
create policy "verified recruiters read own opportunities"
  on public.hunter_opportunities for select
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
  using (
    exists (select 1 from public.hunter_recruiter_profiles where hunter_recruiter_profiles.id = hunter_invites.recruiter_profile_id and hunter_recruiter_profiles.user_id = auth.uid())
    or exists (select 1 from public.hunter_talent_profiles where hunter_talent_profiles.id = hunter_invites.talent_profile_id and hunter_talent_profiles.user_id = auth.uid())
    or exists (select 1 from public.users where users.id = auth.uid() and users.role = 'admin' and users.verified = true)
  );

drop policy if exists "pipeline participants can read pipeline" on public.hunter_pipeline_items;
create policy "pipeline participants can read pipeline"
  on public.hunter_pipeline_items for select
  using (
    exists (select 1 from public.hunter_recruiter_profiles where hunter_recruiter_profiles.id = hunter_pipeline_items.recruiter_profile_id and hunter_recruiter_profiles.user_id = auth.uid())
    or exists (select 1 from public.hunter_talent_profiles where hunter_talent_profiles.id = hunter_pipeline_items.talent_profile_id and hunter_talent_profiles.user_id = auth.uid())
    or exists (select 1 from public.users where users.id = auth.uid() and users.role = 'admin' and users.verified = true)
  );

drop policy if exists "admins can manage hunter and mentor trust records" on public.hunter_audit_events;
create policy "admins can manage hunter and mentor trust records"
  on public.hunter_audit_events for all
  using (exists (select 1 from public.users where users.id = auth.uid() and users.role = 'admin' and users.verified = true))
  with check (exists (select 1 from public.users where users.id = auth.uid() and users.role = 'admin' and users.verified = true));

drop policy if exists "admins can manage hunter companies" on public.hunter_companies;
create policy "admins can manage hunter companies"
  on public.hunter_companies for all
  using (exists (select 1 from public.users where users.id = auth.uid() and users.role = 'admin' and users.verified = true))
  with check (exists (select 1 from public.users where users.id = auth.uid() and users.role = 'admin' and users.verified = true));

drop policy if exists "admins can manage hunter recruiters" on public.hunter_recruiter_profiles;
create policy "admins can manage hunter recruiters"
  on public.hunter_recruiter_profiles for all
  using (exists (select 1 from public.users where users.id = auth.uid() and users.role = 'admin' and users.verified = true))
  with check (exists (select 1 from public.users where users.id = auth.uid() and users.role = 'admin' and users.verified = true));

drop policy if exists "admins can manage hunter opportunities" on public.hunter_opportunities;
create policy "admins can manage hunter opportunities"
  on public.hunter_opportunities for all
  using (exists (select 1 from public.users where users.id = auth.uid() and users.role = 'admin' and users.verified = true))
  with check (exists (select 1 from public.users where users.id = auth.uid() and users.role = 'admin' and users.verified = true));

drop policy if exists "admins can manage hunter talent" on public.hunter_talent_profiles;
create policy "admins can manage hunter talent"
  on public.hunter_talent_profiles for all
  using (exists (select 1 from public.users where users.id = auth.uid() and users.role = 'admin' and users.verified = true))
  with check (exists (select 1 from public.users where users.id = auth.uid() and users.role = 'admin' and users.verified = true));
