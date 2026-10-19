import { describe, expect, it } from "vitest";
import { resolveAvailability } from "./availability";

const none = new Map<string, string | null>();

describe("resolveAvailability", () => {
  it("uses the lookup's platforms and links when it found any, dropping TMDB-only platforms", () => {
    const rows = resolveAvailability(["Netflix", "Hulu"], { Netflix: "https://netflix.com/title/1", Max: "https://hbomax.com/x" }, none);
    expect(rows).toEqual([
      { platform: "Netflix", deepLink: "https://netflix.com/title/1" },
      { platform: "Max", deepLink: "https://hbomax.com/x" },
    ]);
  });

  it("keeps TMDB's platforms, marked as checked, when the lookup found none of ours", () => {
    expect(resolveAvailability(["Netflix"], {}, none)).toEqual([{ platform: "Netflix", deepLink: "" }]);
  });

  it("uses TMDB's platforms with no link when there was no lookup and nothing stored", () => {
    expect(resolveAvailability(["Netflix"], null, none)).toEqual([{ platform: "Netflix", deepLink: null }]);
  });

  it("keeps a stored earlier lookup untouched when there's no lookup this time", () => {
    const stored = new Map<string, string | null>([["Max", "https://hbomax.com/x"]]);
    expect(resolveAvailability(["Netflix", "Hulu"], null, stored)).toEqual([{ platform: "Max", deepLink: "https://hbomax.com/x" }]);
  });

  it("keeps stored 'checked' markers for TMDB's platforms when no real link was ever found", () => {
    const stored = new Map<string, string | null>([["Netflix", ""]]);
    expect(resolveAvailability(["Netflix", "Hulu"], null, stored)).toEqual([
      { platform: "Netflix", deepLink: "" },
      { platform: "Hulu", deepLink: null },
    ]);
  });
});
