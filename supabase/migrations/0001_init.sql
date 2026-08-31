-- Initial schema for What To Watch Next.
--
-- Auth/users are handled entirely by Supabase Auth (auth.users) — no
-- separate users table. Everything here either belongs to a user
-- (RLS-scoped to auth.uid()) or is shared cached catalog data (public
-- read, written only by trusted server-side code via the service role
-- key, which bypasses RLS).

-- ---------------------------------------------------------------------
-- Shared catalog cache (populated from TMDB, not user-specific)
-- ---------------------------------------------------------------------

create table if not exists titles (
  id bigint generated always as identity primary key,
  tmdb_id integer not null,
  media_type text not null check (media_type in ('movie', 'tv')),
  title text not null,
  overview text,
  poster_path text,
  genre_ids integer[] not null default '{}',
  vote_average numeric(3, 1),
  release_date date,
  cached_at timestamptz not null default now(),
  unique (tmdb_id, media_type)
);

create table if not exists title_availability (
  id bigint generated always as identity primary key,
  title_id bigint not null references titles (id) on delete cascade,
  region text not null default 'US',
  platform_name text not null,
  cached_at timestamptz not null default now(),
  unique (title_id, region, platform_name)
);

create index if not exists title_availability_title_id_idx on title_availability (title_id);

alter table titles enable row level security;
alter table title_availability enable row level security;

create policy "titles are publicly readable" on titles
  for select using (true);

create policy "title_availability is publicly readable" on title_availability
  for select using (true);

-- No insert/update/delete policies for titles or title_availability:
-- only the service role (server-side TMDB sync) writes here, and it
-- bypasses RLS entirely.

-- ---------------------------------------------------------------------
-- Per-user data
-- ---------------------------------------------------------------------

create table if not exists user_platforms (
  user_id uuid not null references auth.users (id) on delete cascade,
  platform_name text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, platform_name)
);

create table if not exists user_title_feedback (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  title_id bigint not null references titles (id) on delete cascade,
  status text not null check (status in ('liked', 'disliked', 'skipped', 'watched', 'watchlisted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, title_id)
);

create index if not exists user_title_feedback_user_id_idx on user_title_feedback (user_id);

create table if not exists user_taste_profile (
  user_id uuid primary key references auth.users (id) on delete cascade,
  genre_weights jsonb not null default '{}'::jsonb,
  keyword_weights jsonb not null default '{}'::jsonb,
  cast_weights jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table user_platforms enable row level security;
alter table user_title_feedback enable row level security;
alter table user_taste_profile enable row level security;

create policy "users manage their own platforms" on user_platforms
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "users manage their own feedback" on user_title_feedback
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "users manage their own taste profile" on user_taste_profile
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
