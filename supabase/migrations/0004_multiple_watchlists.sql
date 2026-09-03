-- Replaces the single undifferentiated watchlist (user_title_feedback's
-- 'watchlisted' status) with real named lists, so a user can have more
-- than one (e.g. "Weekend Watches") instead of one unsorted pile.

create table if not exists watchlists (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create index if not exists watchlists_user_id_idx on watchlists (user_id);

-- user_id is denormalized here (also derivable via watchlist_id -> user_id)
-- purely so RLS can check it directly on this table, matching every other
-- per-user table's policy shape, instead of an EXISTS subquery.
create table if not exists watchlist_items (
  watchlist_id bigint not null references watchlists (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  title_id bigint not null references titles (id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (watchlist_id, title_id)
);

create index if not exists watchlist_items_user_id_idx on watchlist_items (user_id);
create index if not exists watchlist_items_title_id_idx on watchlist_items (title_id);

alter table watchlists enable row level security;
alter table watchlist_items enable row level security;

create policy "users manage their own watchlists" on watchlists
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "users manage their own watchlist items" on watchlist_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Carry over anyone's existing single watchlist into a new default list
-- named "My Watchlist" so nobody's saved titles disappear.
insert into watchlists (user_id, name, created_at)
select distinct user_id, 'My Watchlist', now()
from user_title_feedback
where status = 'watchlisted';

insert into watchlist_items (watchlist_id, user_id, title_id, added_at)
select w.id, f.user_id, f.title_id, f.updated_at
from user_title_feedback f
join watchlists w on w.user_id = f.user_id and w.name = 'My Watchlist'
where f.status = 'watchlisted';

-- The old rows are superseded by watchlist_items above — 'watchlisted'
-- stays a legal value in the status check constraint (harmless, and
-- avoids the risk of guessing Postgres's auto-generated constraint name
-- to tighten it), the app just never writes it again.
delete from user_title_feedback where status = 'watchlisted';
