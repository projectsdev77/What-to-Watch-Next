/**
 * Runs the Streaming Availability lookup for titles already in the
 * catalog that haven't had one yet. Normal ingestion only looks a title
 * up when it's added or refreshed, so titles that existed before
 * STREAMING_AVAILABILITY_API_KEY was set would otherwise wait a long time.
 * Each lookup updates both which platforms the title is on and their real
 * links — the same rule as ingestion (see resolveAvailability).
 *
 * Each title costs one API request, so it runs in batches — highest-rated
 * titles first, since those are the most likely to be recommended. Stops
 * early if a lookup fails (usually the monthly quota running out).
 *
 * Run with: npm run backfill-deep-links            (100 titles)
 *           npm run backfill-deep-links -- 250     (custom batch size)
 *
 * Needs SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_URL and
 * STREAMING_AVAILABILITY_API_KEY in .env.local, pointed at production.
 */
import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import { createAdminClient } from "../src/lib/supabase/admin";
import { getDeepLinksByPlatform } from "../src/lib/streaming-availability";
import { resolveAvailability } from "../src/lib/availability";
import { saveAvailability } from "../src/lib/catalog";
import { DEFAULT_REGION } from "../src/lib/platforms";
import type { MediaType } from "../src/lib/tmdb";

const DEFAULT_BATCH = 100;
const PAGE_SIZE = 1000; // PostgREST's default max rows per request

interface CatalogTitle {
  tmdbId: number;
  mediaType: MediaType;
  title: string;
  voteAverage: number;
  stored: Map<string, string | null>;
}

async function loadAvailability() {
  const admin = createAdminClient();
  const titles = new Map<number, CatalogTitle>();
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await admin
      .from("title_availability")
      .select("title_id, platform_name, deep_link, titles(tmdb_id, media_type, title, vote_average)")
      .eq("region", DEFAULT_REGION)
      .order("id")
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`Failed to load availability: ${error.message}`);
    for (const row of data ?? []) {
      const t = row.titles as unknown as { tmdb_id: number; media_type: MediaType; title: string; vote_average: number | null } | null;
      if (!t) continue;
      const entry = titles.get(row.title_id as number) ?? {
        tmdbId: t.tmdb_id,
        mediaType: t.media_type,
        title: t.title,
        voteAverage: t.vote_average ?? 0,
        stored: new Map(),
      };
      entry.stored.set(row.platform_name as string, row.deep_link as string | null);
      titles.set(row.title_id as number, entry);
    }
    if (!data || data.length < PAGE_SIZE) break;
  }
  return titles;
}

async function main() {
  if (!process.env.STREAMING_AVAILABILITY_API_KEY) {
    console.error("STREAMING_AVAILABILITY_API_KEY isn't set in .env.local — nothing to look up with.");
    process.exit(1);
  }
  const batchSize = Number(process.argv[2]) || DEFAULT_BATCH;

  // A title still needs a lookup if any of its platforms was never looked up (null).
  const all = await loadAvailability();
  const pending = [...all.entries()].filter(([, t]) => [...t.stored.values()].some((link) => link === null));
  const queue = pending.sort((a, b) => b[1].voteAverage - a[1].voteAverage).slice(0, batchSize);
  console.log(`${pending.length} titles still need a lookup. Looking up ${queue.length} (1 API request each)...`);

  let looked = 0;
  let linksFound = 0;
  for (const [titleId, t] of queue) {
    const links = await getDeepLinksByPlatform(t.mediaType, t.tmdbId);
    if (links === null) {
      console.error("Lookup failed — most likely the monthly quota is used up. Stopping; run again after it resets.");
      break;
    }
    const rows = resolveAvailability([...t.stored.keys()], links, t.stored);
    const saveError = await saveAvailability(titleId, rows, [...t.stored.keys()]);
    if (saveError) console.error(`  Failed to save ${t.title}: ${saveError}`);
    else linksFound += rows.filter((row) => row.deepLink).length;
    looked += 1;
    if (looked % 20 === 0) console.log(`  ${looked}/${queue.length}`);
  }

  console.log(
    `Done. Looked up ${looked} titles, saved ${linksFound} real links. ${pending.length - looked} titles still to go.`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
