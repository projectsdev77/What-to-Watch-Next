import { beforeEach, describe, expect, it, vi } from "vitest";
import { createClient } from "@/lib/supabase/server";
import { getDiscoverList, getTonightsPick } from "./recommendations";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

interface TitleFixture {
  id: number;
  tmdb_id: number;
  media_type: "movie" | "tv";
  title: string;
  overview: string | null;
  poster_path: string | null;
  genre_ids: number[];
  vote_average: number | null;
  justwatch_link: string | null;
}

function title(
  id: number,
  genreIds: number[],
  voteAverage: number,
  name = `Title ${id}`,
  mediaType: "movie" | "tv" = "movie"
): TitleFixture {
  return {
    id,
    tmdb_id: id,
    media_type: mediaType,
    title: name,
    overview: null,
    poster_path: null,
    genre_ids: genreIds,
    vote_average: voteAverage,
    justwatch_link: null,
  };
}

interface FeedbackFixture {
  title_id: number;
  status: "liked" | "disliked" | "skipped" | "watched";
  updated_at: string;
  titles?: { title: string; genre_ids: number[] } | null;
}

/** A minimal fake matching just the query shapes recommendations.ts
 * actually calls — chainable select/eq/in, thenable at any point (like
 * the real Supabase query builder), with the one branch (titles' select
 * for the exact-count check vs the by-id select) that needs to behave
 * differently based on its arguments. */
function makeFakeSupabase(fixtures: {
  userPlatforms?: string[];
  genreWeights?: Record<string, number> | null;
  feedback?: FeedbackFixture[];
  watchlisted?: number[];
  availability?: { title_id: number; platform_name: string }[];
  candidateTitles?: TitleFixture[];
  titlesTotalCount?: number;
}) {
  function chain(resolveTo: () => unknown) {
    const node: Record<string, unknown> = {
      select: () => node,
      eq: () => node,
      in: () => node,
      maybeSingle: () => Promise.resolve(resolveTo()),
      then: (onFulfilled: (v: unknown) => unknown, onRejected?: (e: unknown) => unknown) =>
        Promise.resolve(resolveTo()).then(onFulfilled, onRejected),
    };
    return node;
  }

  return {
    from(tableName: string) {
      if (tableName === "user_platforms") {
        return chain(() => ({ data: (fixtures.userPlatforms ?? []).map((platform_name) => ({ platform_name })) }));
      }
      if (tableName === "user_taste_profile") {
        return chain(() => ({
          data:
            fixtures.genreWeights != null ? { genre_weights: fixtures.genreWeights } : null,
        }));
      }
      if (tableName === "user_title_feedback") {
        return chain(() => ({ data: fixtures.feedback ?? [] }));
      }
      if (tableName === "watchlist_items") {
        return chain(() => ({ data: (fixtures.watchlisted ?? []).map((title_id) => ({ title_id })) }));
      }
      if (tableName === "title_availability") {
        return chain(() => ({ data: fixtures.availability ?? [] }));
      }
      if (tableName === "titles") {
        let wantsCountOnly = false;
        let filterIds: number[] | null = null;
        let filterMediaType: string | null = null;
        const node: Record<string, unknown> = {
          select: (_cols: string, opts?: { head?: boolean }) => {
            wantsCountOnly = !!opts?.head;
            return node;
          },
          // Real code only calls .eq("media_type", ...) on this branch
          // (the exact-count query never filters), so it's unambiguous.
          eq: (col: string, value: string) => {
            if (col === "media_type") filterMediaType = value;
            return node;
          },
          // The real query does .in("id", candidateIds) to fetch only
          // the still-eligible titles — a fake that ignored this and
          // always returned every candidateTitle would silently hide
          // any bug (or test bug) in the exclusion logic upstream.
          in: (_col: string, ids: number[]) => {
            filterIds = ids;
            return node;
          },
          maybeSingle: () => Promise.resolve({ data: null }),
          then: (onFulfilled: (v: unknown) => unknown, onRejected?: (e: unknown) => unknown) => {
            const result = wantsCountOnly
              ? { count: fixtures.titlesTotalCount ?? fixtures.candidateTitles?.length ?? 0 }
              : {
                  data: (fixtures.candidateTitles ?? [])
                    .filter((t) => !filterIds || filterIds!.includes(t.id))
                    .filter((t) => !filterMediaType || t.media_type === filterMediaType),
                };
            return Promise.resolve(result).then(onFulfilled, onRejected);
          },
        };
        return node;
      }
      throw new Error(`Unmocked table in test fixture: ${tableName}`);
    },
  };
}

function mockSupabaseFor(fixtures: Parameters<typeof makeFakeSupabase>[0]) {
  vi.mocked(createClient).mockResolvedValue(
    makeFakeSupabase(fixtures) as unknown as Awaited<ReturnType<typeof createClient>>
  );
}

beforeEach(() => {
  vi.mocked(createClient).mockReset();
});

describe("getTonightsPick / getDiscoverList — status short-circuits", () => {
  it("returns no-platforms when the user hasn't picked any", async () => {
    mockSupabaseFor({ userPlatforms: [] });
    expect(await getTonightsPick("u1")).toEqual({ status: "no-platforms" });
  });

  it("returns empty-catalog when the titles table has nothing seeded", async () => {
    mockSupabaseFor({ userPlatforms: ["Netflix"], titlesTotalCount: 0 });
    expect(await getTonightsPick("u1")).toEqual({ status: "empty-catalog" });
  });

  it("returns nothing-available when no titles are on the user's platforms", async () => {
    mockSupabaseFor({ userPlatforms: ["Netflix"], titlesTotalCount: 5, availability: [] });
    expect(await getTonightsPick("u1")).toEqual({ status: "nothing-available" });
  });

  it("returns all-rated when every available title has already been judged", async () => {
    mockSupabaseFor({
      userPlatforms: ["Netflix"],
      titlesTotalCount: 1,
      availability: [{ title_id: 1, platform_name: "Netflix" }],
      feedback: [{ title_id: 1, status: "liked", updated_at: new Date().toISOString() }],
    });
    expect(await getTonightsPick("u1")).toEqual({ status: "all-rated" });
  });

  it("falls back to resurfacing a recently-skipped title rather than dead-ending", async () => {
    // Every available title was skipped ("Another time") within the
    // cooldown window — honoring that strictly would empty the pool.
    // Should fall back to showing one of them rather than reporting
    // "all-rated" when nothing was actually permanently judged.
    const titles = [title(1, [28], 7.0), title(2, [18], 6.0)];
    mockSupabaseFor({
      userPlatforms: ["Netflix"],
      titlesTotalCount: titles.length,
      availability: titles.map((t) => ({ title_id: t.id, platform_name: "Netflix" })),
      candidateTitles: titles,
      feedback: titles.map((t) => ({
        title_id: t.id,
        status: "skipped" as const,
        updated_at: new Date().toISOString(),
      })),
    });

    const result = await getTonightsPick("u1");
    expect(result.status).toBe("ok");
  });

  it("still permanently excludes disliked titles even when the skip fallback kicks in", async () => {
    const titles = [title(1, [28], 7.0), title(2, [18], 6.0)];
    mockSupabaseFor({
      userPlatforms: ["Netflix"],
      titlesTotalCount: titles.length,
      availability: titles.map((t) => ({ title_id: t.id, platform_name: "Netflix" })),
      candidateTitles: titles,
      feedback: [
        { title_id: 1, status: "disliked", updated_at: new Date().toISOString() },
        { title_id: 2, status: "skipped", updated_at: new Date().toISOString() },
      ],
    });

    const result = await getTonightsPick("u1");
    if (result.status !== "ok") throw new Error(`expected ok, got ${result.status}`);
    expect(result.pick.id).toBe(2); // the disliked title (1) must never resurface
  });
});

describe("getTonightsPick — scoring", () => {
  it("falls back to popularity ranking when there's no taste signal yet", async () => {
    const titles = [title(1, [28], 9.0), title(2, [18], 8.0), title(3, [28], 5.0), title(4, [35], 1.0)];
    mockSupabaseFor({
      userPlatforms: ["Netflix"],
      titlesTotalCount: titles.length,
      availability: titles.map((t) => ({ title_id: t.id, platform_name: "Netflix" })),
      candidateTitles: titles,
      genreWeights: {}, // no signal
    });

    const result = await getTonightsPick("u1");
    if (result.status !== "ok") throw new Error(`expected ok, got ${result.status}`);
    expect(result.pick.id).toBe(1); // highest vote_average
    expect(result.pick.why).toMatch(/popular/i);
  });

  it("doesn't silently drop the best match when the catalog is larger than MAX_CANDIDATES", async () => {
    // Regression test: candidateIds used to get sliced to MAX_CANDIDATES
    // (1000) BEFORE scoring, on whatever order the availability rows
    // happened to come back in — so a genuinely best-scoring title could
    // get cut before it was ever considered, just for sorting last in
    // that raw list. Here the best title (by far, once genre-weighted)
    // is placed LAST among 1000+ candidates; it must still win.
    // Fillers carry a genre with no taste signal (score 0); the best
    // match carries the one genre the user has positive signal for
    // (score 1) — a real, unambiguous highest score, not a tiebreak.
    const filler = Array.from({ length: 1200 }, (_, i) => title(i + 1, [2], 5.0));
    const best = title(9999, [1], 5.0, "Best Match");
    const allTitles = [...filler, best];

    mockSupabaseFor({
      userPlatforms: ["Netflix"],
      titlesTotalCount: allTitles.length,
      // `best` is intentionally last in the availability rows, so under
      // the old pre-scoring slice it would've been candidate #1201 and
      // dropped before scoring ever ran.
      availability: allTitles.map((t) => ({ title_id: t.id, platform_name: "Netflix" })),
      candidateTitles: allTitles,
      genreWeights: { "1": 1 },
    });

    const result = await getTonightsPick("u1");
    if (result.status !== "ok") throw new Error(`expected ok, got ${result.status}`);
    expect(result.pick.title).toBe("Best Match");
  });

  it("ranks a title matching the user's weighted genre preference first", async () => {
    const titles = [
      title(1, [28], 7.0), // Action
      title(2, [18], 9.0), // Drama — highest popularity, but not preferred
      title(3, [35], 4.0), // Comedy
    ];
    mockSupabaseFor({
      userPlatforms: ["Netflix"],
      titlesTotalCount: titles.length,
      availability: titles.map((t) => ({ title_id: t.id, platform_name: "Netflix" })),
      candidateTitles: titles,
      genreWeights: { "28": 5 }, // strongly prefers Action (genre 28)
    });

    const result = await getTonightsPick("u1");
    if (result.status !== "ok") throw new Error(`expected ok, got ${result.status}`);
    expect(result.pick.id).toBe(1);
    expect(result.pick.why).not.toMatch(/popular/i);
  });

  it("gives a watchlisted title enough of a bonus to outrank a higher-rated non-watchlisted one", async () => {
    const titles = [title(1, [28], 8.0), title(2, [28], 9.0)]; // #2 has the higher raw popularity
    mockSupabaseFor({
      userPlatforms: ["Netflix"],
      titlesTotalCount: titles.length,
      availability: titles.map((t) => ({ title_id: t.id, platform_name: "Netflix" })),
      candidateTitles: titles,
      genreWeights: {},
      watchlisted: [1],
    });

    const result = await getTonightsPick("u1");
    if (result.status !== "ok") throw new Error(`expected ok, got ${result.status}`);
    expect(result.pick.id).toBe(1);
    expect(result.pick.isWatchlisted).toBe(true);
  });

  it("avoids picking the same genre as the most recently disliked title, when a real alternative exists", async () => {
    const titles = [
      title(2, [28], 8.0, "Action B"), // same genre as the dislike, would otherwise be the top pick
      title(3, [18], 7.0, "Drama C"), // different genre, lower raw score
    ];
    mockSupabaseFor({
      userPlatforms: ["Netflix"],
      titlesTotalCount: titles.length,
      availability: titles.map((t) => ({ title_id: t.id, platform_name: "Netflix" })),
      candidateTitles: titles,
      genreWeights: {},
      feedback: [
        {
          title_id: 99,
          status: "disliked",
          updated_at: new Date().toISOString(),
          titles: { title: "Disliked Action Show", genre_ids: [28] },
        },
      ],
    });

    const result = await getTonightsPick("u1");
    if (result.status !== "ok") throw new Error(`expected ok, got ${result.status}`);
    expect(result.pick.id).toBe(3);
  });

  it("still picks the best option when literally everything shares the disliked genre", async () => {
    const titles = [title(2, [28], 8.0), title(3, [28], 5.0)]; // both Action, no escaping it
    mockSupabaseFor({
      userPlatforms: ["Netflix"],
      titlesTotalCount: titles.length,
      availability: titles.map((t) => ({ title_id: t.id, platform_name: "Netflix" })),
      candidateTitles: titles,
      genreWeights: {},
      feedback: [
        {
          title_id: 99,
          status: "disliked",
          updated_at: new Date().toISOString(),
          titles: { title: "Disliked Action Show", genre_ids: [28] },
        },
      ],
    });

    const result = await getTonightsPick("u1");
    if (result.status !== "ok") throw new Error(`expected ok, got ${result.status}`);
    expect(result.pick.id).toBe(2); // still the higher-scored of the two, penalty or not
  });
});

describe("getTonightsPick / getDiscoverList — media type split", () => {
  it("getTonightsPick only picks from the requested media type, even when the other type scores higher", async () => {
    const titles = [
      title(1, [28], 9.0, "Top Movie", "movie"),
      title(2, [28], 5.0, "Lower TV Show", "tv"),
    ];
    mockSupabaseFor({
      userPlatforms: ["Netflix"],
      titlesTotalCount: titles.length,
      availability: titles.map((t) => ({ title_id: t.id, platform_name: "Netflix" })),
      candidateTitles: titles,
      genreWeights: {},
    });

    const result = await getTonightsPick("u1", "tv");
    if (result.status !== "ok") throw new Error(`expected ok, got ${result.status}`);
    expect(result.pick.id).toBe(2);
    expect(result.pick.mediaType).toBe("tv");
  });

  it("getTonightsPick reports all-rated when the requested type has nothing eligible, even if the other type does", async () => {
    const titles = [title(1, [28], 9.0, "Only Movie", "movie")];
    mockSupabaseFor({
      userPlatforms: ["Netflix"],
      titlesTotalCount: titles.length,
      availability: titles.map((t) => ({ title_id: t.id, platform_name: "Netflix" })),
      candidateTitles: titles,
      genreWeights: {},
    });

    expect(await getTonightsPick("u1", "tv")).toEqual({ status: "all-rated" });
  });

  it("getDiscoverList only returns the requested media type", async () => {
    const titles = [
      title(1, [28], 9.0, "A Movie", "movie"),
      title(2, [28], 8.0, "A Show", "tv"),
    ];
    mockSupabaseFor({
      userPlatforms: ["Netflix"],
      titlesTotalCount: titles.length,
      availability: titles.map((t) => ({ title_id: t.id, platform_name: "Netflix" })),
      candidateTitles: titles,
      genreWeights: {},
    });

    const result = await getDiscoverList("u1", { mediaType: "movie" });
    if (result.status !== "ok") throw new Error(`expected ok, got ${result.status}`);
    expect(result.titles.map((t) => t.id)).toEqual([1]);
  });
});

describe("getDiscoverList — feedback exclusion rules", () => {
  const HOUR = 60 * 60 * 1000;

  it("excludes a skip from the last 24h, but not one from over 24h ago", async () => {
    const titles = [title(10, [28], 5.0, "Skipped recently"), title(11, [28], 5.0, "Skipped a while ago")];
    mockSupabaseFor({
      userPlatforms: ["Netflix"],
      titlesTotalCount: titles.length,
      availability: titles.map((t) => ({ title_id: t.id, platform_name: "Netflix" })),
      candidateTitles: titles,
      genreWeights: {},
      feedback: [
        { title_id: 10, status: "skipped", updated_at: new Date(Date.now() - 1 * HOUR).toISOString() },
        { title_id: 11, status: "skipped", updated_at: new Date(Date.now() - 30 * HOUR).toISOString() },
      ],
    });

    const result = await getDiscoverList("u1");
    if (result.status !== "ok") throw new Error(`expected ok, got ${result.status}`);
    expect(result.titles.map((t) => t.id)).toEqual([11]);
  });

  it("permanently excludes liked/disliked/watched regardless of how recent", async () => {
    const titles = [
      title(20, [28], 5.0, "Liked"),
      title(21, [28], 5.0, "Disliked"),
      title(22, [28], 5.0, "Watched"),
      title(23, [28], 5.0, "Untouched"),
    ];
    const justNow = new Date().toISOString();
    mockSupabaseFor({
      userPlatforms: ["Netflix"],
      titlesTotalCount: titles.length,
      availability: titles.map((t) => ({ title_id: t.id, platform_name: "Netflix" })),
      candidateTitles: titles,
      genreWeights: {},
      feedback: [
        { title_id: 20, status: "liked", updated_at: justNow },
        { title_id: 21, status: "disliked", updated_at: justNow },
        { title_id: 22, status: "watched", updated_at: justNow },
      ],
    });

    const result = await getDiscoverList("u1");
    if (result.status !== "ok") throw new Error(`expected ok, got ${result.status}`);
    expect(result.titles.map((t) => t.id)).toEqual([23]);
  });
});

describe("getDiscoverList — unrestricted mode", () => {
  it("is unrestricted when the user only picked Other", async () => {
    const titles = [title(1, [28], 5.0)];
    mockSupabaseFor({
      userPlatforms: ["Other"],
      titlesTotalCount: titles.length,
      availability: [{ title_id: 1, platform_name: "Netflix" }],
      candidateTitles: titles,
      genreWeights: {},
    });

    const result = await getDiscoverList("u1");
    if (result.status !== "ok") throw new Error(`expected ok, got ${result.status}`);
    expect(result.unrestricted).toBe(true);
  });

  it("is not unrestricted when the user picked a real platform", async () => {
    const titles = [title(1, [28], 5.0)];
    mockSupabaseFor({
      userPlatforms: ["Netflix"],
      titlesTotalCount: titles.length,
      availability: [{ title_id: 1, platform_name: "Netflix" }],
      candidateTitles: titles,
      genreWeights: {},
    });

    const result = await getDiscoverList("u1");
    if (result.status !== "ok") throw new Error(`expected ok, got ${result.status}`);
    expect(result.unrestricted).toBe(false);
  });

  it("still counts as unrestricted alongside real platforms if Other is also picked with nothing else real", async () => {
    const titles = [title(1, [28], 5.0)];
    mockSupabaseFor({
      userPlatforms: ["Other"],
      titlesTotalCount: titles.length,
      availability: [{ title_id: 1, platform_name: "Hulu" }],
      candidateTitles: titles,
      genreWeights: {},
    });

    const result = await getDiscoverList("u1");
    if (result.status !== "ok") throw new Error(`expected ok, got ${result.status}`);
    expect(result.unrestricted).toBe(true);
  });
});
