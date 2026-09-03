import { createClient } from "@/lib/supabase/server";
import { genreName } from "@/lib/genres";
import { DEFAULT_REGION, NO_PREFERENCE_PLATFORM } from "@/lib/platforms";
import { tmdbTitleUrl, type MediaType } from "@/lib/tmdb";
import { chooseTonightsPick } from "@/lib/gemini";

export interface RecommendedTitle {
  id: number;
  tmdbId: number;
  mediaType: MediaType;
  title: string;
  overview: string | null;
  posterPath: string | null;
  voteAverage: number | null;
  genreIds: number[];
  platforms: string[];
  matchPercent: number;
  why: string;
  watchUrl: string;
  isWatchlisted: boolean;
}

export type CandidateStatus = "no-platforms" | "empty-catalog" | "nothing-available" | "all-rated";

interface CandidateRow {
  id: number;
  tmdb_id: number;
  media_type: MediaType;
  title: string;
  overview: string | null;
  poster_path: string | null;
  genre_ids: number[];
  vote_average: number | null;
  justwatch_link: string | null;
}

interface ScoredCandidate {
  row: CandidateRow;
  score: number;
  topGenreIds: number[];
  isWatchlisted: boolean;
}

interface CandidatePool {
  scored: ScoredCandidate[];
  platformsByTitleId: Map<number, Set<string>>;
  likedTitlesByGenre: Map<number, string[]>;
  hasSignal: boolean;
  allPlatforms: string[];
  allGenres: { id: number; name: string }[];
  // True when the user has no real platform preference (picked only
  // "Other"), so `platforms`/`allPlatforms` show everything available
  // rather than a filtered set the user actually subscribes to — the UI
  // needs this to know whether a per-platform Watch Now picker is honest
  // to offer, or whether to fall back to the generic combined link.
  unrestricted: boolean;
  // Genres of the single most recently disliked title, if any — used to
  // steer tonight's pick away from an immediate same-genre repeat (see
  // rankCandidatesForTonight). Not used for Browse/Discover's ordering, which
  // should stay pure taste-rank.
  recentlyDislikedGenreIds: Set<number>;
}

// A watchlisted title should be *favored*, not hidden — this is a flat
// bonus on top of its genre-match score, big enough to outrank most
// organic matches without being an unconditional override.
const WATCHLIST_BONUS = 3;
const MAX_CANDIDATES = 300; // defensive cap for the .in() query at MVP scale

// "Not today" (status: skipped) means exactly that — not forever. Liked,
// disliked, and watched are genuine judgments and stay excluded
// permanently; a skip only holds the title back for a day before it's
// eligible to be recommended again.
const SKIP_COOLDOWN_HOURS = 24;

async function getCandidatePool(
  userId: string,
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<CandidatePool | { status: CandidateStatus }> {
  const [{ data: userPlatforms }, { data: tasteProfile }, { data: feedbackRows }, { count: titleCount }, { data: watchlistRows }] =
    await Promise.all([
      supabase.from("user_platforms").select("platform_name").eq("user_id", userId),
      supabase.from("user_taste_profile").select("genre_weights").eq("user_id", userId).maybeSingle(),
      supabase
        .from("user_title_feedback")
        .select("title_id, status, updated_at, titles(id, title, genre_ids)")
        .eq("user_id", userId),
      supabase.from("titles").select("*", { count: "exact", head: true }),
      // A title on ANY of the user's watchlists gets the bonus below —
      // "I want to watch this" doesn't depend on which named list it's
      // filed under (see supabase/migrations/0004_multiple_watchlists.sql).
      supabase.from("watchlist_items").select("title_id").eq("user_id", userId),
    ]);

  const platformNames = (userPlatforms ?? []).map((p) => p.platform_name as string);
  if (platformNames.length === 0) return { status: "no-platforms" };
  if (!titleCount) return { status: "empty-catalog" };

  // "Other" isn't a real service — if that's all someone picked (no
  // budget for streaming, or their service just isn't listed), don't
  // filter by platform at all: show the whole catalog instead of
  // blocking them out entirely.
  const realPlatformNames = platformNames.filter((p) => p !== NO_PREFERENCE_PLATFORM);
  const unrestricted = realPlatformNames.length === 0;

  const genreWeights: Record<string, number> = (tasteProfile?.genre_weights as Record<string, number>) ?? {};
  const hasSignal = Object.values(genreWeights).some((w) => w !== 0);

  // Anything already judged (liked/disliked/watched) is excluded from
  // future picks permanently. Watchlisted titles are the one exception:
  // the user has said they *want* to watch it, so it stays a candidate
  // and gets a scoring bonus instead — see toRecommended below. A skip
  // ("Not today") only excludes for SKIP_COOLDOWN_HOURS — it should come
  // back tomorrow, not vanish forever.
  const skipCutoff = Date.now() - SKIP_COOLDOWN_HOURS * 60 * 60 * 1000;
  const excludedIds = new Set<number>();
  for (const row of feedbackRows ?? []) {
    const titleId = row.title_id as number;
    if (row.status === "skipped") {
      const skippedAt = new Date(row.updated_at as string).getTime();
      if (skippedAt > skipCutoff) excludedIds.add(titleId);
    } else {
      excludedIds.add(titleId);
    }
  }
  const watchlistedIds = new Set((watchlistRows ?? []).map((row) => row.title_id as number));

  const availabilityQuery = supabase
    .from("title_availability")
    .select("title_id, platform_name")
    .eq("region", DEFAULT_REGION);
  const { data: availabilityRows } = unrestricted
    ? await availabilityQuery
    : await availabilityQuery.in("platform_name", realPlatformNames);

  const platformsByTitleId = new Map<number, Set<string>>();
  const seenPlatforms = new Set<string>();
  for (const row of availabilityRows ?? []) {
    const titleId = row.title_id as number;
    const platformName = row.platform_name as string;
    const set = platformsByTitleId.get(titleId) ?? new Set<string>();
    set.add(platformName);
    platformsByTitleId.set(titleId, set);
    seenPlatforms.add(platformName);
  }
  if (platformsByTitleId.size === 0) return { status: "nothing-available" };

  const candidateIds = [...platformsByTitleId.keys()].filter((id) => !excludedIds.has(id)).slice(0, MAX_CANDIDATES);
  if (candidateIds.length === 0) return { status: "all-rated" };

  const { data: candidateRows } = await supabase
    .from("titles")
    .select("id, tmdb_id, media_type, title, overview, poster_path, genre_ids, vote_average, justwatch_link")
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

  // Most recent dislike's genres — a flat score sum has no sense of
  // "I just said no to this kind of thing," so without this, disliking
  // one title in a genre the user's taste profile otherwise favors just
  // surfaces the next-highest-scoring title from that same genre, which
  // reads as "nothing changed."
  let recentlyDislikedGenreIds = new Set<number>();
  let mostRecentDislikeAt = -Infinity;
  for (const row of feedbackRows ?? []) {
    if (row.status !== "disliked") continue;
    const disliked = row.titles as unknown as { genre_ids: number[] } | null;
    if (!disliked) continue;
    const at = new Date(row.updated_at as string).getTime();
    if (at > mostRecentDislikeAt) {
      mostRecentDislikeAt = at;
      recentlyDislikedGenreIds = new Set(disliked.genre_ids);
    }
  }

  const allGenreIds = new Set<number>();
  const scored: ScoredCandidate[] = (candidateRows as CandidateRow[]).map((row) => {
    row.genre_ids.forEach((id) => allGenreIds.add(id));
    const isWatchlisted = watchlistedIds.has(row.id);
    const bonus = isWatchlisted ? WATCHLIST_BONUS : 0;

    if (!hasSignal) {
      // Cold start: no taste signal yet, rank by popularity instead.
      return { row, score: (row.vote_average ?? 0) + bonus, topGenreIds: [], isWatchlisted };
    }
    const weighted = row.genre_ids
      .map((genreId) => ({ genreId, weight: genreWeights[String(genreId)] ?? 0 }))
      .sort((a, b) => b.weight - a.weight);
    const score = weighted.reduce((sum, g) => sum + g.weight, 0) + bonus;
    const topGenreIds = weighted.filter((g) => g.weight > 0).map((g) => g.genreId);
    return { row, score, topGenreIds, isWatchlisted };
  });

  scored.sort((a, b) => b.score - a.score || (b.row.vote_average ?? 0) - (a.row.vote_average ?? 0));

  return {
    scored,
    platformsByTitleId,
    likedTitlesByGenre,
    hasSignal,
    allPlatforms: [...seenPlatforms].sort(),
    allGenres: [...allGenreIds].map((id) => ({ id, name: genreName(id) })).sort((a, b) => a.name.localeCompare(b.name)),
    unrestricted,
    recentlyDislikedGenreIds,
  };
}

// Enough to usually bump a same-genre repeat below a different-genre
// alternative that's reasonably close in score, without being an
// absolute ban on the genre — if literally everything eligible shares
// it, that's still the best available pick.
const DISLIKED_GENRE_PENALTY = 2;

// Full deterministic ranking used to pick Tonight's Pick — also the
// shortlist Gemini chooses from (see getTonightsPick): grounding the AI
// to a short list of already-scored, real, available titles instead of
// letting it pick from nothing.
function rankCandidatesForTonight(pool: CandidatePool): ScoredCandidate[] {
  if (pool.recentlyDislikedGenreIds.size === 0) return pool.scored;

  const adjusted = pool.scored.map((candidate) => ({
    candidate,
    adjustedScore:
      candidate.score -
      (candidate.row.genre_ids.some((id) => pool.recentlyDislikedGenreIds.has(id)) ? DISLIKED_GENRE_PENALTY : 0),
  }));
  adjusted.sort((a, b) => b.adjustedScore - a.adjustedScore || b.candidate.score - a.candidate.score);
  return adjusted.map((a) => a.candidate);
}

function toRecommended(candidate: ScoredCandidate, pool: CandidatePool, min: number, max: number): RecommendedTitle {
  const { row, score, topGenreIds, isWatchlisted } = candidate;
  const matchPercent = max === min ? 90 : Math.round(60 + 39 * ((score - min) / (max - min)));

  let why: string;
  if (isWatchlisted) {
    why = "On your watchlist — and it matches your taste.";
  } else if (!pool.hasSignal) {
    why = "Popular right now — rate a few more titles to get picks tailored to you.";
  } else if (topGenreIds.length > 0) {
    const primaryGenre = genreName(topGenreIds[0]);
    const likedNames = (pool.likedTitlesByGenre.get(topGenreIds[0]) ?? []).slice(0, 2);
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
    genreIds: row.genre_ids,
    platforms: [...(pool.platformsByTitleId.get(row.id) ?? [])],
    matchPercent,
    why,
    // TMDB's real combined "where to watch" link (JustWatch) when we
    // have one cached; falls back to the generic TMDB title page for
    // titles seeded before this existed, or with no provider data.
    watchUrl: row.justwatch_link ?? tmdbTitleUrl(row.media_type, row.tmdb_id),
    isWatchlisted,
  };
}

export type TonightsPickResult =
  | { status: CandidateStatus }
  | { status: "ok"; pick: RecommendedTitle; discover: RecommendedTitle[]; unrestricted: boolean };

const DISCOVER_SIZE = 6;
// How many of the top-ranked candidates Gemini gets to choose among —
// small on purpose: keeps the prompt short and keeps every option a
// genuinely good match on its own, so the AI is picking the best of
// several good fits, not rescuing a bad one.
const AI_SHORTLIST_SIZE = 8;

function sharedGenreCount(a: number[], b: number[]): number {
  const bSet = new Set(b);
  return a.filter((id) => bSet.has(id)).length;
}

export async function getTonightsPick(userId: string): Promise<TonightsPickResult> {
  const supabase = await createClient();
  const pool = await getCandidatePool(userId, supabase);
  if ("status" in pool) return pool;

  const scores = pool.scored.map((c) => c.score);
  const min = Math.min(...scores);
  const max = Math.max(...scores);

  const ranked = rankCandidatesForTonight(pool);
  const shortlist = ranked.slice(0, AI_SHORTLIST_SIZE);

  let pick = ranked[0];
  let aiWhy: string | null = null;

  // Optional: if GEMINI_API_KEY isn't set, or the call fails/times out/
  // names something outside the shortlist, this returns null and the
  // plain scoring-based pick above stands — same behavior as before AI
  // integration existed.
  const aiChoice = await chooseTonightsPick(
    shortlist.map((c) => ({
      id: c.row.id,
      title: c.row.title,
      mediaType: c.row.media_type,
      genres: c.row.genre_ids.map((id) => genreName(id)),
      overview: c.row.overview,
      voteAverage: c.row.vote_average,
    })),
    {
      likedGenres: [...pool.likedTitlesByGenre.keys()].map((id) => genreName(id)),
      avoidGenres: [...pool.recentlyDislikedGenreIds].map((id) => genreName(id)),
    }
  );
  if (aiChoice) {
    const matched = shortlist.find((c) => c.row.id === aiChoice.titleId);
    if (matched) {
      pick = matched;
      aiWhy = aiChoice.why;
    }
  }

  const rest = pool.scored.filter((c) => c.row.id !== pick.row.id);

  // "Also consider" should read as "because you're about to watch this",
  // not just "your next-best overall matches" — rank by how much each
  // candidate's genres overlap with the actual pick, falling back to
  // overall taste score as a tiebreaker.
  const related = [...rest].sort((a, b) => {
    const overlapA = sharedGenreCount(a.row.genre_ids, pick.row.genre_ids);
    const overlapB = sharedGenreCount(b.row.genre_ids, pick.row.genre_ids);
    return overlapB - overlapA || b.score - a.score;
  });

  const recommendedPick = toRecommended(pick, pool, min, max);
  if (aiWhy) recommendedPick.why = aiWhy;

  return {
    status: "ok",
    pick: recommendedPick,
    discover: related.slice(0, DISCOVER_SIZE).map((c) => toRecommended(c, pool, min, max)),
    unrestricted: pool.unrestricted,
  };
}

export interface DiscoverListOptions {
  platform?: string;
  genreId?: number;
  limit?: number;
}

export type DiscoverListResult =
  | { status: CandidateStatus }
  | {
      status: "ok";
      titles: RecommendedTitle[];
      availablePlatforms: string[];
      availableGenres: { id: number; name: string }[];
      unrestricted: boolean;
    };

const DEFAULT_DISCOVER_LIMIT = 30;

export async function getDiscoverList(userId: string, options: DiscoverListOptions = {}): Promise<DiscoverListResult> {
  const supabase = await createClient();
  const pool = await getCandidatePool(userId, supabase);
  if ("status" in pool) return pool;

  const scores = pool.scored.map((c) => c.score);
  const min = Math.min(...scores);
  const max = Math.max(...scores);

  let filtered = pool.scored;
  if (options.platform) {
    filtered = filtered.filter((c) => pool.platformsByTitleId.get(c.row.id)?.has(options.platform!));
  }
  if (options.genreId !== undefined) {
    filtered = filtered.filter((c) => c.row.genre_ids.includes(options.genreId!));
  }

  return {
    status: "ok",
    titles: filtered.slice(0, options.limit ?? DEFAULT_DISCOVER_LIMIT).map((c) => toRecommended(c, pool, min, max)),
    availablePlatforms: pool.allPlatforms,
    availableGenres: pool.allGenres,
    unrestricted: pool.unrestricted,
  };
}
