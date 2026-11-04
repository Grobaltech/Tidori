-- Tidori Ministries - Supabase schema
-- Run in: Supabase Dashboard > SQL Editor > New query > paste > Run

create extension if not exists "pgcrypto";

-- ---------- Public content (read-only for visitors) ----------
create table if not exists public.outreach_projects (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  summary text not null,
  image_url text,
  goal_amount numeric(12,2) not null default 0,
  raised_amount numeric(12,2) not null default 0,
  sort_order int not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  image_url text,
  location text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  excerpt text,
  body text not null,
  image_url text,
  author text,
  published_at timestamptz not null default now(),
  published boolean not null default true
);

create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text not null,
  photo_url text,
  sort_order int not null default 0,
  published boolean not null default true
);

-- ---------- Visitor submissions (insert-only for visitors) ----------
create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  email text not null check (char_length(email) between 3 and 200),
  subject text check (char_length(subject) <= 200),
  message text not null check (char_length(message) between 1 and 4000),
  created_at timestamptz not null default now()
);

create table if not exists public.volunteers (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  email text not null check (char_length(email) between 3 and 200),
  phone text check (char_length(phone) <= 40),
  area text check (char_length(area) <= 120),
  message text check (char_length(message) <= 4000),
  created_at timestamptz not null default now()
);

create table if not exists public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (char_length(email) between 3 and 200),
  created_at timestamptz not null default now()
);

-- Records a giving pledge/intent. Actual payment happens on your payment provider.
create table if not exists public.donation_pledges (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  email text not null check (char_length(email) between 3 and 200),
  amount numeric(12,2) not null check (amount > 0 and amount <= 1000000),
  project_id uuid references public.outreach_projects(id) on delete set null,
  status text not null default 'pledged',
  created_at timestamptz not null default now()
);

-- ---------- Row Level Security ----------
alter table public.outreach_projects   enable row level security;
alter table public.events              enable row level security;
alter table public.posts               enable row level security;
alter table public.team_members        enable row level security;
alter table public.contact_messages    enable row level security;
alter table public.volunteers          enable row level security;
alter table public.newsletter_subscribers enable row level security;
alter table public.donation_pledges    enable row level security;

-- Visitors (anon) can read published content
create policy "public read outreach" on public.outreach_projects for select to anon, authenticated using (published);
create policy "public read events"    on public.events           for select to anon, authenticated using (published);
create policy "public read posts"     on public.posts            for select to anon, authenticated using (published);
create policy "public read team"      on public.team_members     for select to anon, authenticated using (published);

-- Visitors can only INSERT submissions (they can never read them back)
create policy "anyone can send message"  on public.contact_messages        for insert to anon, authenticated with check (true);
create policy "anyone can volunteer"     on public.volunteers              for insert to anon, authenticated with check (true);
create policy "anyone can subscribe"     on public.newsletter_subscribers  for insert to anon, authenticated with check (true);
create policy "anyone can pledge"        on public.donation_pledges        for insert to anon, authenticated with check (status = 'pledged');

-- Managing content/reading submissions: use the Supabase dashboard (service role),
-- or add admin policies later, e.g. for a specific admin user's auth.uid().
