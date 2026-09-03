import { describe, expect, it } from "vitest";
import { checkRateLimit } from "./rate-limit";

describe("checkRateLimit", () => {
  it("allows requests up to the limit, then blocks the next one", () => {
    const key = `test-${Math.random()}`;
    for (let i = 0; i < 3; i++) {
      expect(checkRateLimit(key, 3, 60_000).allowed).toBe(true);
    }
    const blocked = checkRateLimit(key, 3, 60_000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("tracks separate keys independently", () => {
    const keyA = `test-a-${Math.random()}`;
    const keyB = `test-b-${Math.random()}`;
    expect(checkRateLimit(keyA, 1, 60_000).allowed).toBe(true);
    expect(checkRateLimit(keyA, 1, 60_000).allowed).toBe(false);
    // A different key has its own budget, unaffected by keyA's.
    expect(checkRateLimit(keyB, 1, 60_000).allowed).toBe(true);
  });

  it("resets once the window has passed", async () => {
    const key = `test-window-${Math.random()}`;
    expect(checkRateLimit(key, 1, 10).allowed).toBe(true);
    expect(checkRateLimit(key, 1, 10).allowed).toBe(false);
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(checkRateLimit(key, 1, 10).allowed).toBe(true);
  });
});
