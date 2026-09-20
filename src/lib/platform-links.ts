import { NO_PREFERENCE_PLATFORM, type StreamingPlatform } from "@/lib/platforms";

/**
 * Best-effort deep link straight to the user's own platform, instead
 * of TMDB's combined "where to watch" page (which makes them pick a
 * platform a second time). None of these services publish a free/
 * official deep-linking API for an exact title page — that's what a
 * paid feed like Watchmode would give you (see README).
 *
 * Only Netflix and Prime Video get a query-based search deep link
 * here — both URL patterns are long-established and widely documented
 * (Prime Video's `i=instant-video` department code in particular has
 * been stable for years). Every other platform links to its plain
 * homepage instead of a guessed search URL: this environment has no
 * outbound access to verify any of these live, and a guess that's
 * wrong isn't a graceful "lands on a blank search page" like assumed
 * here originally — confirmed live, a wrong Disney+ guess is a hard
 * 404 branded page, which is worse than the old TMDB link it replaced.
 * Promote a platform back to a search deep link only once someone has
 * actually clicked it and confirmed the URL works.
 */
const SEARCH_URL_BUILDERS: Partial<Record<StreamingPlatform, (title: string) => string>> = {
  Netflix: (title) => `https://www.netflix.com/search?q=${encodeURIComponent(title)}`,
  "Prime Video": (title) =>
    `https://www.amazon.com/s?i=instant-video&k=${encodeURIComponent(title)}`,
};

// Homepage fallback for platforms without a confirmed-working search
// URL above — always a real, working page, never a guess.
const HOMEPAGE_URLS: Partial<Record<StreamingPlatform, string>> = {
  Hulu: "https://www.hulu.com/",
  "Disney+": "https://www.disneyplus.com/",
  "Apple TV+": "https://tv.apple.com/",
  Max: "https://www.hbomax.com/",
  Peacock: "https://www.peacocktv.com/",
  "Paramount+": "https://www.paramountplus.com/",
};

/** A search deep link where we have a confirmed-working one, that
 * platform's homepage otherwise, or null for a platform with neither
 * (currently just "Other" — there's no real service to link to). */
export function platformDeepLink(platform: string, title: string): string | null {
  if (platform === NO_PREFERENCE_PLATFORM) return null;
  const buildSearch = SEARCH_URL_BUILDERS[platform as StreamingPlatform];
  if (buildSearch) return buildSearch(title);
  return HOMEPAGE_URLS[platform as StreamingPlatform] ?? null;
}
