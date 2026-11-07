-- Tidori video-call workflow: lock appointments once a room is issued,
-- and allow signed-in members to create private test rooms from their accounts.
-- Run in the Tidori Supabase SQL Editor after video_call_foundation.sql and
-- video_call_phase4_security_history.sql.

alter table public.video_call_rooms
  alter column appointment_id drop not null,
  add column if not exists owner_user_id uuid references auth.users(id) on delete cascade,
  add column if not exists is_test boolean not null default false;

create index if not exists video_call_rooms_owner_idx
  on public.video_call_rooms(owner_user_id, created_at desc)
  where is_test = true;

-- Only the owner may create and view their own test rooms. Ordinary members
-- cannot create rooms attached to real appointments or issue host credentials
-- for another person's appointment.
drop policy if exists "Members create own video test rooms" on public.video_call_rooms;
create policy "Members create own video test rooms"
  on public.video_call_rooms
  for insert to authenticated
  with check (
    is_test = true
    and appointment_id is null
    and owner_user_id = (select auth.uid())
    and created_by = (select auth.uid())
    and status = 'scheduled'
  );

drop policy if exists "Members view own video test rooms" on public.video_call_rooms;
create policy "Members view own video test rooms"
  on public.video_call_rooms
  for select to authenticated
  using (is_test = true and owner_user_id = (select auth.uid()));

drop policy if exists "Members create participants for own video test rooms" on public.video_call_participants;
create policy "Members create participants for own video test rooms"
  on public.video_call_participants
  for insert to authenticated
  with check (
    exists (
      select 1 from public.video_call_rooms r
      where r.id = room_id
        and r.is_test = true
        and r.owner_user_id = (select auth.uid())
    )
  );

drop policy if exists "Members view participants for own video test rooms" on public.video_call_participants;
create policy "Members view participants for own video test rooms"
  on public.video_call_participants
  for select to authenticated
  using (
    exists (
      select 1 from public.video_call_rooms r
      where r.id = room_id
        and r.is_test = true
        and r.owner_user_id = (select auth.uid())
    )
  );

-- Once a real appointment has a generated video room, its appointment record
-- remains in the database but is immutable from the management interface.
create or replace function public.prevent_editing_appointment_with_video_room()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if exists (
    select 1
    from public.video_call_rooms r
    where r.appointment_id = old.id
      and r.is_test = false
  ) then
    raise exception 'This appointment has a saved video room and is now view-only.';
  end if;
  return new;
end;
$$;

revoke all on function public.prevent_editing_appointment_with_video_room() from public, anon, authenticated;

drop trigger if exists prevent_editing_appointment_with_video_room on public.appointments;
create trigger prevent_editing_appointment_with_video_room
  before update or delete on public.appointments
  for each row execute function public.prevent_editing_appointment_with_video_room();
