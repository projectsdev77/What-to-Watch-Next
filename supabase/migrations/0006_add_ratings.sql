-- Real outside ratings (IMDb + Rotten Tomatoes, via OMDb) alongside our
-- own TMDB-sourced vote_average. imdb_id comes from TMDB's external_ids
-- and is what OMDb's API is keyed on; the rating columns are cached at
-- ingest time (see src/lib/catalog.ts) rather than fetched live per page
-- view, to stay well inside OMDb's free-tier daily request quota.
alter table titles add column if not exists imdb_id text;
alter table titles add column if not exists imdb_rating numeric(3, 1);
alter table titles add column if not exists rotten_tomatoes_rating text;
alter table titles add column if not exists ratings_cached_at timestamptz;
