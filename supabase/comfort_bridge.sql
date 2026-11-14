-- Tidori Ministries: The Comfort Bridge / Grace Pool
-- Run once in the connected Tidori Supabase SQL Editor.
begin;
alter table public.donation_pledges add column if not exists programme text;
alter table public.donation_pledges add column if not exists dedication text;
create index if not exists donation_pledges_programme_status_idx on public.donation_pledges(programme,status,created_at desc);
create table if not exists public.comfort_bridge_applications (
 id uuid primary key default gen_random_uuid(), reference text not null unique check(char_length(reference) between 6 and 32), full_name text not null check(char_length(full_name) between 2 and 120),
 email text not null check(char_length(email) between 3 and 200), phone text,
 preferred_contact text not null default 'Phone' check(preferred_contact in ('Phone','Email','WhatsApp')),
 support_type text not null, loss_category text not null default 'Prefer to discuss privately', preferred_time text,
 private_message text check(private_message is null or char_length(private_message)<=2000),
 status text not null default 'new' check(status in ('new','under_review','approved','waitlisted','declined','sponsored','completed')),
 consent_at timestamptz not null, reviewed_at timestamptz, created_at timestamptz not null default now()
);
create table if not exists public.comfort_bridge_allocations (
 id uuid primary key default gen_random_uuid(), donation_pledge_id uuid not null references public.donation_pledges(id),
 application_id uuid not null references public.comfort_bridge_applications(id),
 allocation_type text not null check(allocation_type in ('seed_gift','prayer_altar','full_package')),
 amount numeric(12,2) not null check(amount>0), currency text not null default 'UGX',
 status text not null default 'allocated' check(status in ('allocated','completed','reversed')), created_at timestamptz not null default now(),
 unique(donation_pledge_id,application_id,allocation_type)
);
create table if not exists public.comfort_bridge_prayer_assignments (
 id uuid primary key default gen_random_uuid(), application_id uuid not null references public.comfort_bridge_applications(id),
 assigned_to text not null check(char_length(assigned_to) between 2 and 120), starts_at timestamptz not null, ends_at timestamptz not null, end_reminder_sent_at timestamptz,
 status text not null default 'active' check(status in ('active','completed','cancelled')), private_notes text, created_at timestamptz not null default now(), check(ends_at>starts_at)
);
create table if not exists public.comfort_bridge_sessions (
 id uuid primary key default gen_random_uuid(), application_id uuid not null references public.comfort_bridge_applications(id),
 scheduled_at timestamptz not null, reminder_sent_at timestamptz, session_type text not null default 'one_on_one' check(session_type in ('one_on_one','follow_up')),
 meeting_mode text not null default 'phone' check(meeting_mode in ('phone','in_person','video','audio')),
 status text not null default 'scheduled' check(status in ('scheduled','completed','cancelled','no_show')), private_notes text, created_at timestamptz not null default now()
);
create or replace function public.is_tidori_admin()
returns boolean language sql stable security definer set search_path=public
as $$ select exists(select 1 from public.profiles p where p.id=auth.uid() and p.role in ('admin','super_admin')); $$;
revoke all on function public.is_tidori_admin() from public;
grant execute on function public.is_tidori_admin() to authenticated;
create or replace function public.is_tidori_comfort_bridge_manager()
returns boolean language sql stable security definer set search_path=public
as $$ select public.is_tidori_admin() or exists(
 select 1 from public.user_permissions up where up.user_id=auth.uid() and up.permission='comfort_bridge.manage'
); $$;
revoke all on function public.is_tidori_comfort_bridge_manager() from public;
grant execute on function public.is_tidori_comfort_bridge_manager() to authenticated;
alter table public.comfort_bridge_applications enable row level security;
alter table public.comfort_bridge_allocations enable row level security;
alter table public.comfort_bridge_prayer_assignments enable row level security;
alter table public.comfort_bridge_sessions enable row level security;
alter table public.donation_pledges enable row level security;
drop policy if exists "comfort bridge public application insert" on public.comfort_bridge_applications;
create policy "comfort bridge public application insert" on public.comfort_bridge_applications for insert to anon,authenticated with check(status='new' and reviewed_at is null and consent_at is not null);
drop policy if exists "comfort bridge admin applications" on public.comfort_bridge_applications;
create policy "comfort bridge admin applications" on public.comfort_bridge_applications for select to authenticated using(public.is_tidori_comfort_bridge_manager());
drop policy if exists "comfort bridge admin application update" on public.comfort_bridge_applications;
create policy "comfort bridge admin application update" on public.comfort_bridge_applications for update to authenticated using(public.is_tidori_comfort_bridge_manager()) with check(public.is_tidori_comfort_bridge_manager());
drop policy if exists "comfort bridge admin allocations" on public.comfort_bridge_allocations;
create policy "comfort bridge admin allocations" on public.comfort_bridge_allocations for select to authenticated using(public.is_tidori_comfort_bridge_manager());
drop policy if exists "comfort bridge admin allocation update" on public.comfort_bridge_allocations;
create policy "comfort bridge admin allocation update" on public.comfort_bridge_allocations for update to authenticated using(public.is_tidori_comfort_bridge_manager()) with check(public.is_tidori_comfort_bridge_manager());
drop policy if exists "comfort bridge admin prayer" on public.comfort_bridge_prayer_assignments;
create policy "comfort bridge admin prayer" on public.comfort_bridge_prayer_assignments for all to authenticated using(public.is_tidori_comfort_bridge_manager()) with check(public.is_tidori_comfort_bridge_manager());
drop policy if exists "comfort bridge admin sessions" on public.comfort_bridge_sessions;
create policy "comfort bridge admin sessions" on public.comfort_bridge_sessions for all to authenticated using(public.is_tidori_comfort_bridge_manager()) with check(public.is_tidori_comfort_bridge_manager());
drop policy if exists "comfort bridge admin donation read" on public.donation_pledges;
create policy "comfort bridge admin donation read" on public.donation_pledges for select to authenticated using(public.is_tidori_comfort_bridge_manager());
create or replace function public.comfort_bridge_public_impact()
returns json language sql stable security definer set search_path=public
as $$
 select json_build_object(
  'contributions',count(*) filter(where status='paid'),
  'amount_ugx',coalesce(sum(amount) filter(where status='paid' and currency='UGX'),0),
  'amount_usd',coalesce(sum(amount) filter(where status='paid' and currency='USD'),0),
  'people_supported',(select count(distinct application_id) from public.comfort_bridge_allocations where status='completed')
 ) from public.donation_pledges where programme='comfort_bridge';
$$;
grant execute on function public.comfort_bridge_public_impact() to anon,authenticated;
grant insert on public.comfort_bridge_applications to anon,authenticated;
grant select,update on public.comfort_bridge_applications to authenticated;
grant select,update on public.comfort_bridge_allocations to authenticated;
grant select,insert,update on public.comfort_bridge_prayer_assignments to authenticated;
grant select,insert,update on public.comfort_bridge_sessions to authenticated;
grant select on public.donation_pledges to authenticated;
create or replace function public.comfort_bridge_allocate(p_donation_id uuid,p_application_id uuid,p_amount numeric,p_allocation_type text)
returns uuid language plpgsql security definer set search_path=public
as $$
declare d public.donation_pledges%rowtype; a public.comfort_bridge_applications%rowtype; already numeric; new_id uuid;
begin
 if not public.is_tidori_comfort_bridge_manager() then raise exception 'Comfort Bridge manager access required'; end if;
 if p_amount is null or p_amount<=0 then raise exception 'Enter a valid allocation amount'; end if;
 select * into d from public.donation_pledges where id=p_donation_id and programme='comfort_bridge' and status='paid' for update;
 if not found then raise exception 'Only verified paid Grace Pool contributions can be allocated'; end if;
 select * into a from public.comfort_bridge_applications where id=p_application_id and status in ('approved','sponsored') for update;
 if not found then raise exception 'Select an approved beneficiary'; end if;
 select coalesce(sum(amount),0) into already from public.comfort_bridge_allocations where donation_pledge_id=d.id and status<>'reversed';
 if already+p_amount>d.amount then raise exception 'Allocation exceeds the unallocated balance of this contribution'; end if;
 if p_allocation_type not in ('seed_gift','prayer_altar','full_package') then raise exception 'Invalid allocation type'; end if;
 insert into public.comfort_bridge_allocations(donation_pledge_id,application_id,allocation_type,amount,currency)
 values(d.id,a.id,p_allocation_type,p_amount,d.currency) returning id into new_id;
 update public.comfort_bridge_applications set status='sponsored',reviewed_at=coalesce(reviewed_at,now()) where id=a.id;
 return new_id;
end;
$$;
revoke all on function public.comfort_bridge_allocate(uuid,uuid,numeric,text) from public;
grant execute on function public.comfort_bridge_allocate(uuid,uuid,numeric,text) to authenticated;
commit;
