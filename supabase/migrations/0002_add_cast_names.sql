-- Adds a small, display-only cast list to the catalog cache, for the
-- title detail page. Not used in scoring (see user_taste_profile's
-- unused cast_weights column / TODO.md backlog for that).
alter table titles add column if not exists cast_names text[] not null default '{}';
