-- Tidori role hierarchy and per-user permissions.
-- Apply to the ACTIVE Tidori project: yrsywklfharhkllrfdun.
-- Requires supabase/admin_access.sql to have been applied first.
-- This migration does not create Auth users or expose service-role credentials.

create table if not exists public.user_permissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  permission text not null,
  granted_by uuid references auth.users(id) on delete set null,
  granted_at timestamptz not null default now(),
  unique(user_id, permission),
  constraint user_permissions_key_check check (permission in (
    'members.view','members.add','members.edit','members.delete','members.approve','members.export',
    'events.view','events.add','events.edit','events.delete','events.approve','events.publish','events.export',
    'ministries.view','ministries.add','ministries.edit','ministries.delete','ministries.approve',
    'outreach.view','outreach.add','outreach.edit','outreach.delete','outreach.approve','outreach.publish','outreach.export',
    'website.manage',
    'messages.view','messages.reply','messages.delete','messages.export',
    'volunteers.view','volunteers.add','volunteers.edit','volunteers.delete','volunteers.approve','volunteers.export',
    'team.view','team.add','team.edit','team.delete','team.publish',
    'newsletter.view','newsletter.add','newsletter.edit','newsletter.delete','newsletter.export',
    'giving.view','giving.add','giving.edit','giving.approve','giving.export',
    'reports.view','reports.export'
  ))
);
create index if not exists user_permissions_user_id_idx on public.user_permissions(user_id);
alter table public.user_permissions enable row level security;
revoke all on public.user_permissions from anon, authenticated;
grant select on public.user_permissions to authenticated;

create table if not exists public.access_audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id) on delete set null,
  target_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  permission text,
  created_at timestamptz not null default now()
);
alter table public.access_audit_log enable row level security;
revoke all on public.access_audit_log from anon, authenticated;
grant select on public.access_audit_log to authenticated;

create or replace function private.can_manage_tidori_access()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role in ('admin','super_admin')
  );
$$;
revoke all on function private.can_manage_tidori_access() from public, anon;
grant execute on function private.can_manage_tidori_access() to authenticated;

create or replace function private.has_tidori_permission(permission_key text)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role in ('admin','super_admin')
  ) or exists (
    select 1 from public.user_permissions up
    where up.user_id = (select auth.uid()) and up.permission = permission_key
  );
$$;
revoke all on function private.has_tidori_permission(text) from public, anon;
grant execute on function private.has_tidori_permission(text) to authenticated;

create or replace function private.can_manage_tidori_user_permissions(target_id uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select
    (select private.can_manage_tidori_access())
    and target_id <> (select auth.uid())
    and exists (
      select 1 from public.profiles target
      where target.id = target_id and target.role in ('member','leader')
    );
$$;
revoke all on function private.can_manage_tidori_user_permissions(uuid) from public, anon;
grant execute on function private.can_manage_tidori_user_permissions(uuid) to authenticated;

drop policy if exists "Users read own permissions" on public.user_permissions;
create policy "Users read own permissions" on public.user_permissions
for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "Administrators read all user permissions" on public.user_permissions;
create policy "Administrators read all user permissions" on public.user_permissions
for select to authenticated using ((select private.can_manage_tidori_access()));
drop policy if exists "Administrators manage church user permissions" on public.user_permissions;
create policy "Administrators manage church user permissions" on public.user_permissions
for all to authenticated
using ((select private.can_manage_tidori_user_permissions(user_id)))
with check (
  (select private.can_manage_tidori_user_permissions(user_id))
  and granted_by = (select auth.uid())
);

drop policy if exists "Administrators read access audit log" on public.access_audit_log;
create policy "Administrators read access audit log" on public.access_audit_log
for select to authenticated using ((select private.can_manage_tidori_access()));

create or replace function public.replace_tidori_user_permissions(target_user_id uuid, permission_keys text[])
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_role text;
  allowed_keys text[] := array[
    'members.view','members.add','members.edit','members.delete','members.approve','members.export',
    'events.view','events.add','events.edit','events.delete','events.approve','events.publish','events.export',
    'ministries.view','ministries.add','ministries.edit','ministries.delete','ministries.approve',
    'outreach.view','outreach.add','outreach.edit','outreach.delete','outreach.approve','outreach.publish','outreach.export',
    'website.manage',
    'messages.view','messages.reply','messages.delete','messages.export',
    'volunteers.view','volunteers.add','volunteers.edit','volunteers.delete','volunteers.approve','volunteers.export',
    'team.view','team.add','team.edit','team.delete','team.publish',
    'newsletter.view','newsletter.add','newsletter.edit','newsletter.delete','newsletter.export',
    'giving.view','giving.add','giving.edit','giving.approve','giving.export',
    'reports.view','reports.export'
  ];
begin
  select p.role into caller_role from public.profiles p where p.id = (select auth.uid());
  if caller_role not in ('admin','super_admin') then
    raise exception 'Only Tidori administrators can manage church user permissions' using errcode = '42501';
  end if;
  if target_user_id = (select auth.uid()) then
    raise exception 'You cannot grant permissions to your own account' using errcode = '42501';
  end if;
  if not exists (select 1 from public.profiles p where p.id = target_user_id and p.role in ('member','leader')) then
    raise exception 'Permissions can only be assigned to church user accounts' using errcode = '42501';
  end if;
  if exists (select 1 from unnest(coalesce(permission_keys, array[]::text[])) k where not (k = any(allowed_keys))) then
    raise exception 'One or more permission keys are not recognised' using errcode = '22023';
  end if;

  delete from public.user_permissions where user_id = target_user_id;
  insert into public.user_permissions(user_id, permission, granted_by)
  select target_user_id, k, (select auth.uid())
  from (select distinct unnest(coalesce(permission_keys, array[]::text[])) as k) chosen;

  insert into public.access_audit_log(actor_id,target_user_id,action,permission)
  values ((select auth.uid()),target_user_id,'permissions_replaced',array_to_string(permission_keys,','));

  return jsonb_build_object('ok',true,'message','Permissions saved. The user should sign out and sign in again to refresh their access.');
end;
$$;
revoke all on function public.replace_tidori_user_permissions(uuid,text[]) from public, anon;
grant execute on function public.replace_tidori_user_permissions(uuid,text[]) to authenticated;

-- Protect existing operational tables with permission-aware policies.
-- Existing public published-content policies remain in place; these policies
-- add access for authorised church users and preserve full admin access.
do $$
declare item record;
begin
  for item in select * from (values
    ('events','events'),
    ('outreach_projects','outreach'),
    ('posts','website_manage'),
    ('team_members','team')
  ) as x(table_name,module_key)
  loop
    execute format('drop policy if exists %I on public.%I','Tidori administrators manage '||item.table_name,item.table_name);
    execute format('drop policy if exists %I on public.%I','Tidori permission select '||item.table_name,item.table_name);
    execute format('drop policy if exists %I on public.%I','Tidori permission insert '||item.table_name,item.table_name);
    execute format('drop policy if exists %I on public.%I','Tidori permission update '||item.table_name,item.table_name);
    execute format('drop policy if exists %I on public.%I','Tidori permission delete '||item.table_name,item.table_name);
    execute format('create policy %I on public.%I for select to authenticated using ((select private.has_tidori_permission(%L)))','Tidori permission select '||item.table_name,item.table_name,case when item.module_key = 'website_manage' then 'website.manage' else item.module_key||'.view' end);
    execute format('create policy %I on public.%I for insert to authenticated with check ((select private.has_tidori_permission(%L)))','Tidori permission insert '||item.table_name,item.table_name,case when item.module_key = 'website_manage' then 'website.manage' else item.module_key||'.add' end);
    execute format('create policy %I on public.%I for update to authenticated using ((select private.has_tidori_permission(%L))) with check ((select private.has_tidori_permission(%L)))','Tidori permission update '||item.table_name,item.table_name,case when item.module_key = 'website_manage' then 'website.manage' else item.module_key||'.edit' end,case when item.module_key = 'website_manage' then 'website.manage' else item.module_key||'.edit' end);
    execute format('create policy %I on public.%I for delete to authenticated using ((select private.has_tidori_permission(%L)))','Tidori permission delete '||item.table_name,item.table_name,case when item.module_key = 'website_manage' then 'website.manage' else item.module_key||'.delete' end);
    execute format('grant select,insert,update,delete on public.%I to authenticated',item.table_name);
  end loop;
end $$;

-- Private records remain private; church users receive only explicitly granted view/action rights.
do $$
declare item record;
begin
  for item in select * from (values
    ('contact_messages','messages'),
    ('volunteers','volunteers'),
    ('newsletter_subscribers','newsletter'),
    ('donation_pledges','giving')
  ) as x(table_name,module_key)
  loop
    execute format('drop policy if exists %I on public.%I','Tidori administrators read '||item.table_name,item.table_name);
    execute format('drop policy if exists %I on public.%I','Tidori permission select '||item.table_name,item.table_name);
    execute format('create policy %I on public.%I for select to authenticated using ((select private.has_tidori_permission(%L)))','Tidori permission select '||item.table_name,item.table_name,case when item.module_key = 'website_manage' then 'website.manage' else item.module_key||'.view' end);
    execute format('grant select on public.%I to authenticated',item.table_name);
  end loop;
end $$;

-- CMS tables stay administrator-only unless the user has the dedicated website.manage permission.
do $$
declare t text;
begin
  foreach t in array array['site_content','homepage_slides','site_ministries','site_facts'] loop
    if to_regclass('public.'||t) is not null then
      execute format('drop policy if exists %I on public.%I','Tidori administrators manage '||t,t);
      execute format('create policy %I on public.%I for all to authenticated using ((select private.has_tidori_permission(%L))) with check ((select private.has_tidori_permission(%L)))','Tidori website manage '||t,t,'website.manage','website.manage');
      execute format('grant select,insert,update,delete on public.%I to authenticated',t);
    end if;
  end loop;
end $$;

-- Permit explicitly authorised website managers to upload and maintain CMS media.
drop policy if exists "Tidori website managers upload media" on storage.objects;
create policy "Tidori website managers upload media" on storage.objects
for insert to authenticated with check (bucket_id = 'tidori-website' and (select private.has_tidori_permission('website.manage')));
drop policy if exists "Tidori website managers update media" on storage.objects;
create policy "Tidori website managers update media" on storage.objects
for update to authenticated using (bucket_id = 'tidori-website' and (select private.has_tidori_permission('website.manage')))
with check (bucket_id = 'tidori-website' and (select private.has_tidori_permission('website.manage')));
drop policy if exists "Tidori website managers delete media" on storage.objects;
create policy "Tidori website managers delete media" on storage.objects
for delete to authenticated using (bucket_id = 'tidori-website' and (select private.has_tidori_permission('website.manage')));

-- Profile directory access: self-service remains; explicit members.view enables directory access.
drop policy if exists "Tidori permission view profiles" on public.profiles;
create policy "Tidori permission view profiles" on public.profiles
for select to authenticated using ((select private.has_tidori_permission('members.view')) or (select private.has_tidori_permission('ministries.view')));

comment on table public.user_permissions is 'Individual permissions granted by Tidori administrators to church user accounts.';
comment on table public.access_audit_log is 'Audit history for Tidori access-control changes.';
