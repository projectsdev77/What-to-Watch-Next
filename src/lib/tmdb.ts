// Thin wrapper around TMDB's REST API.
//
// TMDB is used for both catalog metadata AND streaming availability
// (the /watch/providers endpoint, which TMDB sources from JustWatch).
// This is the free/public option chosen because the client has no budget
// for a licensed data feed. See README "Data sources" for the tradeoffs
// and why Watchmode is the recommended upgrade path later.

const TMDB_BASE_URL = "https://api.themoviedb.org/3";
export const TMDB_POSTER_BASE_URL = "https://image.tmdb.org/t/p/w342";

export type MediaType = "movie" | "tv";

function requireApiKey(): string {
  const key = process.env.TMDB_API_KEY;
  if (!key) {
    throw new Error("TMDB_API_KEY is not set. Copy .env.example to .env.local and fill it in.");
  }
  return key;
}

async function tmdbFetch<T>(path: string, params: Record<string, string | number> = {}): Promise<T> {
  const url = new URL(`${TMDB_BASE_URL}${path}`);
  url.searchParams.set("api_key", requireApiKey());
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, String(value));
  }

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`TMDB request failed (${res.status}): ${path}`);
  }
  return res.json() as Promise<T>;
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

export function getGenres(mediaType: MediaType) {
  return tmdbFetch<{ genres: TmdbGenre[] }>(`/genre/${mediaType}/list`);
}

export function getTitleDetails(mediaType: MediaType, id: number) {
  // append_to_response bundles credits + keywords into one request instead of three.
  const keywordsField = mediaType === "movie" ? "keywords" : "keywords";
  return tmdbFetch<TmdbTitleDetails>(`/${mediaType}/${id}`, {
    append_to_response: `credits,${keywordsField}`,
  });
}

export function getWatchProviders(mediaType: MediaType, id: number) {
  return tmdbFetch<TmdbWatchProviders>(`/${mediaType}/${id}/watch/providers`);
}

/**
 * Convenience: availability for one title in one region, flattened to
 * provider names. Only "flatrate" (subscription) offerings count as
 * "available to watch now" for this product — rentals/purchases are
 * out of scope for a "reduce decision fatigue" recommender.
 */
export async function getStreamingPlatforms(mediaType: MediaType, id: number, region = "US") {
  const providers = await getWatchProviders(mediaType, id);
  const regionData = providers.results[region];
  return regionData?.flatrate?.map((p) => p.provider_name) ?? [];
}
