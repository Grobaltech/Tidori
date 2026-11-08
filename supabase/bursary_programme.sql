-- Tidori Ministries: Bursary & Scholarship Programme
-- Run once in Supabase SQL Editor after the existing payments.sql migration.
-- National identification numbers are private personal data. RLS intentionally
-- exposes no direct table access; the Cloudflare Worker uses service_role only.

create table if not exists public.bursary_applications (
  id uuid primary key default gen_random_uuid(),
  applicant_id uuid not null references auth.users(id) on delete cascade,
  applicant_name text not null,
  applicant_email text not null,
  applicant_phone text,
  application_fee numeric(12,2) not null default 11000 check (application_fee = 11000),
  currency text not null default 'UGX' check (currency = 'UGX'),
  payment_status text not null default 'pending' check (payment_status in ('pending','paid','failed','reversed')),
  application_status text not null default 'awaiting_payment' check (application_status in ('awaiting_payment','draft','submitted','under_review','approved','rejected')),
  merchant_reference text not null unique,
  pesapal_order_tracking_id text unique,
  paid_at timestamptz,
  application_serial text unique,
  class_applied_for text,
  level_applied_for text,
  guardian_name text,
  guardian_contact text,
  guardian_email text,
  region text,
  district text,
  county text,
  subcounty text,
  parish text,
  village text,
  former_school text,
  stipulated_results text,
  first_choice text,
  option_one text,
  option_two text,
  national_id_number text,
  national_id_document_path text,
  passport_photo_path text,
  applicant_photo_url text,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists bursary_applications_applicant_created_idx
  on public.bursary_applications (applicant_id, created_at desc);
create index if not exists bursary_applications_payment_status_idx
  on public.bursary_applications (payment_status, created_at desc);

alter table public.bursary_applications enable row level security;
revoke all on public.bursary_applications from anon, authenticated;
grant all on public.bursary_applications to service_role;

-- Private bucket reserved for applicant passport photographs and National ID
-- scans. Files must be stored beneath the applicant's UUID folder.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('bursary-private', 'bursary-private', false, 10485760,
  array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Applicants upload own bursary documents" on storage.objects;
create policy "Applicants upload own bursary documents"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'bursary-private' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "Applicants read own bursary documents" on storage.objects;
create policy "Applicants read own bursary documents"
  on storage.objects for select to authenticated
  using (bucket_id = 'bursary-private' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "Applicants update own bursary documents" on storage.objects;
create policy "Applicants update own bursary documents"
  on storage.objects for update to authenticated
  using (bucket_id = 'bursary-private' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'bursary-private' and (storage.foldername(name))[1] = (select auth.uid())::text);
