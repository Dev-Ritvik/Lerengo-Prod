-- MentorGO schema for mentor profiles, session types, availability, bookings, and reviews.
-- Apply after web/supabase/schema.sql so public.users exists.

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
  constraint mentor_profiles_review_count_check check (review_count >= 0),
  constraint mentor_profiles_starting_price_check check (starting_price is null or starting_price >= 0),
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
    check (booking_status in ('draft', 'pending_payment', 'payment_failed', 'pending_mentor_approval', 'confirmed', 'reschedule_requested', 'cancelled_by_student', 'cancelled_by_mentor', 'completed', 'no_show', 'refunded', 'disputed')),
  constraint mentor_bookings_payout_check
    check (mentor_payout_amount <= price_amount and platform_fee_amount <= price_amount)
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

create index if not exists mentor_profiles_public_idx
  on public.mentor_profiles (verification_status, is_published, updated_at desc);
create index if not exists mentor_profiles_user_idx
  on public.mentor_profiles (user_id);
create index if not exists mentor_session_types_profile_idx
  on public.mentor_session_types (mentor_profile_id, is_active, price_amount);
create index if not exists mentor_availability_profile_idx
  on public.mentor_availability_rules (mentor_profile_id, is_active, day_of_week);
create index if not exists mentor_blocked_times_profile_idx
  on public.mentor_blocked_times (mentor_profile_id, start_at desc);
create index if not exists mentor_bookings_student_idx
  on public.mentor_bookings (student_user_id, start_at desc);
create index if not exists mentor_bookings_mentor_idx
  on public.mentor_bookings (mentor_profile_id, booking_status, start_at desc);
create index if not exists mentor_reviews_profile_public_idx
  on public.mentor_reviews (mentor_profile_id, is_public, moderation_status, created_at desc);

alter table public.mentor_profiles enable row level security;
alter table public.mentor_session_types enable row level security;
alter table public.mentor_availability_rules enable row level security;
alter table public.mentor_blocked_times enable row level security;
alter table public.mentor_bookings enable row level security;
alter table public.mentor_reviews enable row level security;

drop policy if exists "approved published mentor profiles are readable" on public.mentor_profiles;
create policy "approved published mentor profiles are readable"
  on public.mentor_profiles for select
  using (verification_status = 'approved' and is_published = true);

drop policy if exists "mentors can read own mentor profile" on public.mentor_profiles;
create policy "mentors can read own mentor profile"
  on public.mentor_profiles for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "mentors can manage own draft mentor profile" on public.mentor_profiles;
create policy "mentors can manage own draft mentor profile"
  on public.mentor_profiles for all
  to authenticated
  using (auth.uid() = user_id and verification_status <> 'suspended')
  with check (auth.uid() = user_id and verification_status in ('draft', 'submitted'));

drop policy if exists "admins can manage mentor profiles" on public.mentor_profiles;
create policy "admins can manage mentor profiles"
  on public.mentor_profiles for all
  to authenticated
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
  to authenticated
  using (exists (select 1 from public.mentor_profiles where mentor_profiles.id = mentor_session_types.mentor_profile_id and mentor_profiles.user_id = auth.uid()))
  with check (exists (select 1 from public.mentor_profiles where mentor_profiles.id = mentor_session_types.mentor_profile_id and mentor_profiles.user_id = auth.uid()));

drop policy if exists "mentor owners manage availability" on public.mentor_availability_rules;
create policy "mentor owners manage availability"
  on public.mentor_availability_rules for all
  to authenticated
  using (exists (select 1 from public.mentor_profiles where mentor_profiles.id = mentor_availability_rules.mentor_profile_id and mentor_profiles.user_id = auth.uid()))
  with check (exists (select 1 from public.mentor_profiles where mentor_profiles.id = mentor_availability_rules.mentor_profile_id and mentor_profiles.user_id = auth.uid()));

drop policy if exists "mentor owners manage blocked time" on public.mentor_blocked_times;
create policy "mentor owners manage blocked time"
  on public.mentor_blocked_times for all
  to authenticated
  using (exists (select 1 from public.mentor_profiles where mentor_profiles.id = mentor_blocked_times.mentor_profile_id and mentor_profiles.user_id = auth.uid()))
  with check (exists (select 1 from public.mentor_profiles where mentor_profiles.id = mentor_blocked_times.mentor_profile_id and mentor_profiles.user_id = auth.uid()));

drop policy if exists "booking parties can read mentor bookings" on public.mentor_bookings;
create policy "booking parties can read mentor bookings"
  on public.mentor_bookings for select
  to authenticated
  using (
    auth.uid() = student_user_id
    or exists (select 1 from public.mentor_profiles where mentor_profiles.id = mentor_bookings.mentor_profile_id and mentor_profiles.user_id = auth.uid())
    or exists (select 1 from public.users where users.id = auth.uid() and users.role = 'admin' and users.verified = true)
  );

drop policy if exists "students can insert own mentor bookings" on public.mentor_bookings;
create policy "students can insert own mentor bookings"
  on public.mentor_bookings for insert
  to authenticated
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
  to authenticated
  using (exists (select 1 from public.users where users.id = auth.uid() and users.role = 'admin' and users.verified = true))
  with check (exists (select 1 from public.users where users.id = auth.uid() and users.role = 'admin' and users.verified = true));

drop policy if exists "public approved mentor reviews are readable" on public.mentor_reviews;
create policy "public approved mentor reviews are readable"
  on public.mentor_reviews for select
  using (is_public = true and moderation_status = 'approved');

drop policy if exists "review owners can insert mentor reviews" on public.mentor_reviews;
create policy "review owners can insert mentor reviews"
  on public.mentor_reviews for insert
  to authenticated
  with check (
    auth.uid() = student_user_id
    and exists (
      select 1
      from public.mentor_bookings
      where mentor_bookings.id = mentor_reviews.booking_id
        and mentor_bookings.student_user_id = auth.uid()
        and mentor_bookings.mentor_profile_id = mentor_reviews.mentor_profile_id
        and mentor_bookings.booking_status = 'completed'
    )
  );

drop policy if exists "admins can manage mentor reviews" on public.mentor_reviews;
create policy "admins can manage mentor reviews"
  on public.mentor_reviews for all
  to authenticated
  using (exists (select 1 from public.users where users.id = auth.uid() and users.role = 'admin' and users.verified = true))
  with check (exists (select 1 from public.users where users.id = auth.uid() and users.role = 'admin' and users.verified = true));
