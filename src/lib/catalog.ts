import { createAdminClient } from "@/lib/supabase/admin";
import {
  getTitleDetails,
  getWatchProviders,
  getDiscover,
  DISCOVER_MAX_PAGE,
  type MediaType,
  type TmdbTitleSummary,
} from "@/lib/tmdb";
import { normalizeProviderName, DEFAULT_REGION } from "@/lib/platforms";
import { getOmdbRatings } from "@/lib/omdb";
import { getDeepLinksByPlatform } from "@/lib/streaming-availability";
import { resolveAvailability, type AvailabilityRow } from "@/lib/availability";

/**
 * Fetches one title from TMDB and upserts it (plus its streaming
 * availability) into titles/title_availability — the same write scripts/
 * seed-titles.ts does in bulk, extracted here so search (and later,
 * anything else) can pull a single title into the catalog on demand
 * instead of only ever showing what a past seed run happened to include.
 * Uses the admin client since these tables have no insert/update policy
 * for regular users (see supabase/migrations/0001_init.sql) — writing to
 * the shared catalog is deliberately not something a user's own session
 * can do directly.
 *
 * Returns the local titles.id on success, or null on any failure (TMDB
 * down, a malformed response, etc.) — callers should treat null as "try
 * again later," not throw, since this can run from a user-facing request.
 */
export async function ingestTitle(mediaType: MediaType, tmdbId: number): Promise<number | null> {
  try {
    const admin = createAdminClient();
    const details = await getTitleDetails(mediaType, tmdbId);
    const watchProviders = await getWatchProviders(mediaType, tmdbId);
    const regionProviders = watchProviders.results[DEFAULT_REGION];
    const rawPlatforms = regionProviders?.flatrate?.map((p) => p.provider_name) ?? [];
    const platforms = [
      ...new Set(rawPlatforms.map(normalizeProviderName).filter((p): p is NonNullable<typeof p> => p !== null)),
    ];
    const justwatchLink = regionProviders?.link ?? null;

    const castNames = [...(details.credits?.cast ?? [])]
      .sort((a, b) => a.order - b.order)
      .slice(0, 5)
      .map((c) => c.name);

    const imdbId = details.external_ids?.imdb_id ?? null;
    const ratings = imdbId ? await getOmdbRatings(imdbId) : null;

    // Real per-platform deep links (see streaming-availability.ts). When
    // this succeeds it also decides which platforms the title is on — see
    // resolveAvailability. Only looked up when TMDB lists at least one of
    // our platforms, to save quota on titles we couldn't recommend anyway.
    const deepLinks = platforms.length > 0 ? await getDeepLinksByPlatform(mediaType, tmdbId) : null;

    const { data: title, error: titleError } = await admin
      .from("titles")
      .upsert(
        {
          tmdb_id: details.id,
          media_type: mediaType,
          title: details.title ?? details.name ?? "Untitled",
          overview: details.overview,
          poster_path: details.poster_path,
          genre_ids: details.genres.map((g) => g.id),
          cast_names: castNames,
          justwatch_link: justwatchLink,
          vote_average: details.vote_average,
          release_date: details.release_date ?? details.first_air_date ?? null,
          cached_at: new Date().toISOString(),
          imdb_id: imdbId,
          // Only overwrite the cached rating columns when OMDb actually
          // returned something this time — a transient OMDb failure (or
          // OMDB_API_KEY being unset) shouldn't null out a rating a past
          // ingest already cached.
          ...(ratings && {
            imdb_rating: ratings.imdbRating,
            rotten_tomatoes_rating: ratings.rottenTomatoes,
            ratings_cached_at: new Date().toISOString(),
          }),
        },
        { onConflict: "tmdb_id,media_type" }
      )
      .select("id")
      .single();

    if (titleError || !title) {
      console.error(`Failed to upsert ${mediaType}/${tmdbId}:`, titleError?.message);
      return null;
    }

    const { data: existingAvailability } = await admin
      .from("title_availability")
      .select("platform_name, deep_link")
      .eq("title_id", title.id)
      .eq("region", DEFAULT_REGION);
    const existing = new Map(
      (existingAvailability ?? []).map((row) => [row.platform_name as string, row.deep_link as string | null])
    );

    const saveError = await saveAvailability(title.id as number, resolveAvailability(platforms, deepLinks, existing), [
      ...existing.keys(),
    ]);
    // The title itself is saved — availability failing isn't fatal, it
    // just means this one shows with no known platforms for now.
    if (saveError) console.error(`Failed to save availability for ${mediaType}/${tmdbId}:`, saveError);

    return title.id as number;
  } catch (err) {
    console.error(`Failed to ingest ${mediaType}/${tmdbId}:`, err instanceof Error ? err.message : err);
    return null;
  }
}

/**
 * Writes a title's resolved availability (see resolveAvailability) and
 * removes any stored platform no longer in it — so a title that leaves a
 * service stops being listed there. Diffs in JS rather than with a raw
 * "not in (...)" filter, so a platform name with a comma/quote can't
 * produce malformed SQL. Returns an error message, or null on success.
 */
export async function saveAvailability(
  titleId: number,
  rows: AvailabilityRow[],
  storedPlatforms: string[]
): Promise<string | null> {
  const admin = createAdminClient();

  if (rows.length > 0) {
    const { error } = await admin.from("title_availability").upsert(
      rows.map((row) => ({
        title_id: titleId,
        region: DEFAULT_REGION,
        platform_name: row.platform,
        deep_link: row.deepLink,
        cached_at: new Date().toISOString(),
      })),
      { onConflict: "title_id,region,platform_name" }
    );
    if (error) return error.message;
  }

  const keep = new Set(rows.map((row) => row.platform));
  const stale = storedPlatforms.filter((name) => !keep.has(name));
  if (stale.length > 0) {
    const { error } = await admin
      .from("title_availability")
      .delete()
      .eq("title_id", titleId)
      .eq("region", DEFAULT_REGION)
      .in("platform_name", stale);
    if (error) return error.message;
  }
  return null;
}

const INGEST_CONCURRENCY = 5; // be polite to TMDB's rate limit, same as scripts/seed-titles.ts

export interface CatalogSyncResult {
  mediaType: MediaType;
  pagesFetched: number;
  titlesIngested: number;
  titlesFailed: number;
  nextPage: number;
}

/**
 * The ongoing "unlimited catalog" mechanism: pages through TMDB's
 * /discover endpoint (not just the small "popular" list scripts/seed-
 * titles.ts uses for its one-time bootstrap), picking up from wherever
 * the last run left off — see supabase/migrations/0005_catalog_sync_state.sql
 * — and wrapping back to page 1 once it reaches TMDB's page cap, so the
 * catalog keeps both growing and refreshing rather than ever "finishing".
 * Called from src/app/api/cron/refresh-catalog/route.ts on a schedule;
 * pageCount is deliberately small per call to stay well inside a
 * serverless function's time limit — the schedule is what makes this add
 * up over time, not a single huge run.
 */
export async function syncCatalogBatch(mediaType: MediaType, pageCount: number): Promise<CatalogSyncResult> {
  const admin = createAdminClient();

  const { data: state } = await admin
    .from("catalog_sync_state")
    .select("last_page")
    .eq("media_type", mediaType)
    .maybeSingle();
  let page = (state?.last_page as number | undefined) ?? 0;
  // `page` only ever advances past a page that was actually fetched
  // successfully — if a page fails, the loop stops for this run without
  // moving past it, so the *next* scheduled run retries that same page
  // instead of silently skipping it forever (which the old code did:
  // the loop counter advanced every iteration regardless of whether the
  // fetch for it succeeded, and whatever it ended at is what got
  // persisted as "done").
  const summaries: TmdbTitleSummary[] = [];
  for (let i = 0; i < pageCount; i++) {
    const nextPage = page >= DISCOVER_MAX_PAGE ? 1 : page + 1;
    try {
      const result = await getDiscover(mediaType, nextPage);
      summaries.push(...result.results);
      page = nextPage;
    } catch (err) {
      console.error(`Discover fetch failed for ${mediaType} page ${nextPage}:`, err instanceof Error ? err.message : err);
      break;
    }
  }

  let titlesIngested = 0;
  let titlesFailed = 0;
  for (let i = 0; i < summaries.length; i += INGEST_CONCURRENCY) {
    const batch = summaries.slice(i, i + INGEST_CONCURRENCY);
    const results = await Promise.all(batch.map((s) => ingestTitle(mediaType, s.id)));
    for (const id of results) {
      if (id !== null) titlesIngested += 1;
      else titlesFailed += 1;
    }
  }

  const { error: stateError } = await admin
    .from("catalog_sync_state")
    .upsert(
      { media_type: mediaType, last_page: page, updated_at: new Date().toISOString() },
      { onConflict: "media_type" }
    );
  if (stateError) console.error(`Failed to save catalog sync state for ${mediaType}:`, stateError.message);

  return { mediaType, pagesFetched: pageCount, titlesIngested, titlesFailed, nextPage: page };
}
