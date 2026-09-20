import { describe, expect, it } from "vitest";
import { platformDeepLink } from "./platform-links";
import { STREAMING_PLATFORMS, NO_PREFERENCE_PLATFORM } from "./platforms";

describe("platformDeepLink", () => {
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
      const url = platformDeepLink(platform, "Inception");
      expect(url).not.toBeNull();
      expect(url).toContain(domains[platform]);
    }
  });

  it("URL-encodes the title for a search deep link", () => {
    expect(platformDeepLink("Netflix", "Ferris Bueller's Day Off")).toContain(
      encodeURIComponent("Ferris Bueller's Day Off")
    );
  });

  it("falls back to the plain homepage for platforms without a confirmed search URL", () => {
    // Guessed search URLs risk landing on a hard 404 (confirmed live for
    // Disney+) rather than a graceful blank search page, so anything
    // not confirmed-working just links to the homepage instead.
    expect(platformDeepLink("Disney+", "Inception")).toBe("https://www.disneyplus.com/");
    expect(platformDeepLink("Hulu", "Inception")).toBe("https://www.hulu.com/");
    expect(platformDeepLink("Apple TV+", "Inception")).toBe("https://tv.apple.com/");
    expect(platformDeepLink("Max", "Inception")).toBe("https://www.hbomax.com/");
    expect(platformDeepLink("Peacock", "Inception")).toBe("https://www.peacocktv.com/");
    expect(platformDeepLink("Paramount+", "Inception")).toBe("https://www.paramountplus.com/");
  });

  it("returns null for the 'no preference' placeholder platform", () => {
    expect(platformDeepLink(NO_PREFERENCE_PLATFORM, "Inception")).toBeNull();
  });

  it("returns null for a platform with no known mapping", () => {
    expect(platformDeepLink("Tubi", "Inception")).toBeNull();
  });
});
