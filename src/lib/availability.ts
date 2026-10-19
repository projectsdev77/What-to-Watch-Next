export interface AvailabilityRow {
  platform: string;
  /** Real title link; "" = looked up, nothing found; null = never looked up. */
  deepLink: string | null;
}

/**
 * Decides which of our platforms a title is on, and the link for each.
 * Two sources can disagree — TMDB/JustWatch (`tmdbPlatforms`) and the
 * Streaming Availability lookup (`deepLinks`, null when no lookup ran or
 * it failed) — so one wins, ensuring a platform shown has a real link
 * whenever the data has one:
 *
 * 1. Lookup found the title on any of our platforms: use exactly those,
 *    each with its real link. Fresher than TMDB, and it already excludes
 *    rent/buy-only listings.
 * 2. Lookup ran but found none of our platforms: keep TMDB's list (marked
 *    "" = checked) rather than drop the title from recommendations over
 *    a possible gap in that source.
 * 3. No lookup: if an earlier lookup's result is stored (any real link),
 *    keep it untouched — so running out of quota doesn't flip a title
 *    back to TMDB's list. Otherwise TMDB's list, keeping stored links.
 */
export function resolveAvailability(
  tmdbPlatforms: string[],
  deepLinks: Partial<Record<string, string>> | null,
  existing: Map<string, string | null>
): AvailabilityRow[] {
  if (deepLinks) {
    const found = Object.entries(deepLinks).filter((entry): entry is [string, string] => Boolean(entry[1]));
    if (found.length > 0) return found.map(([platform, deepLink]) => ({ platform, deepLink }));
    return tmdbPlatforms.map((platform) => ({ platform, deepLink: "" }));
  }

  const storedLookup = [...existing.values()].some((link) => Boolean(link));
  if (storedLookup) return [...existing.entries()].map(([platform, deepLink]) => ({ platform, deepLink }));
  return tmdbPlatforms.map((platform) => ({ platform, deepLink: existing.get(platform) ?? null }));
}
