-- Superadmin schema for LerenGO.
--
-- Adds a platform-wide "superadmin" role that can control anything and everything
-- across every campus and every module, without being scoped to a single university.
--
-- The existing "admin" role stays campus-scoped and untouched. The superadmin role is
-- additive: it grants full read/write on every table via RLS, plus the ability to ban
-- users, change roles, and moderate mentors/courses across the whole platform.
--
-- Apply AFTER web/supabase/schema.sql (and, ideally, the module schemas: courses_schema.sql,
-- labs_schema.sql, mentorgo_schema.sql, huntergo_schema.sql, campus_weekly_schema.sql).
-- Safe to re-run.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- 1. Extend the users.role check constraint to allow 'superadmin'.
-- ---------------------------------------------------------------------------
do $$
declare
  constraint_name text;
begin
  select con.conname
    into constraint_name
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  join pg_namespace nsp on nsp.oid = rel.relnamespace
  where nsp.nspname = 'public'
    and rel.relname = 'users'
    and con.contype = 'c'
    and pg_get_constraintdef(con.oid) ilike '%role%'
  limit 1;

  if constraint_name is not null then
    execute format('alter table public.users drop constraint %I', constraint_name);
  end if;

  alter table public.users
    add constraint users_role_check
    check (role in ('user', 'senior', 'admin', 'superadmin'));
end $$;

-- ---------------------------------------------------------------------------
-- 2. Ban / suspension columns on users (there was no ban concept before).
-- ---------------------------------------------------------------------------
alter table if exists public.users
  add column if not exists is_banned boolean not null default false,
  add column if not exists banned_at timestamptz,
  add column if not exists banned_reason text,
  add column if not exists banned_by uuid references public.users(id) on delete set null;

create index if not exists users_is_banned_idx on public.users(is_banned) where is_banned = true;

-- ---------------------------------------------------------------------------
-- 3. is_superadmin() helper.
--    SECURITY DEFINER so it can read public.users without tripping RLS recursion,
--    and reusable inside policies on the users table itself.
-- ---------------------------------------------------------------------------
create or replace function public.is_superadmin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.role = 'superadmin'
      and u.verified = true
      and coalesce(u.is_banned, false) = false
  );
$$;

-- ---------------------------------------------------------------------------
-- 4. Guard privileged user columns.
--    The existing can_self_update_user_profile() pins role/verified/admin_user_id on
--    self-updates, but the new ban columns are not covered by it. This trigger stops a
--    normal signed-in user from editing role, verification, or ban state on any row.
--    The service-role server client (used by admin actions) and superadmins bypass it.
-- ---------------------------------------------------------------------------
create or replace function public.guard_privileged_user_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Server-side service role (createSupabaseAdminClient), database admins, and superadmins may change anything.
  if current_user in ('postgres', 'dashboard_user', 'supabase_admin') or coalesce(auth.role(), '') = 'service_role' or public.is_superadmin() then
    return new;
  end if;

  if new.role is distinct from old.role
     or new.verified is distinct from old.verified
     or new.verified_at is distinct from old.verified_at
     or new.admin_user_id is distinct from old.admin_user_id
     or coalesce(new.is_banned, false) is distinct from coalesce(old.is_banned, false)
     or new.banned_at is distinct from old.banned_at
     or new.banned_by is distinct from old.banned_by
     or new.banned_reason is distinct from old.banned_reason then
    raise exception 'Not authorized to modify privileged user columns';
  end if;

  return new;
end;
$$;

drop trigger if exists guard_privileged_user_columns on public.users;
create trigger guard_privileged_user_columns
before update on public.users
for each row execute procedure public.guard_privileged_user_columns();

-- ---------------------------------------------------------------------------
-- 5. Admin audit log — a record of every superadmin action.
-- ---------------------------------------------------------------------------
create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.users(id) on delete set null,
  actor_email text,
  action text not null,
  target_table text,
  target_id text,
  summary text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists admin_audit_log_created_idx on public.admin_audit_log(created_at desc);
create index if not exists admin_audit_log_actor_idx on public.admin_audit_log(actor_id, created_at desc);

alter table public.admin_audit_log enable row level security;

drop policy if exists "superadmin read audit log" on public.admin_audit_log;
create policy "superadmin read audit log"
  on public.admin_audit_log for select
  to authenticated
  using (public.is_superadmin());

drop policy if exists "superadmin write audit log" on public.admin_audit_log;
create policy "superadmin write audit log"
  on public.admin_audit_log for insert
  to authenticated
  with check (public.is_superadmin());

-- ---------------------------------------------------------------------------
-- 6. Superadmin full-access RLS on every domain table that exists.
--    Each policy is additive (OR-ed with the existing per-role policies), so campus
--    admins and normal users keep their current access while superadmin gets everything.
-- ---------------------------------------------------------------------------
do $$
declare
  target_table text;
  managed_tables text[] := array[
    'users',
    'universities',
    'notes',
    'academic_subject_mappings',
    'payments',
    'note_access',
    'note_assessment_attempts',
    'doubts',
    'doubt_replies',
    'mentorship_requests',
    'mentorship_messages',
    'mentorship_reports',
    'notifications',
    'community_posts',
    'community_partner_requests',
    'community_reports',
    'community_comments',
    'community_post_votes',
    'community_comment_votes',
    'verification_requests',
    'verification_codes',
    'courses',
    'course_modules',
    'course_lessons',
    'course_assessments',
    'course_assessment_questions',
    'course_assessment_attempts',
    'course_enrollments',
    'lab_submissions',
    'campus_weekly_items',
    'mentor_profiles',
    'mentor_session_types',
    'mentor_availability_rules',
    'mentor_blocked_times',
    'mentor_bookings',
    'mentor_reviews',
    'hunter_talent_profiles',
    'hunter_companies',
    'hunter_recruiter_profiles',
    'hunter_opportunities',
    'hunter_shortlists',
    'hunter_invites',
    'hunter_pipeline_items',
    'hunter_audit_events'
  ];
begin
  foreach target_table in array managed_tables
  loop
    if to_regclass('public.' || target_table) is null then
      continue;
    end if;

    execute format('alter table public.%I enable row level security', target_table);
    execute format('drop policy if exists "superadmin full access" on public.%I', target_table);
    execute format(
      'create policy "superadmin full access" on public.%I for all to authenticated using (public.is_superadmin()) with check (public.is_superadmin())',
      target_table
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 7. Promote fallback: if the superadmin auth user already exists, elevate it.
--    The primary path is scripts/provision-superadmin.mjs, which creates the auth user
--    with a password and then upserts this same row. This block only helps when the auth
--    user is already present (e.g. they signed up first).
-- ---------------------------------------------------------------------------
update public.users
set
  role = 'superadmin',
  verified = true,
  verified_at = coalesce(verified_at, timezone('utc', now())),
  admin_user_id = coalesce(admin_user_id, 'anand-superadmin'),
  is_banned = false,
  banned_at = null,
  banned_by = null,
  banned_reason = null,
  updated_at = timezone('utc', now())
where lower(email) = 'anand01ts@gmail.com';
