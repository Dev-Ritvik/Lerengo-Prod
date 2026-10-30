create extension if not exists pgcrypto;

-- Idempotent verification requests enrichment for review consistency.
alter table if exists public.verification_requests
  add column if not exists reg_id_hash text,
  add column if not exists reg_id_last4 text;

-- Idempotent verification codes setup.
create table if not exists public.verification_codes (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  university_id uuid not null references public.universities (id),
  email text not null,
  code text not null,
  attempt_count integer not null default 0,
  last_attempt_at timestamp with time zone,
  expires_at timestamp with time zone not null,
  created_at timestamp with time zone not null default now(),
  constraint verification_codes_pkey primary key (id),
  constraint verification_codes_user_id_fkey foreign key (user_id) references auth.users (id) on delete cascade
);

alter table if exists public.verification_codes
  add column if not exists university_id uuid references public.universities (id),
  add column if not exists email text not null default '',
  add column if not exists code text not null default '',
  add column if not exists attempt_count integer not null default 0,
  add column if not exists last_attempt_at timestamp with time zone,
  add column if not exists expires_at timestamp with time zone not null default now(),
  add column if not exists created_at timestamp with time zone not null default now();

update public.verification_codes as verification_code
set university_id = user_profile.university_id
from public.users as user_profile
where verification_code.user_id = user_profile.id
  and verification_code.university_id is null;

alter table if exists public.verification_codes
  alter column university_id set not null,
  alter column email drop default,
  alter column code drop default,
  alter column expires_at drop default;

create index if not exists verification_codes_user_idx on public.verification_codes(user_id);
create index if not exists verification_codes_email_idx on public.verification_codes(email);
create index if not exists verification_codes_user_email_university_idx on public.verification_codes(user_id, email, university_id, created_at desc);

alter table public.verification_codes enable row level security;

