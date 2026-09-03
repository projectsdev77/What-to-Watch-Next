-- Stores TMDB's real combined "where to watch" link per title (sourced
-- from JustWatch, via /watch/providers .results[region].link). It's a
-- single aggregator page listing every real provider for that title —
-- not a deep link into one specific platform, but a genuine working
-- link, unlike linking to TMDB's own generic title page.
alter table titles add column if not exists justwatch_link text;
