import { createClient } from "@/lib/supabase/server";
import { genreName } from "@/lib/genres";
import { DEFAULT_REGION } from "@/lib/platforms";
import { tmdbTitleUrl, type MediaType } from "@/lib/tmdb";

export interface RecommendedTitle {
  id: number;
  tmdbId: number;
  mediaType: MediaType;
  title: string;
  overview: string | null;
  posterPath: string | null;
  voteAverage: number | null;
  platforms: string[];
  matchPercent: number;
  why: string;
  watchUrl: string;
}

export type TonightsPickResult =
  | { status: "no-platforms" }
  | { status: "empty-catalog" }
  | { status: "nothing-available" }
  | { status: "all-rated" }
  | { status: "ok"; pick: RecommendedTitle; discover: RecommendedTitle[] };

interface CandidateRow {
  id: number;
  tmdb_id: number;
  media_type: MediaType;
  title: string;
  overview: string | null;
  poster_path: string | null;
  genre_ids: number[];
  vote_average: number | null;
}

interface ScoredCandidate {
  row: CandidateRow;
  score: number;
  topGenreIds: number[];
}

const DISCOVER_SIZE = 6;
const MAX_CANDIDATES = 300; // defensive cap for the .in() query at MVP scale

export async function getTonightsPick(userId: string): Promise<TonightsPickResult> {
  const supabase = await createClient();

  const [{ data: userPlatforms }, { data: tasteProfile }, { data: feedbackRows }, { count: titleCount }] =
    await Promise.all([
      supabase.from("user_platforms").select("platform_name").eq("user_id", userId),
      supabase.from("user_taste_profile").select("genre_weights").eq("user_id", userId).maybeSingle(),
      supabase.from("user_title_feedback").select("title_id, status, titles(id, title, genre_ids)").eq("user_id", userId),
      supabase.from("titles").select("*", { count: "exact", head: true }),
    ]);

  const platformNames = (userPlatforms ?? []).map((p) => p.platform_name as string);
  if (platformNames.length === 0) return { status: "no-platforms" };
  if (!titleCount) return { status: "empty-catalog" };

  const genreWeights: Record<string, number> = (tasteProfile?.genre_weights as Record<string, number>) ?? {};
  const hasSignal = Object.values(genreWeights).some((w) => w !== 0);

  const excludedIds = new Set((feedbackRows ?? []).map((r) => r.title_id as number));

  const { data: availabilityRows } = await supabase
    .from("title_availability")
    .select("title_id, platform_name")
    .eq("region", DEFAULT_REGION)
    .in("platform_name", platformNames);

  const platformsByTitleId = new Map<number, Set<string>>();
  for (const row of availabilityRows ?? []) {
    const titleId = row.title_id as number;
    const set = platformsByTitleId.get(titleId) ?? new Set<string>();
    set.add(row.platform_name as string);
    platformsByTitleId.set(titleId, set);
  }

  if (platformsByTitleId.size === 0) return { status: "nothing-available" };

  const candidateIds = [...platformsByTitleId.keys()].filter((id) => !excludedIds.has(id)).slice(0, MAX_CANDIDATES);
  if (candidateIds.length === 0) return { status: "all-rated" };

  const { data: candidateRows } = await supabase
    .from("titles")
    .select("id, tmdb_id, media_type, title, overview, poster_path, genre_ids, vote_average")
    .in("id", candidateIds);

  if (!candidateRows || candidateRows.length === 0) return { status: "all-rated" };

  // Genre -> names of liked titles sharing that genre, for the "why" copy.
  const likedTitlesByGenre = new Map<number, string[]>();
  for (const row of feedbackRows ?? []) {
    if (row.status !== "liked") continue;
    const liked = row.titles as unknown as { title: string; genre_ids: number[] } | null;
    if (!liked) continue;
    for (const genreId of liked.genre_ids) {
      const names = likedTitlesByGenre.get(genreId) ?? [];
      if (!names.includes(liked.title)) names.push(liked.title);
      likedTitlesByGenre.set(genreId, names);
    }
  }

  const scored: ScoredCandidate[] = (candidateRows as CandidateRow[]).map((row) => {
    if (!hasSignal) {
      // Cold start: no taste signal yet, rank by popularity instead.
      return { row, score: row.vote_average ?? 0, topGenreIds: [] };
    }
    const weighted = row.genre_ids
      .map((genreId) => ({ genreId, weight: genreWeights[String(genreId)] ?? 0 }))
      .sort((a, b) => b.weight - a.weight);
    const score = weighted.reduce((sum, g) => sum + g.weight, 0);
    const topGenreIds = weighted.filter((g) => g.weight > 0).map((g) => g.genreId);
    return { row, score, topGenreIds };
  });

  scored.sort((a, b) => b.score - a.score || (b.row.vote_average ?? 0) - (a.row.vote_average ?? 0));

  const scores = scored.map((c) => c.score);
  const min = Math.min(...scores);
  const max = Math.max(...scores);

  function toRecommended(candidate: ScoredCandidate): RecommendedTitle {
    const { row, score, topGenreIds } = candidate;
    const matchPercent = max === min ? 90 : Math.round(60 + 39 * ((score - min) / (max - min)));

    let why: string;
    if (!hasSignal) {
      why = "Popular right now — rate a few more titles to get picks tailored to you.";
    } else if (topGenreIds.length > 0) {
      const primaryGenre = genreName(topGenreIds[0]);
      const likedNames = (likedTitlesByGenre.get(topGenreIds[0]) ?? []).slice(0, 2);
      why =
        likedNames.length > 0
          ? `Because you liked ${likedNames.join(" and ")} — both ${primaryGenre}.`
          : `Because you tend to enjoy ${primaryGenre} titles.`;
    } else {
      why = "Available on your platforms and well-reviewed — worth a look.";
    }

    return {
      id: row.id,
      tmdbId: row.tmdb_id,
      mediaType: row.media_type,
      title: row.title,
      overview: row.overview,
      posterPath: row.poster_path,
      voteAverage: row.vote_average,
      platforms: [...(platformsByTitleId.get(row.id) ?? [])],
      matchPercent,
      why,
      watchUrl: tmdbTitleUrl(row.media_type, row.tmdb_id),
    };
  }

  const [pick, ...rest] = scored;
  return {
    status: "ok",
    pick: toRecommended(pick),
    discover: rest.slice(0, DISCOVER_SIZE).map(toRecommended),
  };
}
