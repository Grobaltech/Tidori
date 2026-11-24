-- Blog presentation controls managed by the Tidori Website CMS.
-- Safe to run on an existing database; existing posts keep their content.
alter table public.posts
  add column if not exists presentation jsonb not null default '{}'::jsonb;

comment on column public.posts.presentation is
  'Per-article visual presentation settings edited in Website CMS.';
