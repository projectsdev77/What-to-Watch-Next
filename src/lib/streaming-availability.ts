import { Client, Configuration } from "streaming-availability";
import { DEFAULT_REGION, type StreamingPlatform } from "@/lib/platforms";
import type { MediaType } from "@/lib/tmdb";

// This API's own service ids, mapped to our StreamingPlatform labels —
// limited to the ones actually documented by the installed client (see
// the getTopShows doc comment in node_modules/streaming-availability's
// ShowsApi: "Netflix: netflix - Amazon Prime Video: prime - Disney+:
// disney - Apple TV: apple - Max: hbo" — "hbo" because Max reverted to
// the HBO Max brand in 2025, see README) plus "hulu"/"peacock" from
// their OpenAPI spec's examples. Paramount+ is deliberately left out —
// it already has a confirmed search deep link (platform-links.ts), so
// there's no reason to spend API budget re-confirming it here.
const SERVICE_ID_TO_PLATFORM: Partial<Record<string, StreamingPlatform>> = {
  netflix: "Netflix",
  prime: "Prime Video",
  disney: "Disney+",
  apple: "Apple TV+",
  hbo: "Max",
  hulu: "Hulu",
  peacock: "Peacock",
};

let cachedClient: Client | null | undefined;

function getClient(): Client | null {
  if (cachedClient !== undefined) return cachedClient;
  const apiKey = process.env.STREAMING_AVAILABILITY_API_KEY;
  cachedClient = apiKey ? new Client(new Configuration({ apiKey })) : null;
  return cachedClient;
}

/**
 * Real per-title deep links from the Streaming Availability API
 * (movieofthenight.com), keyed by our own platform labels — used to
 * replace the guessed-search/homepage fallback in platform-links.ts
 * with an actual confirmed link straight to the title on that service.
 * Server-side only; the API key never reaches the browser.
 *
 * Optional end to end, same pattern as omdb.ts/gemini.ts: with no
 * STREAMING_AVAILABILITY_API_KEY set, or on any failure (network error,
 * rate limit, title not in their catalog), this returns null and the
 * caller falls back to exactly the pre-existing behavior. Called once
 * per title at ingest time (see ingestTitle in catalog.ts), not per
 * page view, to stay inside the free tier's 100 requests/day for as
 * long as possible — see README "Watch Now deep links" for the paid-
 * tier note.
 */
export async function getDeepLinksByPlatform(
  mediaType: MediaType,
  tmdbId: number
): Promise<Partial<Record<StreamingPlatform, string>> | null> {
  const client = getClient();
  if (!client) return null;

  const country = DEFAULT_REGION.toLowerCase();
  try {
    const show = await client.showsApi.getShow({ id: `${mediaType}/${tmdbId}`, country });
    const options = show.streamingOptions[country] ?? [];

    const links: Partial<Record<StreamingPlatform, string>> = {};
    for (const option of options) {
      // Skip buy/rent/addon options — Watch Now should land the user on
      // the subscription they already pay for, not a one-off purchase.
      if (option.type !== "subscription") continue;
      const platform = SERVICE_ID_TO_PLATFORM[option.service.id];
      if (!platform || links[platform]) continue; // first (highest-priority) match wins per platform
      links[platform] = option.link;
    }
    return links;
  } catch (err) {
    console.error(
      `Streaming Availability lookup failed for ${mediaType}/${tmdbId}:`,
      err instanceof Error ? err.message : err
    );
    return null;
  }
}
