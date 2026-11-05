-- Tidori Ministries: Pesapal live donations
-- Run once in Supabase SQL Editor after schema.sql has been applied.
alter table public.donation_pledges
  add column if not exists currency text not null default 'UGX',
  add column if not exists phone text,
  add column if not exists merchant_reference text,
  add column if not exists pesapal_order_tracking_id text,
  add column if not exists payment_method text,
  add column if not exists confirmation_code text,
  add column if not exists paid_at timestamptz;

alter table public.donation_pledges alter column currency set default 'UGX';

create unique index if not exists donation_pledges_merchant_reference_uidx
  on public.donation_pledges (merchant_reference)
  where merchant_reference is not null;

create unique index if not exists donation_pledges_pesapal_tracking_uidx
  on public.donation_pledges (pesapal_order_tracking_id)
  where pesapal_order_tracking_id is not null;

create index if not exists donation_pledges_status_created_idx
  on public.donation_pledges (status, created_at desc);

-- Payment rows are created and updated by the Cloudflare Worker using the
-- Supabase service-role key. Visitors retain no read or update access.
