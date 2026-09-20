import { NO_PREFERENCE_PLATFORM, type StreamingPlatform } from "@/lib/platforms";

/**
 * Best-effort deep link straight to the user's own platform, instead
 * of TMDB's combined "where to watch" page (which makes them pick a
 * platform a second time). None of these services publish a free/
 * official deep-linking API for an exact title page — that's what a
 * paid feed like Watchmode would give you (see README).
 *
 * Only platforms with a *confirmed* working search URL get a
 * query-based deep link here — this environment has no outbound
 * access to click-test any of these, so "confirmed" means real
 * evidence (a search engine actually indexing that platform's live
 * search-results page with the query pre-filled), not just a
 * plausible guess. A wrong guess isn't a graceful "lands on a blank
 * search page" — confirmed live, a wrong Disney+ guess was a hard 404
 * branded page, worse than the old TMDB link it replaced. Everything
 * else links to its plain homepage until it's actually confirmed:
 *
 * - Netflix, Prime Video: long-established, widely documented patterns
 *   (Prime Video's `i=instant-video` department code has been stable
 *   for years).
 * - Paramount+: confirmed — a live paramountplus.com/search/?query=
 *   results page for a specific title turned up indexed with that
 *   title in its own page title, so `?query=` genuinely pre-fills it.
 * - Hulu, Disney+, Apple TV+, Max, Peacock: NOT yet confirmed. Their
 *   search pages exist, but no evidence surfaced for the query
 *   parameter each one actually reads. Promote one to
 *   SEARCH_URL_BUILDERS as soon as someone confirms the working URL
 *   by hand (search the title on the site, copy the resulting URL).
 */
const SEARCH_URL_BUILDERS: Partial<Record<StreamingPlatform, (title: string) => string>> = {
  Netflix: (title) => `https://www.netflix.com/search?q=${encodeURIComponent(title)}`,
  "Prime Video": (title) =>
    `https://www.amazon.com/s?i=instant-video&k=${encodeURIComponent(title)}`,
  "Paramount+": (title) => `https://www.paramountplus.com/search/?query=${encodeURIComponent(title)}`,
};

// Homepage fallback for platforms without a confirmed-working search
// URL above — always a real, working page, never a guess.
const HOMEPAGE_URLS: Partial<Record<StreamingPlatform, string>> = {
  Hulu: "https://www.hulu.com/",
  "Disney+": "https://www.disneyplus.com/",
  "Apple TV+": "https://tv.apple.com/",
  Max: "https://www.hbomax.com/",
  Peacock: "https://www.peacocktv.com/",
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
