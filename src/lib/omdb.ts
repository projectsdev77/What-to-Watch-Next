// Thin wrapper around the OMDb API (https://www.omdbapi.com) — used only
// for real outside ratings (IMDb + Rotten Tomatoes) to show alongside our
// own TMDB-sourced score. Free tier, keyed by IMDb id (TMDB's external_ids
// gives us that). Optional: if OMDB_API_KEY isn't set, ratings are simply
// left blank rather than breaking catalog ingestion.

const OMDB_BASE_URL = "https://www.omdbapi.com/";

export interface OmdbRatings {
  imdbRating: number | null;
  rottenTomatoes: string | null;
}

interface OmdbResponse {
  Response: "True" | "False";
  imdbRating?: string;
  Ratings?: { Source: string; Value: string }[];
}

export async function getOmdbRatings(imdbId: string): Promise<OmdbRatings | null> {
  const key = process.env.OMDB_API_KEY;
  if (!key) return null;

  const url = new URL(OMDB_BASE_URL);
  url.searchParams.set("apikey", key);
  url.searchParams.set("i", imdbId);

  let res: Response;
  try {
    res = await fetch(url.toString());
  } catch {
    return null;
  }
  if (!res.ok) return null;

  const data = (await res.json()) as OmdbResponse;
  if (data.Response === "False") return null;

  const imdbRating = data.imdbRating && data.imdbRating !== "N/A" ? Number(data.imdbRating) : null;
  const rottenTomatoes = data.Ratings?.find((r) => r.Source === "Rotten Tomatoes")?.Value ?? null;

  return { imdbRating, rottenTomatoes };
}
