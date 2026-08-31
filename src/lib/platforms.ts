// Display list for onboarding platform selection.
//
// NOTE: these labels are for the UI only. TMDB's /watch/providers
// endpoint returns its own provider_name strings (e.g. "Amazon Prime
// Video", "Disney Plus", "Apple TV Plus") which may not match these
// exactly. The recommendation engine (Phase 3) will need a mapping
// between the two before it can filter titles by selected platform —
// tracked in TODO.md.
export const STREAMING_PLATFORMS = [
  "Netflix",
  "Hulu",
  "Disney+",
  "Prime Video",
  "Apple TV+",
  "Max",
  "Peacock",
  "Paramount+",
] as const;

export type StreamingPlatform = (typeof STREAMING_PLATFORMS)[number];
