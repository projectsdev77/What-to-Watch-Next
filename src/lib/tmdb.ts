// Thin wrapper around TMDB's REST API.
//
// TMDB is used for both catalog metadata AND streaming availability
// (the /watch/providers endpoint, which TMDB sources from JustWatch).
// This is the free/public option chosen because the client has no budget
// for a licensed data feed. See README "Data sources" for the tradeoffs
// and why Watchmode is the recommended upgrade path later.

import { DEFAULT_REGION } from "@/lib/platforms";

const TMDB_BASE_URL = "https://api.themoviedb.org/3";
// w342 was soft even at typical card sizes on a high-DPI screen (a
// ~200px CSS-wide card needs ~400px of real source detail at 2x); w780
// covers every poster/card use in the app crisply. Next's own image
// optimizer (next.config.ts) still downsizes this per request, so this
// doesn't mean sending full-size images to small thumbnails.
export const TMDB_POSTER_BASE_URL = "https://image.tmdb.org/t/p/w780";
// For the large, stretched-to-near-full-width ambient/hero backdrops
// (Tonight's Pick's hero backdrop, Browse/Watchlists' ambient still) —
// those need real detail at up to ~1280px wide, well past what even
// w780 can supply without looking soft.
export const TMDB_BACKDROP_BASE_URL = "https://image.tmdb.org/t/p/original";

export type MediaType = "movie" | "tv";

/** Reads a "type" URL search param into a real MediaType, defaulting to
 * "movie" for anything missing or unrecognized — used by the Movies/TV
 * Shows tabs on the home and browse pages. */
export function parseMediaType(value: string | undefined): MediaType {
  return value === "tv" ? "tv" : "movie";
}

function requireApiKey(): string {
  const key = process.env.TMDB_API_KEY;
  if (!key) {
    throw new Error("TMDB_API_KEY is not set. Copy .env.example to .env.local and fill it in.");
  }
  return key;
}

const MAX_ATTEMPTS = 3;

async function tmdbFetch<T>(path: string, params: Record<string, string | number> = {}): Promise<T> {
  const url = new URL(`${TMDB_BASE_URL}${path}`);
  url.searchParams.set("api_key", requireApiKey());
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, String(value));
  }

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const res = await fetch(url.toString());
    if (res.ok) return res.json() as Promise<T>;

    // Only retry transient failures (rate limit / server errors) — a
    // 404 or 401 will never succeed on retry.
    const retryable = res.status === 429 || res.status >= 500;
    if (!retryable || attempt === MAX_ATTEMPTS) {
      throw new Error(`TMDB request failed (${res.status}): ${path}`);
    }

    const retryAfterHeader = res.headers.get("Retry-After");
    const delayMs = retryAfterHeader ? Number(retryAfterHeader) * 1000 : 500 * 2 ** (attempt - 1);
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  // Unreachable — the loop above always returns or throws — but keeps
  // TypeScript satisfied that every path returns a value.
  throw new Error(`TMDB request failed: ${path}`);
}

export interface TmdbTitleSummary {
  id: number;
  media_type?: MediaType;
  title?: string; // movies
  name?: string; // tv
  overview: string;
  poster_path: string | null;
  genre_ids: number[];
  vote_average: number;
  release_date?: string;
  first_air_date?: string;
}

export interface TmdbGenre {
  id: number;
  name: string;
}

export interface TmdbCredits {
  cast: { id: number; name: string; character: string; order: number }[];
  crew: { id: number; name: string; job: string }[];
}

export interface TmdbTitleDetails extends TmdbTitleSummary {
  genres: TmdbGenre[];
  keywords?: { id: number; name: string }[];
  credits?: TmdbCredits;
  external_ids?: { imdb_id: string | null };
}

// Country -> list of provider offerings (flatrate = subscription streaming).
export interface TmdbWatchProviders {
  results: Record<
    string,
    {
      link: string;
      flatrate?: { provider_id: number; provider_name: string; logo_path: string }[];
      ads?: { provider_id: number; provider_name: string; logo_path: string }[];
      free?: { provider_id: number; provider_name: string; logo_path: string }[];
    }
  >;
}

export function searchMulti(query: string, page = 1) {
  return tmdbFetch<{ results: TmdbTitleSummary[]; total_pages: number }>("/search/multi", {
    query,
    page,
    include_adult: "false",
  });
}

export function getPopular(mediaType: MediaType, page = 1) {
  return tmdbFetch<{ results: TmdbTitleSummary[]; total_pages: number }>(`/${mediaType}/popular`, { page });
}

// TMDB caps /discover at 500 pages (~10,000 titles) per media type —
// used for the ongoing catalog-broadening sync (src/lib/catalog.ts),
// as opposed to getPopular's one-time, much smaller initial bootstrap.
export const DISCOVER_MAX_PAGE = 500;

export function getDiscover(mediaType: MediaType, page = 1) {
  return tmdbFetch<{ results: TmdbTitleSummary[]; total_pages: number }>(`/discover/${mediaType}`, {
    page,
    sort_by: "popularity.desc",
    include_adult: "false",
  });
}

export function getGenres(mediaType: MediaType) {
  return tmdbFetch<{ genres: TmdbGenre[] }>(`/genre/${mediaType}/list`);
}

export function getTitleDetails(mediaType: MediaType, id: number) {
  // append_to_response bundles credits + keywords + external_ids (which
  // carries the imdb_id used for OMDb ratings lookups) into one request
  // instead of several.
  const keywordsField = mediaType === "movie" ? "keywords" : "keywords";
  return tmdbFetch<TmdbTitleDetails>(`/${mediaType}/${id}`, {
    append_to_response: `credits,${keywordsField},external_ids`,
  });
}

export function getWatchProviders(mediaType: MediaType, id: number) {
  return tmdbFetch<TmdbWatchProviders>(`/${mediaType}/${id}/watch/providers`);
}

/** Public TMDB "where to watch" page for a title — same shape as the
 * `link` field /watch/providers itself returns (captured as
 * titles.justwatch_link during seeding); this is the fallback for
 * titles seeded before that field existed, or with no provider data. */
export function tmdbTitleUrl(mediaType: MediaType, tmdbId: number) {
  return `https://www.themoviedb.org/${mediaType}/${tmdbId}/watch?locale=${DEFAULT_REGION}`;
}
