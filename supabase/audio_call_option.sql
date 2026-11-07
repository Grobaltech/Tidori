-- Add an online audio-only appointment option to Tidori.
-- Run once in the Tidori Supabase SQL Editor after the video-call foundation SQL.

alter table public.appointments
  drop constraint if exists appointments_meeting_mode_check;

alter table public.appointments
  add constraint appointments_meeting_mode_check
  check (meeting_mode in ('in_person', 'phone', 'audio', 'video'));

-- Store the media mode for standalone member test rooms as well as appointments.
alter table public.video_call_rooms
  add column if not exists call_mode text not null default 'video';

alter table public.video_call_rooms
  drop constraint if exists video_call_rooms_call_mode_check;

alter table public.video_call_rooms
  add constraint video_call_rooms_call_mode_check
  check (call_mode in ('audio', 'video'));
