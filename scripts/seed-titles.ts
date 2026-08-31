/**
 * Seeds the `titles` + `title_availability` tables from TMDB's "popular"
 * lists so the onboarding taste quiz has real, varied data to show
 * without hitting TMDB live on every page load.
 *
 * Run with: npm run seed
 */
import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import { createAdminClient } from "../src/lib/supabase/admin";
import {
  getPopular,
  getTitleDetails,
  getStreamingPlatforms,
  type MediaType,
  type TmdbTitleSummary,
} from "../src/lib/tmdb";
import { normalizeProviderName, DEFAULT_REGION } from "../src/lib/platforms";

const MEDIA_TYPES: MediaType[] = ["movie", "tv"];
const PAGES_PER_MEDIA_TYPE = 3; // ~60 titles per media type, plenty of genre spread
const BATCH_SIZE = 5; // be polite to TMDB's rate limit

async function inBatches<T, R>(items: T[], size: number, fn: (item: T) => Promise<R>) {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += size) {
    const batch = items.slice(i, i + size);
    results.push(...(await Promise.all(batch.map(fn))));
  }
  return results;
}

async function collectPopular(mediaType: MediaType): Promise<TmdbTitleSummary[]> {
  const pages = await Promise.all(
    Array.from({ length: PAGES_PER_MEDIA_TYPE }, (_, i) => getPopular(mediaType, i + 1))
  );
  return pages.flatMap((page) => page.results);
}

async function seedTitle(mediaType: MediaType, summary: TmdbTitleSummary, admin: ReturnType<typeof createAdminClient>) {
  const details = await getTitleDetails(mediaType, summary.id);
  const rawPlatforms = await getStreamingPlatforms(mediaType, summary.id, DEFAULT_REGION);
  // Normalize TMDB's free-text provider names into our canonical
  // platform list (see src/lib/platforms.ts) and drop anything that
  // isn't one of the services users can pick at onboarding.
  const platforms = [
    ...new Set(rawPlatforms.map(normalizeProviderName).filter((p): p is NonNullable<typeof p> => p !== null)),
  ];

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
        vote_average: details.vote_average,
        release_date: details.release_date ?? details.first_air_date ?? null,
        cached_at: new Date().toISOString(),
      },
      { onConflict: "tmdb_id,media_type" }
    )
    .select("id")
    .single();

  if (titleError || !title) {
    console.error(`Failed to upsert ${mediaType}/${details.id}:`, titleError?.message);
    return;
  }

  if (platforms.length === 0) return;

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
    console.error(`Failed to upsert availability for ${mediaType}/${details.id}:`, availabilityError.message);
  }
}

async function main() {
  const admin = createAdminClient();

  for (const mediaType of MEDIA_TYPES) {
    console.log(`Fetching popular ${mediaType} titles...`);
    const summaries = await collectPopular(mediaType);
    console.log(`Seeding ${summaries.length} ${mediaType} titles...`);

    let done = 0;
    await inBatches(summaries, BATCH_SIZE, async (summary) => {
      await seedTitle(mediaType, summary, admin);
      done += 1;
      if (done % 20 === 0) console.log(`  ${done}/${summaries.length} ${mediaType}`);
    });
  }

  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
