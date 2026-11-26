-- Tidori CMS SEO fields
-- Run once in the Supabase SQL Editor for project yrsywklfharhkllrfdun.
-- Existing article content and publication state are preserved.

alter table public.posts
  add column if not exists seo_title text,
  add column if not exists seo_description text,
  add column if not exists seo_image text,
  add column if not exists seo_noindex boolean not null default false;

create index if not exists posts_published_seo_sitemap_idx
  on public.posts (published, published_at desc)
  where published = true and seo_noindex = false;

comment on column public.posts.seo_title is 'Optional search and social title for this article';
comment on column public.posts.seo_description is 'Optional search and social description for this article';
comment on column public.posts.seo_image is 'Optional social sharing image URL for this article';
comment on column public.posts.seo_noindex is 'When true, search engines should not index this article';
