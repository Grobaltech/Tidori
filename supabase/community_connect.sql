-- Tidori Connect: private member directory, one-to-one messaging and prayer requests.
-- Run this once in the ACTIVE Tidori Supabase project SQL Editor.
-- Existing donation, appointment and video-call tables are not modified.

create table if not exists public.member_directory (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  full_name text not null,
  photo_url text,
  ministry text,
  small_group text,
  updated_at timestamptz not null default now()
);
alter table public.member_directory enable row level security;
revoke all on public.member_directory from anon, authenticated;
grant select on public.member_directory to authenticated;

drop policy if exists "Members view opted-in directory entries" on public.member_directory;
create policy "Members view opted-in directory entries"
  on public.member_directory for select to authenticated using (true);

create or replace function private.sync_tidori_member_directory()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.directory_opt_in is true then
    insert into public.member_directory(user_id, full_name, photo_url, ministry, small_group, updated_at)
    values (new.id, coalesce(nullif(btrim(new.full_name),''),'Tidori member'),
      new.photo_url, new.ministry, new.small_group, now())
    on conflict (user_id) do update set
      full_name = excluded.full_name,
      photo_url = excluded.photo_url,
      ministry = excluded.ministry,
      small_group = excluded.small_group,
      updated_at = now();
  else
    delete from public.member_directory where user_id = new.id;
  end if;
  return new;
end;
$$;
revoke all on function private.sync_tidori_member_directory() from public, anon, authenticated;

drop trigger if exists sync_tidori_member_directory on public.profiles;
create trigger sync_tidori_member_directory
  after insert or update of full_name, photo_url, ministry, small_group, directory_opt_in
  on public.profiles for each row execute function private.sync_tidori_member_directory();

insert into public.member_directory(user_id, full_name, photo_url, ministry, small_group)
select id, coalesce(nullif(btrim(full_name),''),'Tidori member'), photo_url, ministry, small_group
from public.profiles where directory_opt_in is true
on conflict (user_id) do update set
  full_name=excluded.full_name, photo_url=excluded.photo_url,
  ministry=excluded.ministry, small_group=excluded.small_group, updated_at=now();

create table if not exists public.community_conversations (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'direct' check (kind in ('direct')),
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.community_conversation_members (
  conversation_id uuid not null references public.community_conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);
create index if not exists community_conversation_members_user_idx
  on public.community_conversation_members(user_id, joined_at desc);

create table if not exists public.community_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.community_conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 4000),
  created_at timestamptz not null default now()
);
create index if not exists community_messages_conversation_time_idx
  on public.community_messages(conversation_id, created_at desc);

alter table public.community_conversations enable row level security;
alter table public.community_conversation_members enable row level security;
alter table public.community_messages enable row level security;
revoke all on public.community_conversations, public.community_conversation_members, public.community_messages from anon, authenticated;
grant select on public.community_conversations, public.community_conversation_members, public.community_messages to authenticated;
grant insert on public.community_messages to authenticated;

drop policy if exists "Conversation members can view their conversations" on public.community_conversations;
create policy "Conversation members can view their conversations"
  on public.community_conversations for select to authenticated
  using (exists (select 1 from public.community_conversation_members m
    where m.conversation_id = id and m.user_id = (select auth.uid())));

drop policy if exists "Members can view their conversation memberships" on public.community_conversation_members;
create policy "Members can view their conversation memberships"
  on public.community_conversation_members for select to authenticated
  using (user_id = (select auth.uid()) or exists (
    select 1 from public.community_conversation_members mine
    where mine.conversation_id = conversation_id and mine.user_id = (select auth.uid())
  ));

drop policy if exists "Conversation members can read messages" on public.community_messages;
create policy "Conversation members can read messages"
  on public.community_messages for select to authenticated
  using (exists (select 1 from public.community_conversation_members m
    where m.conversation_id = community_messages.conversation_id
      and m.user_id = (select auth.uid())));

drop policy if exists "Conversation members can send messages as themselves" on public.community_messages;
create policy "Conversation members can send messages as themselves"
  on public.community_messages for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and exists (select 1 from public.community_conversation_members m
      where m.conversation_id = community_messages.conversation_id
        and m.user_id = (select auth.uid()))
  );

create or replace function public.start_tidori_direct_conversation(target_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  existing_id uuid;
  new_id uuid;
begin
  if caller_id is null then raise exception 'Sign in is required' using errcode='42501'; end if;
  if target_user_id is null or target_user_id = caller_id then
    raise exception 'Choose another member to message' using errcode='22023';
  end if;
  if not exists (select 1 from public.member_directory d where d.user_id = target_user_id) then
    raise exception 'This member is not currently available in the directory' using errcode='42501';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(
    least(caller_id::text,target_user_id::text)||':'||greatest(caller_id::text,target_user_id::text), 0));

  select c.id into existing_id
  from public.community_conversations c
  where c.kind='direct'
    and exists (select 1 from public.community_conversation_members a
      where a.conversation_id=c.id and a.user_id=caller_id)
    and exists (select 1 from public.community_conversation_members b
      where b.conversation_id=c.id and b.user_id=target_user_id)
    and (select count(*) from public.community_conversation_members x
      where x.conversation_id=c.id)=2
  limit 1;
  if existing_id is not null then return existing_id; end if;

  insert into public.community_conversations(kind,created_by)
  values ('direct',caller_id) returning id into new_id;
  insert into public.community_conversation_members(conversation_id,user_id)
  values (new_id,caller_id),(new_id,target_user_id);
  return new_id;
end;
$$;
revoke all on function public.start_tidori_direct_conversation(uuid) from public, anon;
grant execute on function public.start_tidori_direct_conversation(uuid) to authenticated;

create table if not exists public.prayer_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 160),
  request text not null check (char_length(btrim(request)) between 1 and 4000),
  visibility text not null default 'leaders' check (visibility in ('private','leaders','church')),
  status text not null default 'open' check (status in ('open','praying','answered')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  answered_at timestamptz
);
create index if not exists prayer_requests_user_created_idx
  on public.prayer_requests(user_id, created_at desc);
create index if not exists prayer_requests_visibility_created_idx
  on public.prayer_requests(visibility, created_at desc);
alter table public.prayer_requests enable row level security;
revoke all on public.prayer_requests from anon, authenticated;
grant select, insert, update, delete on public.prayer_requests to authenticated;

drop policy if exists "Members view prayer requests allowed for them" on public.prayer_requests;
create policy "Members view prayer requests allowed for them"
  on public.prayer_requests for select to authenticated
  using (
    user_id = (select auth.uid())
    or visibility = 'church'
    or (visibility = 'leaders' and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.role in ('leader','admin','super_admin')
    ))
  );

drop policy if exists "Members create their own prayer requests" on public.prayer_requests;
create policy "Members create their own prayer requests"
  on public.prayer_requests for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "Members update their own prayer requests" on public.prayer_requests;
create policy "Members update their own prayer requests"
  on public.prayer_requests for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "Members delete their own prayer requests" on public.prayer_requests;
create policy "Members delete their own prayer requests"
  on public.prayer_requests for delete to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Church leaders update prayer status" on public.prayer_requests;
create policy "Church leaders update prayer status"
  on public.prayer_requests for update to authenticated
  using (exists (select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role in ('leader','admin','super_admin')))
  with check (exists (select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role in ('leader','admin','super_admin')));

comment on table public.member_directory is 'Privacy-opt-in directory projection; excludes email, phone and address.';
comment on table public.community_messages is 'Private one-to-one Tidori member messages; visible only to conversation participants.';
comment on table public.prayer_requests is 'Member prayer requests with private, leaders-only or church-wide visibility.';
