-- Tidori: safely promote the only existing Auth account to super administrator.
-- Run in Supabase Dashboard > SQL Editor for the ACTIVE Tidori project.
-- This deliberately changes no account unless exactly one Auth user exists.

begin;

alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('member', 'leader', 'admin', 'super_admin'));

update public.profiles
set role = 'super_admin',
    updated_at = now()
where id = (
  select id from auth.users limit 1
)
and (select count(*) from auth.users) = 1;

select
  (select count(*) from auth.users) as auth_user_count,
  p.id,
  p.email,
  p.role
from public.profiles p
join auth.users u on u.id = p.id
where p.role = 'super_admin';

commit;
