import { describe, expect, it } from "vitest";
import { normalizeProviderName } from "./platforms";

describe("normalizeProviderName", () => {
  it("maps real TMDB provider-name variants to the canonical label", () => {
    expect(normalizeProviderName("Netflix")).toBe("Netflix");
    expect(normalizeProviderName("Hulu")).toBe("Hulu");
    expect(normalizeProviderName("Disney Plus")).toBe("Disney+");
    expect(normalizeProviderName("Amazon Prime Video")).toBe("Prime Video");
    expect(normalizeProviderName("Apple TV Plus")).toBe("Apple TV+");
    expect(normalizeProviderName("Peacock Premium")).toBe("Peacock");
    expect(normalizeProviderName("Paramount Plus")).toBe("Paramount+");
    expect(normalizeProviderName("HBO Max")).toBe("Max");
    expect(normalizeProviderName("Max")).toBe("Max");
  });

  it("is case-insensitive and trims whitespace", () => {
    expect(normalizeProviderName("  NETFLIX  ")).toBe("Netflix");
    expect(normalizeProviderName("hulu")).toBe("Hulu");
  });

  it("does not false-positive Cinemax as Max", () => {
    // "Cinemax" contains "max" as a substring — the exact-match /
    // startsWith guard exists specifically to avoid this.
    expect(normalizeProviderName("Cinemax")).toBeNull();
    expect(normalizeProviderName("Cinemax Amazon Channel")).toBeNull();
  });

  it("returns null for providers not in the onboarding list", () => {
    expect(normalizeProviderName("Tubi")).toBeNull();
    expect(normalizeProviderName("Pluto TV")).toBeNull();
    expect(normalizeProviderName("")).toBeNull();
  });
});
