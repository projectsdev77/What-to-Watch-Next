import { describe, expect, it } from "vitest";
import { platformSearchUrl } from "./platform-links";
import { STREAMING_PLATFORMS, NO_PREFERENCE_PLATFORM } from "./platforms";

describe("platformSearchUrl", () => {
  it("returns a URL scoped to that platform's own domain for every real platform", () => {
    const domains: Record<string, string> = {
      Netflix: "netflix.com",
      Hulu: "hulu.com",
      "Disney+": "disneyplus.com",
      "Prime Video": "amazon.com",
      "Apple TV+": "tv.apple.com",
      Max: "hbomax.com",
      Peacock: "peacocktv.com",
      "Paramount+": "paramountplus.com",
    };
    for (const platform of STREAMING_PLATFORMS) {
      if (platform === NO_PREFERENCE_PLATFORM) continue;
      const url = platformSearchUrl(platform, "Inception");
      expect(url).not.toBeNull();
      expect(url).toContain(domains[platform]);
    }
  });

  it("URL-encodes the title", () => {
    expect(platformSearchUrl("Netflix", "Ferris Bueller's Day Off")).toContain(
      encodeURIComponent("Ferris Bueller's Day Off")
    );
  });

  it("returns null for the 'no preference' placeholder platform", () => {
    expect(platformSearchUrl(NO_PREFERENCE_PLATFORM, "Inception")).toBeNull();
  });

  it("returns null for a platform with no known mapping", () => {
    expect(platformSearchUrl("Tubi", "Inception")).toBeNull();
  });
});
