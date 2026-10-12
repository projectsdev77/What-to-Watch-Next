/**
 * Which titles the quiz grid shows: the first `count` not-yet-dismissed
 * titles from the pool, topped up with dismissed ones (oldest dismissal
 * first) once too few fresh titles remain, so the grid never runs dry.
 * `dismissedIds` must iterate in dismissal order, oldest first.
 */
export function pickVisible<T extends { id: number }>(
  titles: T[],
  dismissedIds: Set<number>,
  count: number
): T[] {
  const fresh = titles.filter((t) => !dismissedIds.has(t.id));
  if (fresh.length >= count) return fresh.slice(0, count);

  const byId = new Map(titles.map((t) => [t.id, t]));
  const recycled = [...dismissedIds].map((id) => byId.get(id)).filter((t): t is T => t !== undefined);
  return [...fresh, ...recycled].slice(0, count);
}

/** Records a dismissal, moving an already-dismissed (recycled) title to the back of the queue. */
export function withDismissed(dismissedIds: Set<number>, id: number): Set<number> {
  const next = new Set(dismissedIds);
  next.delete(id);
  next.add(id);
  return next;
}
