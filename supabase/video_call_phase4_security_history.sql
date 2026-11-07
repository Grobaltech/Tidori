-- Tidori video calling: secure role credentials, waiting-room admission and call history.
-- Run once in the Tidori Supabase SQL Editor after video_call_foundation.sql.

alter table public.video_call_rooms
  add column if not exists host_token_hash text,
  add column if not exists guest_token_hash text,
  add column if not exists ended_reason text;

-- The live Worker now uses a Cloudflare Durable Object for WebSocket signalling.
alter table public.video_call_rooms
  drop constraint if exists video_call_rooms_signalling_provider_check;
update public.video_call_rooms
  set signalling_provider = 'cloudflare_durable_objects'
  where signalling_provider <> 'cloudflare_durable_objects';
alter table public.video_call_rooms
  alter column signalling_provider set default 'cloudflare_durable_objects',
  add constraint video_call_rooms_signalling_provider_check
    check (signalling_provider = 'cloudflare_durable_objects');

create table if not exists public.video_call_sessions (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.video_call_rooms(id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  ended_reason text,
  created_at timestamptz not null default now()
);

create index if not exists video_call_sessions_room_started_idx
  on public.video_call_sessions(room_id, started_at desc);

create table if not exists public.video_call_events (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.video_call_rooms(id) on delete cascade,
  session_id uuid references public.video_call_sessions(id) on delete set null,
  event_type text not null check (event_type in (
    'host_joined','guest_waiting','guest_admitted','guest_removed',
    'call_started','call_ended','participant_left','screen_share_started',
    'screen_share_stopped','connection_failed'
  )),
  actor_role text check (actor_role in ('host','guest','system')),
  details jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create index if not exists video_call_events_room_time_idx
  on public.video_call_events(room_id, occurred_at desc);

alter table public.video_call_sessions enable row level security;
alter table public.video_call_events enable row level security;

revoke all on public.video_call_sessions from anon, authenticated;
revoke all on public.video_call_events from anon, authenticated;
grant select, insert, update, delete on public.video_call_sessions to authenticated;
grant select, insert, update, delete on public.video_call_events to authenticated;
grant all on public.video_call_sessions to service_role;
grant all on public.video_call_events to service_role;

drop policy if exists "Tidori administrators manage video call sessions" on public.video_call_sessions;
create policy "Tidori administrators manage video call sessions"
  on public.video_call_sessions for all to authenticated
  using ((select private.is_tidori_admin()))
  with check ((select private.is_tidori_admin()));

drop policy if exists "Tidori administrators manage video call events" on public.video_call_events;
create policy "Tidori administrators manage video call events"
  on public.video_call_events for all to authenticated
  using ((select private.is_tidori_admin()))
  with check ((select private.is_tidori_admin()));

-- The Worker uses the service role to write lifecycle events. Browser users
-- cannot read guest credentials or meeting history directly.
