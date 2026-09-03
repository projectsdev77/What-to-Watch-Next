import { afterEach, describe, expect, it, vi } from "vitest";
import { chooseTonightsPick, type ShortlistTitle } from "./gemini";

const shortlist: ShortlistTitle[] = [
  { id: 1, title: "Movie One", mediaType: "movie", genres: ["Comedy"], overview: "A funny movie.", voteAverage: 7.2 },
  { id: 2, title: "Movie Two", mediaType: "movie", genres: ["Drama"], overview: "A sad movie.", voteAverage: 8.1 },
];

function mockGeminiResponse(body: { titleId?: string; why?: string }) {
  return {
    ok: true,
    json: async () => ({
      candidates: [{ content: { parts: [{ text: JSON.stringify(body) }] } }],
    }),
  } as Response;
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("chooseTonightsPick", () => {
  it("returns null and never calls the API when GEMINI_API_KEY is unset", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const result = await chooseTonightsPick(shortlist, { likedGenres: [], avoidGenres: [] });

    expect(result).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns null for an empty shortlist without calling the API", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const result = await chooseTonightsPick([], { likedGenres: [], avoidGenres: [] });

    expect(result).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns the model's pick when it names a real id from the shortlist", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(mockGeminiResponse({ titleId: "2", why: "It's a great sad movie." }))
    );

    const result = await chooseTonightsPick(shortlist, { likedGenres: ["Drama"], avoidGenres: [] });

    expect(result).toEqual({ titleId: 2, why: "It's a great sad movie." });
  });

  // The core grounding guarantee: even if Gemini's JSON is well-formed
  // and passes schema validation, a ungrounded id must never reach the
  // caller as a "real" pick — this is what stops the AI from ever
  // recommending a title that isn't actually in the shortlist it was given.
  it("rejects a response naming an id outside the shortlist", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(mockGeminiResponse({ titleId: "999", why: "Hallucinated pick." }))
    );

    const result = await chooseTonightsPick(shortlist, { likedGenres: [], avoidGenres: [] });

    expect(result).toBeNull();
  });

  it("returns null when the API responds with a non-ok status", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false } as Response));

    const result = await chooseTonightsPick(shortlist, { likedGenres: [], avoidGenres: [] });

    expect(result).toBeNull();
  });

  it("returns null on a network error instead of throwing", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    const result = await chooseTonightsPick(shortlist, { likedGenres: [], avoidGenres: [] });

    expect(result).toBeNull();
  });

  it("returns null when the model omits a why", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockGeminiResponse({ titleId: "1", why: "  " })));

    const result = await chooseTonightsPick(shortlist, { likedGenres: [], avoidGenres: [] });

    expect(result).toBeNull();
  });
});
