-- Tracks how far the ongoing catalog-broadening sync (see
-- src/lib/catalog.ts's syncCatalogBatch, called from the
-- /api/cron/refresh-catalog route) has paged through TMDB's /discover
-- endpoint per media type, so each scheduled run continues from where
-- the last one left off instead of re-fetching the same titles.

create table if not exists catalog_sync_state (
  media_type text primary key check (media_type in ('movie', 'tv')),
  last_page integer not null default 0,
  updated_at timestamptz not null default now()
);

-- Server-only sync bookkeeping — never read or written by a user's own
-- session (only the service-role admin client touches it), so RLS is
-- enabled with no policies at all (default-deny), unlike
-- titles/title_availability which are at least publicly readable.
alter table catalog_sync_state enable row level security;
