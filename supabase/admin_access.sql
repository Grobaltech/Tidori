-- Tidori administrator access for the existing live schema.
-- Run this in the Tidori project's Supabase Dashboard > SQL Editor.
-- This does not change public website styling or public-facing content.

-- The current profile role constraint omits super_admin even though the app
-- already recognises that role. Extend the allowed values without changing
-- existing member/leader/admin rows.
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check
  check (role in ('member','leader','admin','super_admin'));

-- Private role-check helper. It reads profiles as the function owner so the
-- profiles RLS policy does not recursively call itself.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create or replace function private.is_tidori_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role in ('admin', 'super_admin')
  );
$$;

revoke all on function private.is_tidori_admin() from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.is_tidori_admin() to authenticated;

-- Profiles: administrators may read all profiles; members retain their
-- existing own-profile access. This migration does not grant role editing.
drop policy if exists "Administrators read all profiles" on public.profiles;
create policy "Administrators read all profiles"
  on public.profiles for select to authenticated
  using ((select private.is_tidori_admin()));

-- Public content: admins can manage records while visitors retain the
-- existing published-only SELECT policies.
do $$
declare t text;
begin
  foreach t in array array['outreach_projects','events','posts','team_members'] loop
    execute format('drop policy if exists %I on public.%I', 'Tidori administrators manage ' || t, t);
    execute format(
      'create policy %I on public.%I for all to authenticated using ((select private.is_tidori_admin())) with check ((select private.is_tidori_admin()))',
      'Tidori administrators manage ' || t, t
    );
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;

-- Private submissions and giving records: administrator read access only.
do $$
declare t text;
begin
  foreach t in array array['contact_messages','volunteers','newsletter_subscribers','donation_pledges'] loop
    execute format('drop policy if exists %I on public.%I', 'Tidori administrators read ' || t, t);
    execute format(
      'create policy %I on public.%I for select to authenticated using ((select private.is_tidori_admin()))',
      'Tidori administrators read ' || t, t
    );
    execute format('grant select on public.%I to authenticated', t);
  end loop;
end $$;

-- Keep row-level security enabled on all tables used by the admin portal.
alter table public.profiles enable row level security;
alter table public.outreach_projects enable row level security;
alter table public.events enable row level security;
alter table public.posts enable row level security;
alter table public.team_members enable row level security;
alter table public.contact_messages enable row level security;
alter table public.volunteers enable row level security;
alter table public.newsletter_subscribers enable row level security;
alter table public.donation_pledges enable row level security;
