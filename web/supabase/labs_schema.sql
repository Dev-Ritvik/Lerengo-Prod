create table if not exists public.lab_submissions (
  id uuid primary key default gen_random_uuid(),
  university_id uuid not null references public.universities(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  domain text not null,
  submission_summary text not null,
  problem_statement text not null,
  idea_stage text not null default 'idea',
  support_tracks text[] not null default '{}',
  skills_snapshot text,
  team_context text,
  links text[] not null default '{}',
  publication_interest boolean not null default false,
  patent_interest boolean not null default false,
  status text not null default 'submitted',
  priority text not null default 'standard',
  assigned_to text,
  review_notes text,
  next_step text,
  last_reviewed_at timestamptz,
  reviewed_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint lab_submissions_idea_stage_check
    check (idea_stage in ('idea', 'research', 'prototype', 'paper', 'patent', 'build')),
  constraint lab_submissions_priority_check
    check (priority in ('standard', 'priority', 'critical')),
  constraint lab_submissions_status_check
    check (status in ('submitted', 'under_review', 'accepted', 'rejected', 'active_build', 'research_track', 'publication_track', 'patent_track', 'showcase')),
  constraint lab_submissions_support_tracks_check
    check (
      support_tracks <@ array['validation', 'research', 'prototype', 'publication', 'patent', 'mentorship']::text[]
    )
);

create index if not exists lab_submissions_university_idx
  on public.lab_submissions (university_id, status, priority, created_at desc);

create index if not exists lab_submissions_user_idx
  on public.lab_submissions (user_id, created_at desc);

alter table public.lab_submissions enable row level security;

drop policy if exists "verified users can view own lab submissions" on public.lab_submissions;
create policy "verified users can view own lab submissions"
  on public.lab_submissions
  for select
  using (
    auth.uid() = user_id
    and exists (
      select 1
      from public.users
      where users.id = auth.uid()
        and users.university_id = lab_submissions.university_id
        and users.verified = true
    )
  );

drop policy if exists "verified users can insert own lab submissions" on public.lab_submissions;
create policy "verified users can insert own lab submissions"
  on public.lab_submissions
  for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.users
      where users.id = auth.uid()
        and users.university_id = lab_submissions.university_id
        and users.verified = true
    )
  );

drop policy if exists "admins can manage university lab submissions" on public.lab_submissions;
create policy "admins can manage university lab submissions"
  on public.lab_submissions
  for all
  using (
    exists (
      select 1
      from public.users
      where users.id = auth.uid()
        and users.university_id = lab_submissions.university_id
        and users.role = 'admin'
        and users.verified = true
    )
  )
  with check (
    exists (
      select 1
      from public.users
      where users.id = auth.uid()
        and users.university_id = lab_submissions.university_id
        and users.role = 'admin'
        and users.verified = true
    )
  );
