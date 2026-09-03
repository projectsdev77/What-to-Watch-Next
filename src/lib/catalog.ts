import { createAdminClient } from "@/lib/supabase/admin";
import { getTitleDetails, getWatchProviders, type MediaType } from "@/lib/tmdb";
import { normalizeProviderName, DEFAULT_REGION } from "@/lib/platforms";

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
        },
        { onConflict: "tmdb_id,media_type" }
      )
      .select("id")
      .single();

    if (titleError || !title) {
      console.error(`Failed to upsert ${mediaType}/${tmdbId}:`, titleError?.message);
      return null;
    }

    if (platforms.length > 0) {
      const { error: availabilityError } = await admin.from("title_availability").upsert(
        platforms.map((platformName) => ({
          title_id: title.id,
          region: DEFAULT_REGION,
          platform_name: platformName,
          cached_at: new Date().toISOString(),
        })),
        { onConflict: "title_id,region,platform_name" }
      );
      if (availabilityError) {
        console.error(`Failed to upsert availability for ${mediaType}/${tmdbId}:`, availabilityError.message);
        // The title itself is saved — availability failing isn't fatal,
        // it just means this one shows with no known platforms for now.
      }
    }

    return title.id as number;
  } catch (err) {
    console.error(`Failed to ingest ${mediaType}/${tmdbId}:`, err instanceof Error ? err.message : err);
    return null;
  }
}
