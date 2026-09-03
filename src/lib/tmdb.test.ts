import { describe, expect, it } from "vitest";
import { parseMediaType } from "./tmdb";

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
