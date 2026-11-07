-- Tidori video-call foundation (Phase 1)
-- Run in the SQL Editor of the Tidori Supabase project.
-- This creates secure metadata only. It does not start video calls or expose room links.

alter table public.appointments
  add column if not exists meeting_mode text not null default 'in_person';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'appointments_meeting_mode_check'
      and conrelid = 'public.appointments'::regclass
  ) then
    alter table public.appointments
      add constraint appointments_meeting_mode_check
      check (meeting_mode in ('in_person', 'phone', 'video'));
  end if;
end $$;

create table if not exists public.video_call_rooms (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null unique
    references public.appointments(id) on delete cascade,
  room_code text not null unique,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'live', 'ended', 'cancelled')),
  provider text not null default 'tidori_self_hosted'
    check (provider in ('tidori_self_hosted')),
  signalling_provider text not null default 'cloudflare_durable_objects'
    check (signalling_provider in ('cloudflare_durable_objects')),
  scheduled_start timestamptz,
  scheduled_end timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint video_call_room_code_length check (char_length(room_code) between 20 and 100),
  constraint video_call_room_time_order check (
    scheduled_end is null or scheduled_start is null or scheduled_end > scheduled_start
  )
);

create table if not exists public.video_call_participants (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.video_call_rooms(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  display_name text not null check (char_length(display_name) between 1 and 120),
  participant_role text not null check (participant_role in ('host', 'guest')),
  status text not null default 'invited'
    check (status in ('invited', 'joined', 'left', 'removed')),
  joined_at timestamptz,
  left_at timestamptz,
  created_at timestamptz not null default now(),
  constraint video_call_participant_user_unique unique (room_id, user_id)
);

create index if not exists video_call_rooms_status_start_idx
  on public.video_call_rooms(status, scheduled_start);
create index if not exists video_call_participants_room_idx
  on public.video_call_participants(room_id, created_at);

alter table public.video_call_rooms enable row level security;
alter table public.video_call_participants enable row level security;

-- These tables contain private meeting metadata. No public or ordinary-member
-- access is granted. The Cloudflare Worker validates separate hashed host and
-- guest invitation keys; browser clients never read room credentials directly.
revoke all on public.video_call_rooms from anon, authenticated;
revoke all on public.video_call_participants from anon, authenticated;
grant select, insert, update, delete on public.video_call_rooms to authenticated;
grant select, insert, update, delete on public.video_call_participants to authenticated;
grant all on public.video_call_rooms to service_role;
grant all on public.video_call_participants to service_role;

drop policy if exists "Tidori administrators manage video call rooms" on public.video_call_rooms;
create policy "Tidori administrators manage video call rooms"
  on public.video_call_rooms
  for all to authenticated
  using ((select private.is_tidori_admin()))
  with check ((select private.is_tidori_admin()));

drop policy if exists "Tidori administrators manage video call participants" on public.video_call_participants;
create policy "Tidori administrators manage video call participants"
  on public.video_call_participants
  for all to authenticated
  using ((select private.is_tidori_admin()))
  with check ((select private.is_tidori_admin()));

create or replace function public.set_video_call_room_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function public.set_video_call_room_updated_at() from public, anon, authenticated;

drop trigger if exists set_video_call_room_updated_at on public.video_call_rooms;
create trigger set_video_call_room_updated_at
  before update on public.video_call_rooms
  for each row execute function public.set_video_call_room_updated_at();
