-- Tidori Ministries: Bronze / Silver / Gold pastor appointment packages.
-- Run once in the ACTIVE Tidori Supabase SQL Editor before deploying the Worker/frontend changes.

create table if not exists public.pastor_appointment_packages (
  id uuid primary key default gen_random_uuid(),
  tier_code text not null unique check (tier_code in ('bronze','silver','gold')),
  package_name text not null,
  amount numeric(12,2) not null default 0 check (amount >= 0 and amount <= 1000000),
  currency text not null default 'UGX' check (currency in ('UGX','USD')),
  is_active boolean not null default true,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.appointments
  add column if not exists package_tier text
    check (package_tier is null or package_tier in ('bronze','silver','gold'));

alter table public.appointments
  add column if not exists billing_period text
    check (billing_period is null or billing_period in ('monthly','annual'));

alter table public.pastor_appointment_packages enable row level security;
revoke all on public.pastor_appointment_packages from anon, authenticated;
grant select on public.pastor_appointment_packages to anon, authenticated;
grant insert, update, delete on public.pastor_appointment_packages to authenticated;
grant all on public.pastor_appointment_packages to service_role;

drop policy if exists "Public can view active pastor appointment packages" on public.pastor_appointment_packages;
create policy "Public can view active pastor appointment packages"
  on public.pastor_appointment_packages for select to anon, authenticated
  using (is_active = true);

drop policy if exists "Administrators manage pastor appointment packages" on public.pastor_appointment_packages;
create policy "Administrators manage pastor appointment packages"
  on public.pastor_appointment_packages for all to authenticated
  using ((select private.is_tidori_admin()))
  with check ((select private.is_tidori_admin()));

create index if not exists pastor_appointment_packages_active_idx
  on public.pastor_appointment_packages(is_active);
