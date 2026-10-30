create extension if not exists pgcrypto;

create table if not exists public.campus_weekly_items (
  id uuid primary key default gen_random_uuid(),
  university_id uuid not null references public.universities (id) on delete cascade,
  created_by uuid references public.users (id) on delete set null,
  item_type text not null check (item_type in ('banner', 'announcement')),
  category text not null check (category in ('hackathon', 'event', 'workshop', 'opportunity', 'announcement', 'bulletin')),
  title text not null,
  subtitle text,
  description text,
  eyebrow text,
  pill_label text,
  meta_label text,
  cta_label text,
  target_type text not null check (target_type in ('external', 'community_post')),
  target_url text,
  community_post_id uuid references public.community_posts (id) on delete set null,
  starts_at timestamp with time zone,
  ends_at timestamp with time zone,
  sort_order integer not null default 100,
  is_active boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint campus_weekly_items_target_check check (
    (item_type = 'banner' and target_type = 'external' and target_url is not null)
    or
    (item_type = 'announcement' and target_type = 'community_post' and community_post_id is not null)
  )
);

create index if not exists campus_weekly_items_scope_idx
  on public.campus_weekly_items (university_id, is_active, sort_order asc, created_at desc);

create index if not exists campus_weekly_items_window_idx
  on public.campus_weekly_items (starts_at, ends_at);

alter table public.campus_weekly_items enable row level security;

drop policy if exists "Verified campus users can read weekly items" on public.campus_weekly_items;
create policy "Verified campus users can read weekly items"
  on public.campus_weekly_items
  for select
  using (
    auth.uid() is not null
    and exists (
      select 1
      from public.users
      where public.users.id = auth.uid()
        and public.users.university_id = campus_weekly_items.university_id
        and public.users.verified = true
    )
  );

drop policy if exists "Campus admins can insert weekly items" on public.campus_weekly_items;
create policy "Campus admins can insert weekly items"
  on public.campus_weekly_items
  for insert
  with check (
    auth.uid() is not null
    and exists (
      select 1
      from public.users
      where public.users.id = auth.uid()
        and public.users.university_id = campus_weekly_items.university_id
        and public.users.role = 'admin'
        and public.users.verified = true
    )
  );

drop policy if exists "Campus admins can update weekly items" on public.campus_weekly_items;
create policy "Campus admins can update weekly items"
  on public.campus_weekly_items
  for update
  using (
    auth.uid() is not null
    and exists (
      select 1
      from public.users
      where public.users.id = auth.uid()
        and public.users.university_id = campus_weekly_items.university_id
        and public.users.role = 'admin'
        and public.users.verified = true
    )
  )
  with check (
    auth.uid() is not null
    and exists (
      select 1
      from public.users
      where public.users.id = auth.uid()
        and public.users.university_id = campus_weekly_items.university_id
        and public.users.role = 'admin'
        and public.users.verified = true
    )
  );

drop policy if exists "Campus admins can delete weekly items" on public.campus_weekly_items;
create policy "Campus admins can delete weekly items"
  on public.campus_weekly_items
  for delete
  using (
    auth.uid() is not null
    and exists (
      select 1
      from public.users
      where public.users.id = auth.uid()
        and public.users.university_id = campus_weekly_items.university_id
        and public.users.role = 'admin'
        and public.users.verified = true
    )
  );
