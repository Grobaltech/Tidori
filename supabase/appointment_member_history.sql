-- Allow signed-in members to read only their own appointment history.
-- Administrators retain access through the existing administrator policy.
alter table public.appointments
  add column if not exists user_id uuid references auth.users(id) on delete set null;

drop policy if exists "Members can view their own appointments" on public.appointments;
create policy "Members can view their own appointments"
  on public.appointments
  for select to authenticated
  using (user_id = (select auth.uid()));

create index if not exists appointments_user_history_idx
  on public.appointments(user_id, created_at desc)
  where user_id is not null;
