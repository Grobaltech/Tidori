-- Tidori member location fields
-- Run once in Supabase Dashboard > SQL Editor.
-- Reuses the same Uganda administrative data and LocationPicker as the bursary form.

alter table public.profiles
  add column if not exists place_of_origin jsonb not null default '{}'::jsonb,
  add column if not exists current_address jsonb not null default '{}'::jsonb;

grant update (place_of_origin, current_address) on public.profiles to authenticated;

comment on column public.profiles.place_of_origin is
  'Member place of origin, stored as structured Uganda administrative location JSON.';
comment on column public.profiles.current_address is
  'Member current residential address, stored as structured Uganda administrative location JSON.';
