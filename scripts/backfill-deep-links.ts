/**
 * Fills in real Watch Now deep links (Streaming Availability API) for
 * titles already in the catalog. Normal ingestion only looks links up
 * when a title is added or refreshed, so titles that existed before
 * STREAMING_AVAILABILITY_API_KEY was set would otherwise wait a long time.
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
import { DEFAULT_REGION, type StreamingPlatform } from "../src/lib/platforms";
import type { MediaType } from "../src/lib/tmdb";

const DEFAULT_BATCH = 100;

interface PendingTitle {
  tmdbId: number;
  mediaType: MediaType;
  title: string;
  voteAverage: number;
  platforms: string[];
}

async function main() {
  if (!process.env.STREAMING_AVAILABILITY_API_KEY) {
    console.error("STREAMING_AVAILABILITY_API_KEY isn't set in .env.local — nothing to look up with.");
    process.exit(1);
  }
  const batchSize = Number(process.argv[2]) || DEFAULT_BATCH;
  const admin = createAdminClient();

  // null = never looked up ("" means looked up, nothing available).
  const { data: rows, error } = await admin
    .from("title_availability")
    .select("title_id, platform_name, titles(tmdb_id, media_type, title, vote_average)")
    .eq("region", DEFAULT_REGION)
    .is("deep_link", null);
  if (error) throw new Error(`Failed to load titles needing links: ${error.message}`);

  const pending = new Map<number, PendingTitle>();
  for (const row of rows ?? []) {
    const t = row.titles as unknown as { tmdb_id: number; media_type: MediaType; title: string; vote_average: number | null } | null;
    if (!t) continue;
    const entry = pending.get(row.title_id as number) ?? {
      tmdbId: t.tmdb_id,
      mediaType: t.media_type,
      title: t.title,
      voteAverage: t.vote_average ?? 0,
      platforms: [],
    };
    entry.platforms.push(row.platform_name as string);
    pending.set(row.title_id as number, entry);
  }

  const queue = [...pending.entries()].sort((a, b) => b[1].voteAverage - a[1].voteAverage).slice(0, batchSize);
  console.log(`${pending.size} titles still need a link. Looking up ${queue.length} (1 API request each)...`);

  let looked = 0;
  let linksFound = 0;
  for (const [titleId, t] of queue) {
    const links = await getDeepLinksByPlatform(t.mediaType, t.tmdbId);
    if (links === null) {
      console.error("Lookup failed — most likely the monthly quota is used up. Stopping; run again after it resets.");
      break;
    }
    for (const platform of t.platforms) {
      const link = links[platform as StreamingPlatform] ?? "";
      const { error: updateError } = await admin
        .from("title_availability")
        .update({ deep_link: link })
        .eq("title_id", titleId)
        .eq("region", DEFAULT_REGION)
        .eq("platform_name", platform);
      if (updateError) console.error(`  Failed to save ${t.title} / ${platform}: ${updateError.message}`);
      else if (link) linksFound += 1;
    }
    looked += 1;
    if (looked % 20 === 0) console.log(`  ${looked}/${queue.length}`);
  }

  console.log(
    `Done. Looked up ${looked} titles, saved ${linksFound} real links. ${pending.size - looked} titles still to go.`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
