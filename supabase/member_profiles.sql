-- Tidori Ministries member profiles
-- Run once in Supabase Dashboard > SQL Editor.
-- Member roles and church status are intentionally not editable by members.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text,
  phone text,
  photo_url text,
  role text not null default 'member' check (role in ('member','leader','admin','super_admin')),
  member_status text not null default 'visitor' check (member_status in ('visitor','member','leader')),
  join_date date,
  small_group text,
  ministry text,
  areas_served text[] not null default '{}',
  newsletter_opt_in boolean not null default false,
  prayer_request_visibility text not null default 'leaders' check (prayer_request_visibility in ('private','leaders','church')),
  directory_opt_in boolean not null default false,
  birthday_month smallint check (birthday_month between 1 and 12),
  birthday_day smallint check (birthday_day between 1 and 31),
  address text,
  family_links uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_small_group_idx on public.profiles (small_group);
create index if not exists profiles_role_idx on public.profiles (role);

alter table public.profiles enable row level security;

drop policy if exists "Members read own profile" on public.profiles;
create policy "Members read own profile"
  on public.profiles for select to authenticated
  using ((select auth.uid()) = id);

drop policy if exists "Members update own profile" on public.profiles;
create policy "Members update own profile"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Do not let a member insert their own row or change role/status/join date.
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (
  full_name, phone, photo_url, small_group, ministry, areas_served,
  newsletter_opt_in, prayer_request_visibility, directory_opt_in,
  birthday_month, birthday_day, address, family_links, updated_at
) on public.profiles to authenticated;

-- Keep profile creation tied to Auth sign-up. The trigger function lives in a
-- non-exposed schema and runs with the privileges needed to create the row.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create or replace function private.create_member_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Backfill accounts that existed before this profile migration.
insert into public.profiles (id, full_name, email)
select
  u.id,
  coalesce(u.raw_user_meta_data ->> 'full_name', ''),
  u.email
from auth.users u
on conflict (id) do nothing;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute function private.create_member_profile();

-- Create a public-read avatar bucket; each signed-in user can upload/update
-- only files inside their own UUID folder.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('member-avatars', 'member-avatars', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Members upload own avatar" on storage.objects;
create policy "Members upload own avatar"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'member-avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Members update own avatar" on storage.objects;
create policy "Members update own avatar"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'member-avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'member-avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Members delete own avatar" on storage.objects;
create policy "Members delete own avatar"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'member-avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
