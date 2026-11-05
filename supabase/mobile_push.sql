-- Tidori Android push notifications and appointment records.
-- Apply after the core schema and role/access migrations.
create table if not exists public.push_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token text not null unique,
  platform text not null default 'android' check (platform in ('android','ios','web')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists push_devices_user_active_idx on public.push_devices(user_id,active);
alter table public.push_devices enable row level security;
revoke all on public.push_devices from anon, authenticated;
grant all on public.push_devices to service_role;

-- Appointment requests are private; the public may submit, but cannot read them.
create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (char_length(full_name) between 2 and 120),
  email text check (email is null or char_length(email) <= 200),
  phone text check (phone is null or char_length(phone) <= 40),
  appointment_type text not null default 'General appointment',
  requested_at timestamptz,
  notes text check (notes is null or char_length(notes) <= 2000),
  status text not null default 'requested' check (status in ('requested','confirmed','completed','cancelled')),
  created_at timestamptz not null default now()
);
alter table public.appointments enable row level security;
revoke all on public.appointments from anon, authenticated;
grant insert on public.appointments to anon, authenticated;
grant select,insert,update,delete on public.appointments to service_role;
drop policy if exists "Public can request an appointment" on public.appointments;
create policy "Public can request an appointment" on public.appointments
for insert to anon, authenticated
with check (status = 'requested');

-- Idempotency receipts prevent duplicate registration/appointment notifications on webhook retries.
create table if not exists public.push_event_receipts (
  event_key text primary key,
  event_type text not null,
  created_at timestamptz not null default now()
);
alter table public.push_event_receipts enable row level security;
revoke all on public.push_event_receipts from anon, authenticated;
grant all on public.push_event_receipts to service_role;
