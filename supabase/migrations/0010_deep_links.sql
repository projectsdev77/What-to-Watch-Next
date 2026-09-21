-- Real per-platform deep links from the Streaming Availability API
-- (src/lib/streaming-availability.ts), fetched once per title at ingest
-- time and cached here — not the guessed search-URL/homepage fallback
-- in src/lib/platform-links.ts, which stays as the fallback for a
-- platform this column has no confirmed link for (API key unset, the
-- title not in their catalog, or the request failing/rate-limiting).
alter table title_availability add column if not exists deep_link text;
