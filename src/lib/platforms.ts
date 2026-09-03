// Single-region product for v1 — every write and read of
// title_availability.region should go through this constant so the day
// a second region gets added, there's exactly one place to change.
export const DEFAULT_REGION = "US";

// Not a real service — lets someone without any of the listed platforms
// (or who isn't sure yet) still pick *something* and continue. Selecting
// only this means "don't filter by platform", not "filter to nothing" —
// see the unrestricted-mode handling in src/lib/recommendations.ts.
export const NO_PREFERENCE_PLATFORM = "Other" as const;

// Display list for onboarding platform selection.
export const STREAMING_PLATFORMS = [
  "Netflix",
  "Hulu",
  "Disney+",
  "Prime Video",
  "Apple TV+",
  "Max",
  "Peacock",
  "Paramount+",
  NO_PREFERENCE_PLATFORM,
] as const;

export type StreamingPlatform = (typeof STREAMING_PLATFORMS)[number];

/**
 * TMDB's /watch/providers endpoint returns its own free-text
 * provider_name strings (sourced from JustWatch), e.g. "Amazon Prime
 * Video", "Disney Plus", "Apple TV Plus", "HBO Max" — not guaranteed to
 * match our onboarding labels exactly. Numeric provider_id looked like
 * a more stable option, but isn't: Amazon Prime Video alone has (at
 * least) two different provider_ids in TMDB's system, and IDs aren't
 * documented as stable across rebrands (e.g. HBO Max -> Max). So
 * instead we normalize by name at seed/write time, here, in one place
 * we control — this is called from scripts/seed-titles.ts before a raw
 * provider_name from TMDB is ever written to title_availability.
 *
 * Order matters: more specific checks (e.g. "Max") are guarded against
 * false positives (e.g. "Cinemax" contains "max" as a substring).
 */
export function normalizeProviderName(rawName: string): StreamingPlatform | null {
  const lower = rawName.toLowerCase().trim();

  if (lower.includes("netflix")) return "Netflix";
  if (lower.includes("hulu")) return "Hulu";
  if (lower.includes("disney")) return "Disney+";
  if (lower.includes("prime video") || lower.includes("amazon prime")) return "Prime Video";
  if (lower.includes("apple tv")) return "Apple TV+";
  if (lower.includes("peacock")) return "Peacock";
  if (lower.includes("paramount")) return "Paramount+";
  if (lower === "max" || lower.startsWith("max ") || lower.includes("hbo max")) return "Max";

  return null;
}
