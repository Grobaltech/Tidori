-- Tidori website CMS: run in Supabase SQL Editor for project yrsywklfharhkllrfdun.
-- Public visitors can read only published website content. Only Tidori admins can manage it.
create table if not exists public.site_content (
  id text primary key default 'main' check (id = 'main'),
  content jsonb not null default '{}'::jsonb,
  published boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);
create table if not exists public.homepage_slides (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 180),
  description text not null default '',
  image_url text not null default '',
  button_label text not null default 'Learn More',
  button_url text not null default '/about',
  sort_order integer not null default 0,
  published boolean not null default false,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.site_ministries (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 140),
  description text not null default '',
  icon text not null default 'flaticon-social-care',
  image_url text,
  page_url text,
  sort_order integer not null default 0,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.site_facts (
  id uuid primary key default gen_random_uuid(),
  label text not null check (char_length(label) between 1 and 100),
  value integer not null default 0 check (value >= 0),
  icon text not null default 'flaticon-home',
  sort_order integer not null default 0,
  published boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.site_content enable row level security;
alter table public.homepage_slides enable row level security;
alter table public.site_ministries enable row level security;
alter table public.site_facts enable row level security;

drop policy if exists "Public reads published site content" on public.site_content;
create policy "Public reads published site content" on public.site_content
 for select to anon, authenticated using (published = true);
drop policy if exists "Tidori admins manage site content" on public.site_content;
create policy "Tidori admins manage site content" on public.site_content
 for all to authenticated using ((select private.is_tidori_admin()))
 with check ((select private.is_tidori_admin()));

do $$
declare t text;
begin
 foreach t in array array['homepage_slides','site_ministries','site_facts'] loop
   execute format('drop policy if exists %I on public.%I', 'Public reads published ' || t, t);
   execute format('create policy %I on public.%I for select to anon, authenticated using (published = true)', 'Public reads published ' || t, t);
   execute format('drop policy if exists %I on public.%I', 'Tidori admins manage ' || t, t);
   execute format('create policy %I on public.%I for all to authenticated using ((select private.is_tidori_admin())) with check ((select private.is_tidori_admin()))', 'Tidori admins manage ' || t, t);
   execute format('grant select on public.%I to anon, authenticated', t);
   execute format('grant insert, update, delete, select on public.%I to authenticated', t);
 end loop;
end $$;
grant select on public.site_content to anon, authenticated;
grant insert, update, delete, select on public.site_content to authenticated;

insert into public.site_content (id, content, published)
values ('main', jsonb_build_object(
 'name','Tidori Ministries',
 'logoUrl','/img/grok_1793864104245.jpg',
 'shortName','Tidori',
 'tagline','A community of faith, hope and service',
 'address','Your church address here',
 'phone','+000 000 000 000',
 'email','info@tidoriministries.org',
 'serviceTimes','Sundays - update service times here',
 'videoUrl','',
 'social', jsonb_build_object('facebook','','twitter','','youtube','','instagram','','linkedin',''),
 'about', jsonb_build_object(
   'about','Tidori Ministries is a church family devoted to worshipping God, growing in the Word and serving our community with love.',
   'mission','Our mission is to share the good news of Jesus Christ and to meet practical needs in His name.',
   'vision','We envision lives and communities transformed by faith, hope and love.'
 )
), true)
on conflict (id) do nothing;

-- Existing hardcoded homepage content is seeded as editable drafts. Review and publish each record.
insert into public.homepage_slides (title, description, image_url, button_label, button_url, sort_order, published)
select v.title, v.description, v.image_url, v.button_label, v.button_url, v.sort_order, true
from (values
 ('Welcome to Tidori Ministries','A community of faith, hope and service. Come as you are and grow with us.','/img/carousel-1.jpg','Learn More','/about',0),
 ('Get involved with a helping hand','Serve alongside our church family as we love our neighbours in practical ways.','/img/carousel-2.jpg','Serve With Us','/volunteer',1),
 ('Bringing hope to our community','Your giving and prayers help us reach families in need.','/img/carousel-3.jpg','Give Now','/give',2)
) as v(title,description,image_url,button_label,button_url,sort_order)
where not exists (select 1 from public.homepage_slides);

insert into public.site_ministries (title, description, icon, sort_order, published)
select v.title, v.description, v.icon, v.sort_order, false
from (values
 ('Food Pantry','Feeding families in need with weekly groceries and meals.','flaticon-diet',0),
 ('Clean Water','Helping communities gain access to safe drinking water.','flaticon-water',1),
 ('Health Outreach','Free health checks and care days for our neighbours.','flaticon-healthcare',2),
 ('Children & Education','Supporting children with school needs and Bible teaching.','flaticon-education',3),
 ('Family Support','Practical help and prayer for families facing hardship.','flaticon-home',4),
 ('Pastoral Care','Visiting, counselling and walking with people through life.','flaticon-social-care',5)
) as v(title,description,icon,sort_order)
where not exists (select 1 from public.site_ministries);

insert into public.site_facts (label, value, icon, sort_order, published)
select v.label, v.value, v.icon, v.sort_order, false
from (values
 ('Years of Ministry',10,'flaticon-home',0),
 ('Volunteers',100,'flaticon-charity',1),
 ('Families Helped',500,'flaticon-kindness',2),
 ('Outreach Projects',20,'flaticon-donation',3)
) as v(label,value,icon,sort_order)
where not exists (select 1 from public.site_facts);

-- New public tables may need to be explicitly exposed in Supabase Data API settings.
