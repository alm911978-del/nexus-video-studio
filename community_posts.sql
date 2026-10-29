-- NEXUS community posts table
create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  author_email text,
  title text not null check (char_length(title) between 1 and 120),
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);

alter table public.community_posts enable row level security;

drop policy if exists "Anyone authenticated can read posts" on public.community_posts;
drop policy if exists "Users insert own posts" on public.community_posts;
drop policy if exists "Users delete own posts" on public.community_posts;

create policy "Anyone authenticated can read posts"
  on public.community_posts for select
  to authenticated
  using (true);

create policy "Users insert own posts"
  on public.community_posts for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users delete own posts"
  on public.community_posts for delete
  to authenticated
  using (auth.uid() = user_id);

create index if not exists idx_community_posts_created on public.community_posts(created_at desc);
