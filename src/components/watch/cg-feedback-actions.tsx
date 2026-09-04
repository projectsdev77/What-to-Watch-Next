import { submitPickFeedbackAction } from "@/app/actions";
import { addToDefaultWatchlistAction, addToListAction, removeFromAllWatchlistsAction } from "@/app/watchlist/actions";

/** Cinematic Glass versions of WatchlistButton and FeedbackActions —
 * same server actions and behavior (including the multi-list picker),
 * new look. Only used on the redesigned Tonight's Pick screen; title
 * detail keeps the originals. */
export function CgWatchlistButton({
  titleId,
  redirectTo,
  isWatchlisted,
  lists,
}: {
  titleId: number;
  redirectTo: string;
  isWatchlisted: boolean;
  lists: { id: number; name: string }[];
}) {
  const cls =
    "rounded-full border border-white/22 bg-white/11 px-[28px] py-[16px] text-[13.5px] font-semibold text-[var(--cg-text-1)]";

  if (isWatchlisted) {
    return (
      <form action={removeFromAllWatchlistsAction}>
        <input type="hidden" name="titleId" value={titleId} />
        <input type="hidden" name="redirectTo" value={redirectTo} />
        <button type="submit" className={cls}>
          ON WATCHLIST — REMOVE
        </button>
      </form>
    );
  }

  if (lists.length <= 1) {
    return (
      <form action={addToDefaultWatchlistAction}>
        <input type="hidden" name="titleId" value={titleId} />
        <input type="hidden" name="redirectTo" value={redirectTo} />
        <button type="submit" className={cls}>
          WATCHLIST
        </button>
      </form>
    );
  }

  return (
    <details className="relative">
      <summary className={cls + " cursor-pointer list-none [&::-webkit-details-marker]:hidden"}>WATCHLIST</summary>
      <div className="cg-pane absolute top-[calc(100%+6px)] left-0 z-10 flex max-h-[260px] min-w-[190px] flex-col gap-1 overflow-y-auto p-2">
        <span className="px-2 pt-1 pb-1.5 text-[11px] font-bold tracking-[.1em] text-[var(--cg-text-3)]">
          ADD TO WHICH LIST?
        </span>
        {lists.map((list) => (
          <form key={list.id} action={addToListAction}>
            <input type="hidden" name="titleId" value={titleId} />
            <input type="hidden" name="watchlistId" value={list.id} />
            <input type="hidden" name="redirectTo" value={redirectTo} />
            <button
              type="submit"
              className="w-full rounded-[var(--cg-r-input)] px-2 py-2 text-left text-[13px] font-medium text-[var(--cg-text-1)] hover:bg-white/8"
            >
              {list.name}
            </button>
          </form>
        ))}
      </div>
    </details>
  );
}

export function CgFeedbackActions({ titleId, redirectTo }: { titleId: number; redirectTo: string }) {
  const cls =
    "rounded-full border border-white/15 bg-white/7 px-[22px] py-[11px] text-[12.5px] text-[var(--cg-text-1)]";
  return (
    <div className="flex flex-wrap items-center gap-2">
      <form action={submitPickFeedbackAction}>
        <input type="hidden" name="titleId" value={titleId} />
        <input type="hidden" name="status" value="disliked" />
        <input type="hidden" name="redirectTo" value={redirectTo} />
        <button type="submit" className={cls}>
          Don&apos;t like it
        </button>
      </form>
      <form action={submitPickFeedbackAction}>
        <input type="hidden" name="titleId" value={titleId} />
        <input type="hidden" name="status" value="skipped" />
        <input type="hidden" name="redirectTo" value={redirectTo} />
        <button type="submit" className={cls}>
          Another time
        </button>
      </form>
    </div>
  );
}
