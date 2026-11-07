-- Tidori member notification inbox and event notifications.
-- Run once in the ACTIVE Tidori Supabase SQL Editor.
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  body text not null default '' check (char_length(body) <= 1000),
  notification_type text not null default 'general',
  action_path text not null default '/notifications',
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_created_idx
  on public.notifications(user_id, created_at desc);
create index if not exists notifications_unread_idx
  on public.notifications(user_id, created_at desc) where read_at is null;
alter table public.notifications enable row level security;
revoke all on public.notifications from anon, authenticated;
grant select, update, delete on public.notifications to authenticated;
drop policy if exists "Members read their own notifications" on public.notifications;
create policy "Members read their own notifications" on public.notifications
  for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "Members update their own notifications" on public.notifications;
create policy "Members update their own notifications" on public.notifications
  for update to authenticated using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
drop policy if exists "Members delete their own notifications" on public.notifications;
create policy "Members delete their own notifications" on public.notifications
  for delete to authenticated using (user_id = (select auth.uid()));

create or replace function private.create_tidori_notification(
  target_user_id uuid, notification_title text, notification_body text,
  notification_kind text, target_path text
) returns void
language plpgsql security definer
set search_path = ''
as $function$
begin
  if target_user_id is null then return; end if;
  insert into public.notifications(user_id,title,body,notification_type,action_path)
  values (target_user_id, left(notification_title,160), left(coalesce(notification_body,''),1000),
    coalesce(nullif(notification_kind,''),'general'),
    case when target_path like '/%' and target_path not like '//%' then target_path else '/notifications' end);
end;
$function$;
revoke all on function private.create_tidori_notification(uuid,text,text,text,text) from public, anon, authenticated;

create or replace function private.notify_tidori_message()
returns trigger language plpgsql security definer set search_path = ''
as $function$
declare recipient record; sender_name text;
begin
  select coalesce(nullif(btrim(full_name),''),'A Tidori member') into sender_name
  from public.profiles where id = new.sender_id;
  for recipient in
    select user_id from public.community_conversation_members
    where conversation_id = new.conversation_id and user_id <> new.sender_id
  loop
    perform private.create_tidori_notification(recipient.user_id,
      'New private message', coalesce(sender_name,'A Tidori member') || ' sent you a message.',
      'message','/community');
  end loop;
  return new;
end;
$function$;
revoke all on function private.notify_tidori_message() from public, anon, authenticated;
drop trigger if exists tidori_message_notification on public.community_messages;
create trigger tidori_message_notification after insert on public.community_messages
for each row execute function private.notify_tidori_message();

create or replace function private.notify_tidori_prayer()
returns trigger language plpgsql security definer set search_path = ''
as $function$
declare leader record;
begin
  if tg_op = 'INSERT' then
    if new.visibility in ('leaders','church') then
      for leader in select id from public.profiles where role in ('leader','admin','super_admin') and id <> new.user_id loop
        perform private.create_tidori_notification(leader.id,'New prayer request',
          'A member shared a prayer request: ' || left(new.title,120),
          'prayer','/community');
      end loop;
    end if;
    return new;
  end if;
  if new.status is distinct from old.status and new.user_id <> (select auth.uid()) then
    perform private.create_tidori_notification(new.user_id,'Prayer request updated',
      'Your prayer request "' || left(new.title,120) || '" is now marked ' || new.status || '.',
      'prayer','/community');
  end if;
  return new;
end;
$function$;
revoke all on function private.notify_tidori_prayer() from public, anon, authenticated;
drop trigger if exists tidori_prayer_insert_notification on public.prayer_requests;
create trigger tidori_prayer_insert_notification after insert on public.prayer_requests
for each row execute function private.notify_tidori_prayer();
drop trigger if exists tidori_prayer_update_notification on public.prayer_requests;
create trigger tidori_prayer_update_notification after update of status on public.prayer_requests
for each row execute function private.notify_tidori_prayer();

-- Link authenticated appointment requests to their member account so status changes can be delivered privately.
alter table public.appointments add column if not exists user_id uuid references auth.users(id) on delete set null;

-- A signed-in visitor may only attach their own account to an appointment.
drop policy if exists "Public can request an appointment" on public.appointments;
create policy "Public can request an appointment" on public.appointments
  for insert to anon, authenticated
  with check (
    status = 'requested' and payment_status = 'unpaid' and fee_amount = 0
    and (user_id is null or user_id = (select auth.uid()))
  );

-- Notify administrators on new requests and the member when their appointment changes.
create or replace function private.notify_tidori_appointment()
returns trigger language plpgsql security definer set search_path = ''
as $function$
declare admin_row record; requester uuid;
begin
  requester := nullif(to_jsonb(new)->>'user_id','')::uuid;
  if tg_op = 'INSERT' then
    for admin_row in select id from public.profiles where role in ('admin','super_admin') loop
      perform private.create_tidori_notification(admin_row.id,'New appointment request',
        coalesce(new.appointment_type,'Church appointment') || ' requested by ' || coalesce(new.full_name,'a visitor') || '.',
        'appointment','/admin');
    end loop;
    if requester is not null then
      perform private.create_tidori_notification(requester,'Appointment request received',
        'Your appointment request has been received and is awaiting confirmation.',
        'appointment','/appointments');
    end if;
  elsif requester is not null and (new.status is distinct from old.status or new.payment_status is distinct from old.payment_status) then
    perform private.create_tidori_notification(requester,'Appointment updated',
      'Your appointment is now ' || coalesce(new.status,'requested') ||
      CASE WHEN new.payment_status is distinct from old.payment_status THEN ' · Payment: ' || coalesce(new.payment_status,'unpaid') ELSE '' END || '.',
      'appointment','/appointments');
  end if;
  return new;
end;
$function$;
revoke all on function private.notify_tidori_appointment() from public, anon, authenticated;
drop trigger if exists tidori_appointment_insert_notification on public.appointments;
create trigger tidori_appointment_insert_notification after insert on public.appointments
for each row execute function private.notify_tidori_appointment();
drop trigger if exists tidori_appointment_update_notification on public.appointments;
create trigger tidori_appointment_update_notification after update of status, payment_status on public.appointments
for each row execute function private.notify_tidori_appointment();

do $block$
begin
  if exists (select 1 from pg_publication where pubname='supabase_realtime')
     and not exists (select 1 from pg_publication_tables where pubname='supabase_realtime'
       and schemaname='public' and tablename='notifications') then
    alter publication supabase_realtime add table public.notifications;
  end if;
end
$block$;
comment on table public.notifications is 'Private, user-scoped Tidori notification inbox.';
