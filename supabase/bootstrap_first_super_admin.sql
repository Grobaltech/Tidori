-- Bootstrap the first and only Tidori account as the platform super administrator.
-- Run in Supabase SQL Editor for the active Tidori project.
-- Safety: this promotes nobody unless exactly one Auth user exists.
begin;

alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('member', 'leader', 'admin', 'super_admin'));

update public.profiles p
set role = 'super_admin',
    updated_at = now()
where p.id = (
  select u.id
  from auth.users u
  having count(*) = 1
);

-- Verify the result. This should return exactly one row with role=super_admin
-- while the project still has exactly one Auth user.
select p.id, p.email, p.role
from public.profiles p
join auth.users u on u.id = p.id
where p.role = 'super_admin';

commit;
