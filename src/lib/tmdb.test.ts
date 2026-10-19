import { afterEach, describe, expect, it, vi } from "vitest";
import { getTrailerKey, parseMediaType, pickTrailerKey, type TmdbVideo } from "./tmdb";

describe("parseMediaType", () => {
  it("reads 'tv' as tv", () => {
    expect(parseMediaType("tv")).toBe("tv");
  });

  it("defaults to movie for undefined, 'movie', or anything unrecognized", () => {
    expect(parseMediaType(undefined)).toBe("movie");
    expect(parseMediaType("movie")).toBe("movie");
    expect(parseMediaType("podcast")).toBe("movie");
  });
});

describe("pickTrailerKey", () => {
  const video = (key: string, overrides: Partial<TmdbVideo> = {}): TmdbVideo => ({
    key,
    site: "YouTube",
    type: "Trailer",
    official: true,
    iso_639_1: "en",
    ...overrides,
  });

  it("returns null when there's no YouTube trailer or teaser", () => {
    expect(pickTrailerKey([])).toBeNull();
    expect(pickTrailerKey([video("a", { site: "Vimeo" }), video("b", { type: "Featurette" })])).toBeNull();
  });

  it("prefers a trailer over a teaser, then official, then English", () => {
    expect(pickTrailerKey([video("teaser", { type: "Teaser" }), video("trailer", { official: false })])).toBe("trailer");
    expect(pickTrailerKey([video("fan", { official: false }), video("official", { iso_639_1: "es" })])).toBe("official");
    expect(pickTrailerKey([video("es", { iso_639_1: "es" }), video("en")])).toBe("en");
  });

  it("falls back to a teaser when there's no trailer", () => {
    expect(pickTrailerKey([video("teaser", { type: "Teaser" })])).toBe("teaser");
  });
});

describe("getTrailerKey", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("skips a trailer YouTube won't embed and uses the next best one", async () => {
    vi.stubEnv("TMDB_API_KEY", "test-key");
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.includes("/videos")) {
          return {
            ok: true,
            json: async () => ({
              results: [
                { key: "blocked", site: "YouTube", type: "Trailer", official: true, iso_639_1: "en" },
                { key: "teaser", site: "YouTube", type: "Teaser", official: true, iso_639_1: "en" },
              ],
            }),
          } as Response;
        }
        return { status: url.includes("blocked") ? 401 : 200 } as Response;
      })
    );

    expect(await getTrailerKey("movie", 1)).toBe("teaser");
  });

  it("returns null instead of throwing when TMDB fails", async () => {
    vi.stubEnv("TMDB_API_KEY", "test-key");
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 404 }) as Response));

    expect(await getTrailerKey("movie", 1)).toBeNull();
  });
});
