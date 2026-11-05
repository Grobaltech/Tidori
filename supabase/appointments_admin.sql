-- Pastor appointment administration and payment tracking.
-- Run this in the SQL Editor of the Supabase project used by the Tidori website.
-- This is safe to run whether or not the appointments table already exists.

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (char_length(full_name) between 2 and 120),
  email text check (email is null or char_length(email) <= 200),
  phone text check (phone is null or char_length(phone) <= 40),
  appointment_type text not null default 'Appointment with the Pastor',
  requested_at timestamptz,
  notes text check (notes is null or char_length(notes) <= 2000),
  status text not null default 'requested' check (status in ('requested','confirmed','completed','cancelled')),
  created_at timestamptz not null default now()
);

alter table public.appointments
  add column if not exists payment_status text not null default 'unpaid',
  add column if not exists fee_amount numeric(12,2) not null default 0,
  add column if not exists currency text not null default 'UGX',
  add column if not exists payment_method text,
  add column if not exists payment_reference text,
  add column if not exists admin_notes text,
  add column if not exists confirmed_at timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'appointments_payment_status_check') then
    alter table public.appointments add constraint appointments_payment_status_check
      check (payment_status in ('unpaid', 'paid', 'waived'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'appointments_fee_amount_check') then
    alter table public.appointments add constraint appointments_fee_amount_check
      check (fee_amount >= 0 and fee_amount <= 1000000);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'appointments_currency_check') then
    alter table public.appointments add constraint appointments_currency_check
      check (currency in ('UGX', 'USD'));
  end if;
end $$;

alter table public.appointments enable row level security;
revoke all on public.appointments from anon, authenticated;
grant insert on public.appointments to anon, authenticated;
grant select, update on public.appointments to authenticated;
grant all on public.appointments to service_role;

drop policy if exists "Public can request an appointment" on public.appointments;
create policy "Public can request an appointment" on public.appointments
  for insert to anon, authenticated
  with check (status = 'requested' and payment_status = 'unpaid' and fee_amount = 0);

drop policy if exists "Tidori administrators can view appointments" on public.appointments;
create policy "Tidori administrators can view appointments" on public.appointments
  for select to authenticated
  using (
    (select private.is_tidori_admin())
  );

drop policy if exists "Tidori administrators can update appointments" on public.appointments;
create policy "Tidori administrators can update appointments" on public.appointments
  for update to authenticated
  using (
    (select private.is_tidori_admin())
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid())
        and p.role in ('admin', 'super_admin')
    )
  );

create index if not exists appointments_created_at_idx on public.appointments(created_at desc);
create index if not exists appointments_requested_at_idx on public.appointments(requested_at);
