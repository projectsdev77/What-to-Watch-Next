import { NO_PREFERENCE_PLATFORM, type StreamingPlatform } from "@/lib/platforms";

/**
 * Best-effort deep link straight to a title's search results on the
 * user's own platform, instead of TMDB's combined "where to watch"
 * page (which makes them pick a platform a second time). None of these
 * services publish a free/official deep-linking API for an exact title
 * page — that's what a paid feed like Watchmode would give you (see
 * README) — so this goes to that platform's own site's search results
 * for the title instead. Landing on a real, logged-in search page one
 * tap from playing is still a large improvement over TMDB even when
 * the destination isn't the title's exact page.
 *
 * Worst case if a platform changes its search URL format: the query
 * param is silently ignored and the user lands on that platform's
 * blank search page (still a real, working page) rather than a 404 —
 * update the one entry below if that ever happens.
 */
const SEARCH_URL_BUILDERS: Partial<Record<StreamingPlatform, (title: string) => string>> = {
  Netflix: (title) => `https://www.netflix.com/search?q=${encodeURIComponent(title)}`,
  Hulu: (title) => `https://www.hulu.com/search?q=${encodeURIComponent(title)}`,
  "Disney+": (title) => `https://www.disneyplus.com/search?q=${encodeURIComponent(title)}`,
  "Prime Video": (title) =>
    `https://www.amazon.com/s?i=instant-video&k=${encodeURIComponent(title)}`,
  "Apple TV+": (title) => `https://tv.apple.com/search?term=${encodeURIComponent(title)}`,
  // Rebranded HBO Max -> Max -> back to HBO Max; hbomax.com is the
  // current live domain as of this writing.
  Max: (title) => `https://www.hbomax.com/search?q=${encodeURIComponent(title)}`,
  Peacock: (title) => `https://www.peacocktv.com/search?q=${encodeURIComponent(title)}`,
  "Paramount+": (title) => `https://www.paramountplus.com/search/?query=${encodeURIComponent(title)}`,
};

/** Returns null for a platform we have no search-URL mapping for
 * (currently just "Other" — there's no real service to deep-link to). */
export function platformSearchUrl(platform: string, title: string): string | null {
  if (platform === NO_PREFERENCE_PLATFORM) return null;
  const build = SEARCH_URL_BUILDERS[platform as StreamingPlatform];
  return build ? build(title) : null;
}
