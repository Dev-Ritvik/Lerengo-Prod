alter table if exists public.notifications
  drop constraint if exists notifications_type_check;

alter table if exists public.notifications
  add constraint notifications_type_check
  check (
    type in ('mentorship_request', 'mentorship_request_update', 'mentorship_message', 'mentorship_report', 'doubt_reply', 'system')
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

create index if not exists mentorship_messages_request_idx on public.mentorship_messages(request_id);
create index if not exists mentorship_messages_sender_idx on public.mentorship_messages(sender_id);
create index if not exists mentorship_messages_recipient_read_idx on public.mentorship_messages(recipient_id, read_at);

drop trigger if exists set_mentorship_messages_updated_at on public.mentorship_messages;
create trigger set_mentorship_messages_updated_at
before update on public.mentorship_messages
for each row execute procedure public.set_updated_at();

alter table public.mentorship_messages enable row level security;

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
