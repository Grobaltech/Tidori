-- Tidori Ministries: automatic appointment pricing and financial records.
-- Run this once in the ACTIVE Tidori Supabase SQL Editor.
-- Existing Pesapal donation tables and payment flow are not replaced.

alter table public.appointments
  add column if not exists fee_rule_id uuid,
  add column if not exists pesapal_merchant_reference text,
  add column if not exists pesapal_order_tracking_id text,
  add column if not exists paid_at timestamptz;

create unique index if not exists appointments_pesapal_reference_uidx
  on public.appointments(pesapal_merchant_reference)
  where pesapal_merchant_reference is not null;
create unique index if not exists appointments_pesapal_tracking_uidx
  on public.appointments(pesapal_order_tracking_id)
  where pesapal_order_tracking_id is not null;

create table if not exists public.appointment_fee_rules (
  id uuid primary key default gen_random_uuid(),
  appointment_type text not null,
  meeting_mode text not null check (meeting_mode in ('in_person','phone','audio','video')),
  amount numeric(12,2) not null check (amount >= 0 and amount <= 1000000),
  currency text not null default 'UGX' check (currency in ('UGX','USD')),
  is_active boolean not null default true,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (appointment_type, meeting_mode)
);

create table if not exists public.finance_expenses (
  id uuid primary key default gen_random_uuid(),
  expense_date date not null default current_date,
  category text not null check (char_length(category) between 2 and 80),
  description text not null check (char_length(description) between 2 and 500),
  amount numeric(12,2) not null check (amount > 0 and amount <= 1000000000),
  currency text not null default 'UGX' check (currency in ('UGX','USD')),
  payment_method text not null default 'Cash',
  reference text,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists finance_expenses_date_idx on public.finance_expenses(expense_date desc);
create index if not exists finance_expenses_category_idx on public.finance_expenses(category);
create index if not exists appointment_fee_rules_active_idx on public.appointment_fee_rules(is_active);

alter table public.appointment_fee_rules enable row level security;
alter table public.finance_expenses enable row level security;

revoke all on public.appointment_fee_rules from anon, authenticated;
revoke all on public.finance_expenses from anon, authenticated;
grant select on public.appointment_fee_rules to anon, authenticated;
grant insert, update, delete on public.appointment_fee_rules to authenticated;
grant select, insert, update, delete on public.finance_expenses to authenticated;
grant all on public.appointment_fee_rules, public.finance_expenses to service_role;

drop policy if exists "Public can view active appointment fees" on public.appointment_fee_rules;
create policy "Public can view active appointment fees" on public.appointment_fee_rules
  for select to anon, authenticated using (is_active = true);

drop policy if exists "Administrators manage appointment fees" on public.appointment_fee_rules;
create policy "Administrators manage appointment fees" on public.appointment_fee_rules
  for all to authenticated
  using ((select private.is_tidori_admin()))
  with check ((select private.is_tidori_admin()));

drop policy if exists "Administrators view finance expenses" on public.finance_expenses;
create policy "Administrators view finance expenses" on public.finance_expenses
  for select to authenticated using ((select private.is_tidori_admin()));

drop policy if exists "Administrators add finance expenses" on public.finance_expenses;
create policy "Administrators add finance expenses" on public.finance_expenses
  for insert to authenticated with check ((select private.is_tidori_admin()));

drop policy if exists "Administrators update finance expenses" on public.finance_expenses;
create policy "Administrators update finance expenses" on public.finance_expenses
  for update to authenticated
  using ((select private.is_tidori_admin()))
  with check ((select private.is_tidori_admin()));

drop policy if exists "Administrators delete finance expenses" on public.finance_expenses;
create policy "Administrators delete finance expenses" on public.finance_expenses
  for delete to authenticated using ((select private.is_tidori_admin()));

