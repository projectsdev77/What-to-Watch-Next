/**
 * Seeds the `titles` + `title_availability` tables from TMDB's "popular"
 * lists so the onboarding taste quiz has real, varied data to show
 * without hitting TMDB live on every page load.
 *
 * Run with: npm run seed
 */
import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import { getPopular, type MediaType, type TmdbTitleSummary } from "../src/lib/tmdb";
import { ingestTitle } from "../src/lib/catalog";

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

async function main() {
  let succeeded = 0;
  let failed = 0;

  for (const mediaType of MEDIA_TYPES) {
    console.log(`Fetching popular ${mediaType} titles...`);
    const summaries = await collectPopular(mediaType);
    console.log(`Seeding ${summaries.length} ${mediaType} titles...`);

    let done = 0;
    await inBatches(summaries, BATCH_SIZE, async (summary) => {
      // ingestTitle logs and returns null on its own failures — one
      // flaky title (transient network error, an odd response shape)
      // shouldn't abort the other ~100+ titles already in flight.
      const id = await ingestTitle(mediaType, summary.id);
      if (id !== null) succeeded += 1;
      else failed += 1;
      done += 1;
      if (done % 20 === 0) console.log(`  ${done}/${summaries.length} ${mediaType}`);
    });
  }

  console.log(`Done. ${succeeded} succeeded, ${failed} failed.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
