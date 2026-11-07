-- Add an online audio-only appointment option to Tidori.
-- Run once in the Tidori Supabase SQL Editor after the video-call foundation SQL.

alter table public.appointments
  drop constraint if exists appointments_meeting_mode_check;

alter table public.appointments
  add constraint appointments_meeting_mode_check
  check (meeting_mode in ('in_person', 'phone', 'audio', 'video'));
