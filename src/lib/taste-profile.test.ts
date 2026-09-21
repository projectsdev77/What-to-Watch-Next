import { describe, expect, it } from "vitest";
import { clampGenreWeight, MAX_GENRE_WEIGHT } from "./taste-profile";

describe("clampGenreWeight", () => {
  it("leaves values within the range untouched", () => {
    expect(clampGenreWeight(0)).toBe(0);
    expect(clampGenreWeight(3.5)).toBe(3.5);
    expect(clampGenreWeight(-2)).toBe(-2);
  });

  it("caps a value that would exceed the max", () => {
    expect(clampGenreWeight(MAX_GENRE_WEIGHT + 50)).toBe(MAX_GENRE_WEIGHT);
  });

  it("caps a value that would go below the negative max", () => {
    expect(clampGenreWeight(-MAX_GENRE_WEIGHT - 50)).toBe(-MAX_GENRE_WEIGHT);
  });

  it("preserves relative ordering below the cap", () => {
    // A strongly-preferred genre should still clearly outrank a mildly
    // preferred one — clamping shouldn't flatten real differences.
    expect(clampGenreWeight(6)).toBeGreaterThan(clampGenreWeight(2));
  });
});
