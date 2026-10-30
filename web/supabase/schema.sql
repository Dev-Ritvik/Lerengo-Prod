create extension if not exists pgcrypto;

create table if not exists public.universities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  domain text unique,
  is_active boolean not null default true,
  name_variants text[] not null default '{}'::text[],
  reg_id_regex text[] not null default '{}'::text[],
  keywords text[] not null default '{}'::text[],
  min_score integer not null default 80,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text,
  admin_user_id text unique,
  campus_name text,
  batch text,
  department text,
  program_domain text,
  mentor_category text check (mentor_category in ('faculty', 'senior', 'career')),
  mentor_approved boolean not null default false,
  mentor_active boolean not null default false,
  mentor_headline text,
  mentor_expertise text[] not null default '{}'::text[],
  university_id uuid references public.universities(id),
  role text not null default 'user' check (role in ('user', 'senior', 'admin')),
  verified boolean not null default false,
  verified_at timestamptz,
  reg_id_hash text,
  reg_id_last4 text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table if exists public.universities
  add column if not exists name_variants text[] not null default '{}'::text[],
  add column if not exists reg_id_regex text[] not null default '{}'::text[],
  add column if not exists keywords text[] not null default '{}'::text[],
  add column if not exists min_score integer not null default 80;

alter table if exists public.users
  add column if not exists admin_user_id text,
  add column if not exists campus_name text,
  add column if not exists batch text,
  add column if not exists department text,
  add column if not exists program_domain text,
  add column if not exists mentor_category text check (mentor_category in ('faculty', 'senior', 'career')),
  add column if not exists mentor_approved boolean not null default false,
  add column if not exists mentor_active boolean not null default false,
  add column if not exists mentor_headline text,
  add column if not exists mentor_expertise text[] not null default '{}'::text[],
  add column if not exists verified boolean not null default false,
  add column if not exists verified_at timestamptz,
  add column if not exists reg_id_hash text,
  add column if not exists reg_id_last4 text;

alter table if exists public.notes
  add column if not exists subject text,
  add column if not exists department text,
  add column if not exists program_domain text,
  add column if not exists semester integer,
  add column if not exists content_json jsonb not null default '{}'::jsonb,
  add column if not exists video_url text,
  add column if not exists archived_at timestamptz,
  add column if not exists archived_by uuid references public.users(id);

alter table if exists public.notes
  alter column file_path drop not null;

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  university_id uuid not null references public.universities(id) on delete cascade,
  title text not null,
  subject text,
  department text,
  program_domain text,
  semester integer check (semester >= 1 and semester <= 12),
  description text,
  file_path text,
  content_json jsonb not null default '{}'::jsonb,
  video_url text,
  price_inr integer not null default 0 check (price_inr >= 0),
  is_verified boolean not null default false,
  archived_at timestamptz,
  archived_by uuid references public.users(id),
  uploaded_by uuid references public.users(id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.academic_subject_mappings (
  id uuid primary key default gen_random_uuid(),
  university_id uuid not null references public.universities(id) on delete cascade,
  department text not null,
  program_domain text not null,
  semester integer not null check (semester >= 1 and semester <= 12),
  subject text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (university_id, department, program_domain, semester, subject)
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  note_id uuid not null references public.notes(id) on delete cascade,
  razorpay_order_id text not null unique,
  razorpay_payment_id text unique,
  razorpay_signature text,
  amount_paise integer not null check (amount_paise >= 0),
  status text not null default 'created' check (status in ('created', 'success', 'failed')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.note_access (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  note_id uuid not null references public.notes(id) on delete cascade,
  payment_id uuid references public.payments(id),
  granted_at timestamptz not null default timezone('utc', now()),
  unique (user_id, note_id)
);

create table if not exists public.note_assessment_attempts (
  id uuid primary key default gen_random_uuid(),
  university_id uuid not null references public.universities(id) on delete cascade,
  note_id uuid not null references public.notes(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  answers_json jsonb not null default '{}'::jsonb,
  score_percent integer not null default 0 check (score_percent >= 0 and score_percent <= 100),
  passed boolean not null default false,
  submitted_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.doubts (
  id uuid primary key default gen_random_uuid(),
  university_id uuid not null references public.universities(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  assigned_to uuid references public.users(id),
  title text not null,
  description text not null,
  status text not null default 'open' check (status in ('open', 'assigned', 'resolved')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.doubt_replies (
  id uuid primary key default gen_random_uuid(),
  doubt_id uuid not null references public.doubts(id) on delete cascade,
  university_id uuid not null references public.universities(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table if exists public.doubts
  add column if not exists moderation_state text not null default 'visible'
  check (moderation_state in ('visible', 'flagged', 'hidden'));

alter table if exists public.doubt_replies
  add column if not exists moderation_state text not null default 'visible'
  check (moderation_state in ('visible', 'flagged', 'hidden'));

create table if not exists public.mentorship_requests (
  id uuid primary key default gen_random_uuid(),
  university_id uuid not null references public.universities(id) on delete cascade,
  mentor_id uuid not null references public.users(id) on delete cascade,
  requester_id uuid not null references public.users(id) on delete cascade,
  request_type text not null check (
    request_type in ('session', 'roadmap', 'office_hour', 'boost', 'portfolio', 'blocker')
  ),
  status text not null default 'pending' check (
    status in ('pending', 'accepted', 'declined', 'cancelled', 'completed')
  ),
  message text,
  response_note text,
  scheduled_for timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.mentorship_messages (
  id uuid primary key default gen_random_uuid(),
  university_id uuid not null references public.universities(id) on delete cascade,
  request_id uuid not null references public.mentorship_requests(id) on delete cascade,
  sender_id uuid not null references public.users(id) on delete cascade,
  recipient_id uuid not null references public.users(id) on delete cascade,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint mentorship_messages_sender_recipient_check check (sender_id <> recipient_id)
);

create table if not exists public.mentorship_reports (
  id uuid primary key default gen_random_uuid(),
  university_id uuid not null references public.universities(id) on delete cascade,
  reporter_id uuid not null references public.users(id) on delete cascade,
  target_type text not null check (target_type in ('doubt', 'reply')),
  doubt_id uuid references public.doubts(id) on delete cascade,
  reply_id uuid references public.doubt_replies(id) on delete cascade,
  reason text not null,
  status text not null default 'open' check (status in ('open', 'reviewed', 'dismissed')),
  review_note text,
  reviewed_by uuid references public.users(id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint mentorship_reports_target_check check (
    (target_type = 'doubt' and doubt_id is not null and reply_id is null)
    or
    (target_type = 'reply' and reply_id is not null and doubt_id is null)
  )
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  university_id uuid not null references public.universities(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  type text not null check (
    type in ('mentorship_request', 'mentorship_request_update', 'mentorship_message', 'mentorship_report', 'doubt_reply', 'system')
  ),
  title text not null,
  body text not null,
  href text,
  read_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  university_id uuid not null references public.universities(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  channel text not null check (channel in ('Projects', 'Research', 'Exams', 'Labs')),
  title text not null,
  summary text not null,
  tags text[] not null default '{}'::text[],
  program_domain text,
  topic text,
  trust_score integer not null default 75 check (trust_score >= 0 and trust_score <= 100),
  badge_label text,
  status_label text not null default 'Open',
  reply_count integer not null default 0 check (reply_count >= 0),
  helpful_count integer not null default 0 check (helpful_count >= 0),
  is_weekly_highlight boolean not null default false,
  highlight_title text,
  highlight_subtitle text,
  moderation_state text not null default 'reviewed' check (moderation_state in ('reviewed', 'flagged', 'verified', 'pinned')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.community_partner_requests (
  id uuid primary key default gen_random_uuid(),
  university_id uuid not null references public.universities(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  description text not null,
  skills text[] not null default '{}'::text[],
  open_roles text not null,
  team_size_label text not null,
  status text not null default 'open' check (status in ('open', 'matched', 'closed')),
  matched_by uuid references public.users(id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.community_reports (
  id uuid primary key default gen_random_uuid(),
  university_id uuid not null references public.universities(id) on delete cascade,
  post_id uuid not null references public.community_posts(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  reason text not null,
  status text not null default 'open' check (status in ('open', 'reviewed', 'dismissed')),
  review_note text,
  reviewed_by uuid references public.users(id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.community_comments (
  id uuid primary key default gen_random_uuid(),
  university_id uuid not null references public.universities(id) on delete cascade,
  post_id uuid not null references public.community_posts(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  parent_id uuid references public.community_comments(id) on delete cascade,
  body text not null,
  helpful_count integer not null default 0 check (helpful_count >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.community_post_votes (
  id uuid primary key default gen_random_uuid(),
  university_id uuid not null references public.universities(id) on delete cascade,
  post_id uuid not null references public.community_posts(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  unique (post_id, user_id)
);

create table if not exists public.community_comment_votes (
  id uuid primary key default gen_random_uuid(),
  university_id uuid not null references public.universities(id) on delete cascade,
  comment_id uuid not null references public.community_comments(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  unique (comment_id, user_id)
);

alter table if exists public.community_reports
  add column if not exists review_note text,
  add column if not exists reviewed_by uuid references public.users(id);

alter table if exists public.community_partner_requests
  add column if not exists matched_by uuid references public.users(id);

create table if not exists public.verification_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  university_id uuid not null references public.universities(id),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  id_front_path text not null,
  reg_id_hash text,
  reg_id_last4 text,
  score integer not null default 0,
  reasons jsonb not null default '{}'::jsonb,
  attempt_no integer not null default 1,
  created_at timestamptz not null default timezone('utc', now()),
  decided_at timestamptz
);

create table if not exists public.verification_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  university_id uuid not null references public.universities(id),
  email text not null,
  code text not null,
  attempt_count integer not null default 0,
  last_attempt_at timestamptz,
  expires_at timestamptz not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists notes_university_idx on public.notes(university_id);
create index if not exists notes_university_department_idx on public.notes(university_id, department);
create index if not exists notes_university_domain_idx on public.notes(university_id, program_domain);
create index if not exists notes_university_semester_idx on public.notes(university_id, semester);
create index if not exists academic_subject_mappings_university_idx on public.academic_subject_mappings(university_id);
create index if not exists academic_subject_mappings_lookup_idx on public.academic_subject_mappings(university_id, department, program_domain, semester);
create index if not exists payments_user_idx on public.payments(user_id);
create index if not exists payments_order_idx on public.payments(razorpay_order_id);
create index if not exists note_access_user_idx on public.note_access(user_id);
create index if not exists note_assessment_attempts_note_idx on public.note_assessment_attempts(note_id, submitted_at desc);
create index if not exists note_assessment_attempts_user_idx on public.note_assessment_attempts(user_id, submitted_at desc);
create index if not exists note_assessment_attempts_university_idx on public.note_assessment_attempts(university_id, note_id, submitted_at desc);
create index if not exists doubts_university_idx on public.doubts(university_id);
create index if not exists doubt_replies_doubt_idx on public.doubt_replies(doubt_id);
create index if not exists doubt_replies_university_idx on public.doubt_replies(university_id);
create index if not exists doubt_replies_user_idx on public.doubt_replies(user_id);
create index if not exists mentorship_requests_university_idx on public.mentorship_requests(university_id);
create index if not exists mentorship_requests_mentor_status_idx on public.mentorship_requests(mentor_id, status);
create index if not exists mentorship_requests_requester_status_idx on public.mentorship_requests(requester_id, status);
create index if not exists mentorship_messages_request_idx on public.mentorship_messages(request_id);
create index if not exists mentorship_messages_sender_idx on public.mentorship_messages(sender_id);
create index if not exists mentorship_messages_recipient_read_idx on public.mentorship_messages(recipient_id, read_at);
create index if not exists mentorship_reports_university_status_idx on public.mentorship_reports(university_id, status);
create index if not exists mentorship_reports_target_doubt_idx on public.mentorship_reports(doubt_id);
create index if not exists mentorship_reports_target_reply_idx on public.mentorship_reports(reply_id);
create index if not exists notifications_university_idx on public.notifications(university_id);
create index if not exists notifications_user_read_idx on public.notifications(user_id, read_at);
create index if not exists community_posts_university_idx on public.community_posts(university_id);
create index if not exists community_posts_university_channel_idx on public.community_posts(university_id, channel);
create index if not exists community_posts_university_highlight_idx on public.community_posts(university_id, is_weekly_highlight);
create index if not exists community_partner_requests_university_idx on public.community_partner_requests(university_id);
create index if not exists community_reports_university_idx on public.community_reports(university_id);
create index if not exists community_comments_post_idx on public.community_comments(post_id);
create index if not exists community_comments_university_idx on public.community_comments(university_id);
create index if not exists community_post_votes_post_idx on public.community_post_votes(post_id);
create index if not exists community_post_votes_user_idx on public.community_post_votes(user_id);
create index if not exists community_comment_votes_comment_idx on public.community_comment_votes(comment_id);
create index if not exists community_comment_votes_user_idx on public.community_comment_votes(user_id);
create index if not exists users_university_verified_idx on public.users(university_id, verified);
create unique index if not exists users_admin_user_id_idx on public.users(admin_user_id) where admin_user_id is not null;
create index if not exists verification_requests_user_idx on public.verification_requests(user_id);
create index if not exists verification_requests_user_created_idx on public.verification_requests(user_id, created_at desc);
create index if not exists verification_codes_user_idx on public.verification_codes(user_id);
create index if not exists verification_codes_email_idx on public.verification_codes(email);
create index if not exists verification_codes_user_email_university_idx on public.verification_codes(user_id, email, university_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists set_universities_updated_at on public.universities;
create trigger set_universities_updated_at
before update on public.universities
for each row execute procedure public.set_updated_at();

drop trigger if exists set_users_updated_at on public.users;
create trigger set_users_updated_at
before update on public.users
for each row execute procedure public.set_updated_at();

drop trigger if exists set_notes_updated_at on public.notes;
create trigger set_notes_updated_at
before update on public.notes
for each row execute procedure public.set_updated_at();

drop trigger if exists set_academic_subject_mappings_updated_at on public.academic_subject_mappings;
create trigger set_academic_subject_mappings_updated_at
before update on public.academic_subject_mappings
for each row execute procedure public.set_updated_at();

drop trigger if exists set_payments_updated_at on public.payments;
create trigger set_payments_updated_at
before update on public.payments
for each row execute procedure public.set_updated_at();

drop trigger if exists set_doubts_updated_at on public.doubts;
create trigger set_doubts_updated_at
before update on public.doubts
for each row execute procedure public.set_updated_at();

drop trigger if exists set_doubt_replies_updated_at on public.doubt_replies;
create trigger set_doubt_replies_updated_at
before update on public.doubt_replies
for each row execute procedure public.set_updated_at();

drop trigger if exists set_mentorship_requests_updated_at on public.mentorship_requests;
create trigger set_mentorship_requests_updated_at
before update on public.mentorship_requests
for each row execute procedure public.set_updated_at();

drop trigger if exists set_mentorship_messages_updated_at on public.mentorship_messages;
create trigger set_mentorship_messages_updated_at
before update on public.mentorship_messages
for each row execute procedure public.set_updated_at();

drop trigger if exists set_mentorship_reports_updated_at on public.mentorship_reports;
create trigger set_mentorship_reports_updated_at
before update on public.mentorship_reports
for each row execute procedure public.set_updated_at();

drop trigger if exists set_notifications_updated_at on public.notifications;
create trigger set_notifications_updated_at
before update on public.notifications
for each row execute procedure public.set_updated_at();

drop trigger if exists set_community_posts_updated_at on public.community_posts;
create trigger set_community_posts_updated_at
before update on public.community_posts
for each row execute procedure public.set_updated_at();

drop trigger if exists set_community_partner_requests_updated_at on public.community_partner_requests;
create trigger set_community_partner_requests_updated_at
before update on public.community_partner_requests
for each row execute procedure public.set_updated_at();

drop trigger if exists set_community_reports_updated_at on public.community_reports;
create trigger set_community_reports_updated_at
before update on public.community_reports
for each row execute procedure public.set_updated_at();

drop trigger if exists set_community_comments_updated_at on public.community_comments;
create trigger set_community_comments_updated_at
before update on public.community_comments
for each row execute procedure public.set_updated_at();

alter table public.universities enable row level security;
alter table public.users enable row level security;
alter table public.notes enable row level security;
alter table public.academic_subject_mappings enable row level security;
alter table public.payments enable row level security;
alter table public.note_access enable row level security;
alter table public.note_assessment_attempts enable row level security;
alter table public.doubts enable row level security;
alter table public.doubt_replies enable row level security;
alter table public.mentorship_requests enable row level security;
alter table public.mentorship_messages enable row level security;
alter table public.mentorship_reports enable row level security;
alter table public.notifications enable row level security;
alter table public.community_posts enable row level security;
alter table public.community_partner_requests enable row level security;
alter table public.community_reports enable row level security;
alter table public.community_comments enable row level security;
alter table public.community_post_votes enable row level security;
alter table public.community_comment_votes enable row level security;
alter table public.verification_requests enable row level security;
alter table public.verification_codes enable row level security;

drop function if exists public.can_self_insert_user_profile(
  uuid,
  text,
  text,
  uuid,
  text,
  boolean,
  timestamptz,
  boolean,
  boolean,
  text,
  text,
  text[],
  text,
  text
);
create function public.can_self_insert_user_profile(
  candidate_id uuid,
  candidate_email text,
  candidate_role text,
  candidate_university_id uuid,
  candidate_admin_user_id text,
  candidate_verified boolean,
  candidate_verified_at timestamptz,
  candidate_mentor_approved boolean,
  candidate_mentor_active boolean,
  candidate_mentor_category text,
  candidate_mentor_headline text,
  candidate_mentor_expertise text[],
  candidate_reg_id_hash text,
  candidate_reg_id_last4 text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    candidate_id = auth.uid()
    and coalesce(candidate_email, '') <> ''
    and candidate_role = 'user'
    and candidate_admin_user_id is null
    and coalesce(candidate_verified, false) = false
    and candidate_verified_at is null
    and coalesce(candidate_mentor_approved, false) = false
    and coalesce(candidate_mentor_active, false) = false
    and candidate_mentor_category is null
    and candidate_mentor_headline is null
    and coalesce(candidate_mentor_expertise, '{}'::text[]) = '{}'::text[]
    and candidate_reg_id_hash is null
    and candidate_reg_id_last4 is null;
$$;

drop function if exists public.can_self_update_user_profile(
  uuid,
  text,
  uuid,
  text,
  text,
  boolean,
  timestamptz,
  boolean,
  boolean,
  text,
  text,
  text[],
  text,
  text
);
create function public.can_self_update_user_profile(
  candidate_id uuid,
  candidate_email text,
  candidate_university_id uuid,
  candidate_role text,
  candidate_admin_user_id text,
  candidate_verified boolean,
  candidate_verified_at timestamptz,
  candidate_mentor_approved boolean,
  candidate_mentor_active boolean,
  candidate_mentor_category text,
  candidate_mentor_headline text,
  candidate_mentor_expertise text[],
  candidate_reg_id_hash text,
  candidate_reg_id_last4 text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  with existing_user as (
    select *
    from public.users
    where id = auth.uid()
  )
  select exists (
    select 1
    from existing_user
    where candidate_id = auth.uid()
      and coalesce(candidate_email, '') <> ''
      and candidate_role = existing_user.role
      and candidate_admin_user_id is not distinct from existing_user.admin_user_id
      and candidate_verified = existing_user.verified
      and candidate_verified_at is not distinct from existing_user.verified_at
      and candidate_reg_id_hash is not distinct from existing_user.reg_id_hash
      and candidate_reg_id_last4 is not distinct from existing_user.reg_id_last4
      and candidate_mentor_approved = existing_user.mentor_approved
      and candidate_mentor_active = existing_user.mentor_active
      and candidate_mentor_category is not distinct from existing_user.mentor_category
      and candidate_mentor_headline is not distinct from existing_user.mentor_headline
      and coalesce(candidate_mentor_expertise, '{}'::text[]) = coalesce(existing_user.mentor_expertise, '{}'::text[])
      and (
        not existing_user.verified
        or candidate_university_id is not distinct from existing_user.university_id
      )
      and (
        not existing_user.verified
        or candidate_email is not distinct from existing_user.email
      )
  );
$$;

drop policy if exists "universities readable by authenticated users" on public.universities;
create policy "universities readable by authenticated users"
on public.universities
for select
to authenticated
using (is_active = true);

drop policy if exists "users read own row" on public.users;
create policy "users read own row"
on public.users
for select
to authenticated
using (id = auth.uid());

drop policy if exists "users insert own row" on public.users;
create policy "users insert own row"
on public.users
for insert
to authenticated
with check (
  public.can_self_insert_user_profile(
    id,
    email,
    role,
    university_id,
    admin_user_id,
    verified,
    verified_at,
    mentor_approved,
    mentor_active,
    mentor_category,
    mentor_headline,
    mentor_expertise,
    reg_id_hash,
    reg_id_last4
  )
);

drop policy if exists "users update own row" on public.users;
create policy "users update own row"
on public.users
for update
to authenticated
using (id = auth.uid())
with check (
  public.can_self_update_user_profile(
    id,
    email,
    university_id,
    role,
    admin_user_id,
    verified,
    verified_at,
    mentor_approved,
    mentor_active,
    mentor_category,
    mentor_headline,
    mentor_expertise,
    reg_id_hash,
    reg_id_last4
  )
);

drop policy if exists "notes read same university" on public.notes;
create policy "notes read same university"
on public.notes
for select
to authenticated
using (
  exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.verified = true
      and u.university_id = notes.university_id
  )
);

drop policy if exists "admins manage notes" on public.notes;
create policy "admins manage notes"
on public.notes
for all
to authenticated
using (
  exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.role = 'admin'
      and u.verified = true
      and u.university_id = notes.university_id
  )
)
with check (
  exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.role = 'admin'
      and u.verified = true
      and u.university_id = notes.university_id
  )
);

drop policy if exists "academic mappings read same university" on public.academic_subject_mappings;
create policy "academic mappings read same university"
on public.academic_subject_mappings
for select
to authenticated
using (
  exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.verified = true
      and u.university_id = academic_subject_mappings.university_id
  )
);

drop policy if exists "admins manage academic mappings" on public.academic_subject_mappings;
create policy "admins manage academic mappings"
on public.academic_subject_mappings
for all
to authenticated
using (
  exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.role = 'admin'
      and u.verified = true
      and u.university_id = academic_subject_mappings.university_id
  )
)
with check (
  exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.role = 'admin'
      and u.verified = true
      and u.university_id = academic_subject_mappings.university_id
  )
);

drop policy if exists "users read own payments" on public.payments;
create policy "users read own payments"
on public.payments
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "users insert own payments" on public.payments;
drop policy if exists "users read own note access" on public.note_access;
create policy "users read own note access"
on public.note_access
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "users read own note assessment attempts" on public.note_assessment_attempts;
create policy "users read own note assessment attempts"
on public.note_assessment_attempts
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "users create own note assessment attempts" on public.note_assessment_attempts;
drop policy if exists "users read doubts in their university" on public.doubts;
create policy "users read doubts in their university"
on public.doubts
for select
to authenticated
using (
  exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.verified = true
      and u.university_id = doubts.university_id
  )
);

drop policy if exists "users create doubts in their university" on public.doubts;
drop policy if exists "users read doubt replies in their university" on public.doubt_replies;
create policy "users read doubt replies in their university"
on public.doubt_replies
for select
to authenticated
using (
  exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.verified = true
      and u.university_id = doubt_replies.university_id
  )
);

drop policy if exists "users create doubt replies in their university" on public.doubt_replies;
drop policy if exists "assigned seniors create doubt replies in their university" on public.doubt_replies;
create policy "assigned seniors create doubt replies in their university"
on public.doubt_replies
for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.users u
    join public.doubts d
      on d.id = doubt_replies.doubt_id
    where u.id = auth.uid()
      and u.verified = true
      and u.role = 'senior'
      and u.mentor_approved = true
      and u.mentor_active = true
      and u.mentor_category = 'senior'
      and u.university_id = doubt_replies.university_id
      and d.university_id = doubt_replies.university_id
      and d.assigned_to = auth.uid()
      and d.moderation_state <> 'hidden'
      and d.status <> 'resolved'
  )
);

drop policy if exists "users update own doubt replies" on public.doubt_replies;
create policy "users update own doubt replies"
on public.doubt_replies
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "users read mentorship requests in campus" on public.mentorship_requests;
create policy "users read mentorship requests in campus"
on public.mentorship_requests
for select
to authenticated
using (
  requester_id = auth.uid()
  or mentor_id = auth.uid()
  or exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.role = 'admin'
      and u.verified = true
      and u.university_id = mentorship_requests.university_id
  )
);

drop policy if exists "users create mentorship requests in campus" on public.mentorship_requests;
drop policy if exists "users update mentorship requests in campus" on public.mentorship_requests;
drop policy if exists "users read own mentorship reports" on public.mentorship_reports;
create policy "users read own mentorship reports"
on public.mentorship_reports
for select
to authenticated
using (
  reporter_id = auth.uid()
  or exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.role = 'admin'
      and u.verified = true
      and u.university_id = mentorship_reports.university_id
  )
);

drop policy if exists "users read mentorship messages in campus" on public.mentorship_messages;
create policy "users read mentorship messages in campus"
on public.mentorship_messages
for select
to authenticated
using (
  sender_id = auth.uid()
  or recipient_id = auth.uid()
  or exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.role = 'admin'
      and u.verified = true
      and u.university_id = mentorship_messages.university_id
  )
);

drop policy if exists "users create mentorship messages in campus" on public.mentorship_messages;
create policy "users create mentorship messages in campus"
on public.mentorship_messages
for insert
to authenticated
with check (
  sender_id = auth.uid()
  and exists (
    select 1
    from public.users u
    join public.mentorship_requests mr on mr.id = mentorship_messages.request_id
    where u.id = auth.uid()
      and u.verified = true
      and u.university_id = mentorship_messages.university_id
      and (mr.requester_id = auth.uid() or mr.mentor_id = auth.uid())
      and mr.university_id = mentorship_messages.university_id
  )
);

drop policy if exists "users update mentorship messages they received" on public.mentorship_messages;
create policy "users update mentorship messages they received"
on public.mentorship_messages
for update
to authenticated
using (
  recipient_id = auth.uid()
  or exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.role = 'admin'
      and u.verified = true
      and u.university_id = mentorship_messages.university_id
  )
)
with check (
  recipient_id = auth.uid()
  or exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.role = 'admin'
      and u.verified = true
      and u.university_id = mentorship_messages.university_id
  )
);

drop policy if exists "users create mentorship reports in campus" on public.mentorship_reports;
create policy "users create mentorship reports in campus"
on public.mentorship_reports
for insert
to authenticated
with check (
  reporter_id = auth.uid()
  and exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.verified = true
      and u.university_id = mentorship_reports.university_id
  )
);

drop policy if exists "admins update mentorship reports" on public.mentorship_reports;
create policy "admins update mentorship reports"
on public.mentorship_reports
for update
to authenticated
using (
  exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.role = 'admin'
      and u.verified = true
      and u.university_id = mentorship_reports.university_id
  )
)
with check (
  exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.role = 'admin'
      and u.verified = true
      and u.university_id = mentorship_reports.university_id
  )
);

drop policy if exists "users read own notifications" on public.notifications;
create policy "users read own notifications"
on public.notifications
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "users update own notifications" on public.notifications;
create policy "users update own notifications"
on public.notifications
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "users read community posts in their university" on public.community_posts;
create policy "users read community posts in their university"
on public.community_posts
for select
to authenticated
using (
  exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.verified = true
      and u.university_id = community_posts.university_id
  )
);

drop policy if exists "users create community posts in their university" on public.community_posts;
drop policy if exists "users update own community posts" on public.community_posts;
drop policy if exists "users read partner requests in their university" on public.community_partner_requests;
create policy "users read partner requests in their university"
on public.community_partner_requests
for select
to authenticated
using (
  exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.verified = true
      and u.university_id = community_partner_requests.university_id
  )
);

drop policy if exists "users create partner requests in their university" on public.community_partner_requests;
drop policy if exists "users update own partner requests" on public.community_partner_requests;
drop policy if exists "users read community reports in their university" on public.community_reports;
drop policy if exists "users read own community reports" on public.community_reports;
create policy "users read own community reports"
on public.community_reports
for select
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.verified = true
      and u.role = 'admin'
      and u.university_id = community_reports.university_id
  )
);

drop policy if exists "users create own community reports" on public.community_reports;
drop policy if exists "admins update community reports in their university" on public.community_reports;
create policy "admins update community reports in their university"
on public.community_reports
for update
to authenticated
using (
  exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.verified = true
      and u.role = 'admin'
      and u.university_id = community_reports.university_id
  )
)
with check (
  exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.verified = true
      and u.role = 'admin'
      and u.university_id = community_reports.university_id
  )
);

drop policy if exists "users read community comments in their university" on public.community_comments;
create policy "users read community comments in their university"
on public.community_comments
for select
to authenticated
using (
  exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.verified = true
      and u.university_id = community_comments.university_id
  )
);

drop policy if exists "users create community comments in their university" on public.community_comments;
create policy "users create community comments in their university"
on public.community_comments
for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.verified = true
      and u.university_id = community_comments.university_id
  )
);

drop policy if exists "users update own community comments" on public.community_comments;
create policy "users update own community comments"
on public.community_comments
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "users read post votes in their university" on public.community_post_votes;
create policy "users read post votes in their university"
on public.community_post_votes
for select
to authenticated
using (
  exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.verified = true
      and u.university_id = community_post_votes.university_id
  )
);

drop policy if exists "users create own post votes in their university" on public.community_post_votes;
create policy "users create own post votes in their university"
on public.community_post_votes
for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.verified = true
      and u.university_id = community_post_votes.university_id
  )
);

drop policy if exists "users delete own post votes" on public.community_post_votes;
create policy "users delete own post votes"
on public.community_post_votes
for delete
to authenticated
using (user_id = auth.uid());

drop policy if exists "users read comment votes in their university" on public.community_comment_votes;
create policy "users read comment votes in their university"
on public.community_comment_votes
for select
to authenticated
using (
  exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.verified = true
      and u.university_id = community_comment_votes.university_id
  )
);

drop policy if exists "users create own comment votes in their university" on public.community_comment_votes;
create policy "users create own comment votes in their university"
on public.community_comment_votes
for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.verified = true
      and u.university_id = community_comment_votes.university_id
  )
);

drop policy if exists "users delete own comment votes" on public.community_comment_votes;
create policy "users delete own comment votes"
on public.community_comment_votes
for delete
to authenticated
using (user_id = auth.uid());

drop policy if exists "users read own verification requests" on public.verification_requests;
create policy "users read own verification requests"
on public.verification_requests
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "users create own verification requests" on public.verification_requests;
drop policy if exists "users update own verification requests" on public.verification_requests;
insert into public.universities (name, domain)
values
  ('Lovely Professional University', 'lpu.in'),
  ('Chandigarh University', 'cumail.in'),
  ('Sample Engineering University', 'sample.edu')
on conflict (domain) do nothing;

insert into public.community_posts (
  university_id,
  user_id,
  channel,
  title,
  summary,
  tags,
  program_domain,
  topic,
  trust_score,
  badge_label,
  status_label,
  reply_count,
  helpful_count,
  is_weekly_highlight,
  highlight_title,
  highlight_subtitle,
  moderation_state
)
select
  u.id,
  usr.id,
  seed.channel,
  seed.title,
  seed.summary,
  seed.tags,
  coalesce(usr.program_domain, 'B.Tech'),
  seed.topic,
  seed.trust_score,
  seed.badge_label,
  seed.status_label,
  seed.reply_count,
  seed.helpful_count,
  seed.is_weekly_highlight,
  seed.highlight_title,
  seed.highlight_subtitle,
  seed.moderation_state
from public.universities u
cross join lateral (
  select id, program_domain
  from public.users
  where university_id = u.id
  order by created_at asc
  limit 1
) as usr
cross join (
  values
    (
      'Projects',
      'Project Ideas for AI in Healthcare',
      'Looking for two serious teammates to scope an academic assistant for clinical note triage and campus-level evaluation.',
      array['AI', 'Product', 'Open Team']::text[],
      'AI',
      92,
      'Academic Lead',
      'Reviewed',
      18,
      24,
      true,
      'Exam Strategy Guide',
      'Updated 23 discussion replies',
      'reviewed'
    ),
    (
      'Projects',
      'Availability Slot for VLSI Project',
      'Need one frontend and one documentation partner for a VLSI simulation dashboard with campus lab support.',
      array['VLSI', 'Frontend', 'Teammates']::text[],
      'VLSI',
      86,
      'Contributor',
      'Open',
      9,
      11,
      false,
      null,
      null,
      'reviewed'
    ),
    (
      'Research',
      'Research on Blockchain and IoT',
      'Building a literature-backed student working group for blockchain-IoT integration with paper review and a prototype phase.',
      array['Research', 'Blockchain', 'IoT']::text[],
      'Research',
      88,
      'Research Circle',
      'Faculty Seen',
      12,
      16,
      false,
      'Upcoming Mock Test',
      'Database Systems revision room',
      'verified'
    ),
    (
      'Exams',
      'Top 20 PYQs for Database Midterm',
      'Curated list of repeated database questions with quick answer frames and note references for the next mock test.',
      array['Exam Prep', 'DBMS', 'PYQ']::text[],
      'Databases',
      95,
      'Exam Mentor',
      'Pinned',
      24,
      31,
      true,
      'Top 20 PYQs',
      'Data Structures thread surged',
      'pinned'
    ),
    (
      'Labs',
      'OS Lab Viva Question Bank',
      'Collecting faculty-pattern viva questions and concise explanations for process scheduling, semaphores, and memory management.',
      array['Lab', 'OS', 'Viva']::text[],
      'Operating Systems',
      90,
      'Top Helper',
      'Verified',
      15,
      21,
      false,
      null,
      null,
      'verified'
    )
) as seed(
  channel,
  title,
  summary,
  tags,
  topic,
  trust_score,
  badge_label,
  status_label,
  reply_count,
  helpful_count,
  is_weekly_highlight,
  highlight_title,
  highlight_subtitle,
  moderation_state
)
where not exists (
  select 1
  from public.community_posts cp
  where cp.university_id = u.id
    and cp.title = seed.title
);

insert into public.community_partner_requests (
  university_id,
  user_id,
  title,
  description,
  skills,
  open_roles,
  team_size_label,
  status
)
select
  u.id,
  usr.id,
  seed.title,
  seed.description,
  seed.skills,
  seed.open_roles,
  seed.team_size_label,
  'open'
from public.universities u
cross join lateral (
  select id
  from public.users
  where university_id = u.id
  order by created_at asc
  limit 1
) as usr
cross join (
  values
    (
      'Find project partner',
      'Skill-based matching for students who are actively building, researching, or preparing campus submissions.',
      array['Frontend', 'Backend', 'Research']::text[],
      '3 open requests',
      '2 to 5 members'
    ),
    (
      'Moderation and reporting',
      'Serious academic environment with reporting, reviewed posts, and visibility signals for trusted contributors.',
      array['Reviewed', 'Reported', 'Moderated']::text[],
      'Trust-based filtering',
      'Low-noise feed'
    )
) as seed(title, description, skills, open_roles, team_size_label)
where not exists (
  select 1
  from public.community_partner_requests cpr
  where cpr.university_id = u.id
    and cpr.title = seed.title
);

insert into public.community_comments (
  university_id,
  post_id,
  user_id,
  parent_id,
  body,
  helpful_count
)
select
  cp.university_id,
  cp.id,
  comment_author.id,
  null,
  seed.body,
  seed.helpful_count
from public.community_posts cp
cross join lateral (
  select id
  from public.users
  where university_id = cp.university_id
  order by created_at asc
  offset 1
  limit 1
) as comment_author
cross join (
  values
    (
      'This should be broken into milestones first. Define the scope, expected deliverables, and your review checkpoints.',
      6
    ),
    (
      'If you need teammates, state the exact stack and weekly commitment. The better the constraint, the better the matches.',
      4
    )
) as seed(body, helpful_count)
where cp.channel = 'Projects'
  and comment_author.id is not null
  and not exists (
    select 1
    from public.community_comments cc
    where cc.post_id = cp.id
      and cc.body = seed.body
  );
