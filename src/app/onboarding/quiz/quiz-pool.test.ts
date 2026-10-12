import { describe, expect, it } from "vitest";
import { pickVisible, withDismissed } from "./quiz-pool";

const pool = (n: number) => Array.from({ length: n }, (_, i) => ({ id: i + 1 }));
const ids = (titles: { id: number }[]) => titles.map((t) => t.id);

describe("pickVisible", () => {
  it("shows the first `count` titles when nothing is dismissed", () => {
    expect(ids(pickVisible(pool(20), new Set(), 9))).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it("backfills a dismissed slot with the next title, keeping the grid full", () => {
    expect(ids(pickVisible(pool(20), new Set([3]), 9))).toEqual([1, 2, 4, 5, 6, 7, 8, 9, 10]);
  });

  it("keeps the grid full after many dismissals, as long as the pool has titles left", () => {
    let dismissed = new Set<number>();
    for (let id = 1; id <= 15; id++) dismissed = withDismissed(dismissed, id);
    expect(pickVisible(pool(30), dismissed, 9)).toHaveLength(9);
  });

  it("cycles dismissed titles back in, oldest first, once fresh ones run low", () => {
    let dismissed = new Set<number>();
    for (const id of [1, 2, 3, 4, 5, 6, 7, 8]) dismissed = withDismissed(dismissed, id);
    expect(ids(pickVisible(pool(12), dismissed, 9))).toEqual([9, 10, 11, 12, 1, 2, 3, 4, 5]);
  });

  it("never runs dry even when every title has been dismissed", () => {
    let dismissed = new Set<number>();
    for (let id = 1; id <= 12; id++) dismissed = withDismissed(dismissed, id);
    expect(pickVisible(pool(12), dismissed, 9)).toHaveLength(9);
  });

  it("re-dismissing a recycled title sends it to the back of the queue", () => {
    let dismissed = new Set<number>();
    for (const id of [1, 2, 3]) dismissed = withDismissed(dismissed, id);
    dismissed = withDismissed(dismissed, 1);
    expect([...dismissed]).toEqual([2, 3, 1]);
  });

  it("ignores dismissed ids that have since been rated (no longer in the pool)", () => {
    const dismissed = new Set([99, 1]);
    expect(ids(pickVisible(pool(3), dismissed, 9))).toEqual([2, 3, 1]);
  });
});
