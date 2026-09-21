import { submitPickFeedbackAction, submitWatchedFeedbackAction } from "@/app/actions";
import { addToDefaultWatchlistAction, addToListAction, removeFromAllWatchlistsAction } from "@/app/watchlist/actions";
import { CgSubmitButton } from "@/components/watch/cg-submit-button";

/** Cinematic Glass versions of WatchlistButton and FeedbackActions —
 * same server actions and behavior (including the multi-list picker),
 * new look. Only used on the redesigned Tonight's Pick screen; title
 * detail keeps the originals.
 *
 * Every submit button here uses CgSubmitButton so a press always shows
 * something happened — an instant tactile press effect plus a dimmed/
 * disabled state for the round-trip itself — rather than looking
 * static until the page happens to re-render. */
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
        <CgSubmitButton className={cls} pendingLabel="REMOVING…">
          ON WATCHLIST — REMOVE
        </CgSubmitButton>
      </form>
    );
  }

  if (lists.length <= 1) {
    return (
      <form action={addToDefaultWatchlistAction}>
        <input type="hidden" name="titleId" value={titleId} />
        <input type="hidden" name="redirectTo" value={redirectTo} />
        <CgSubmitButton className={cls} pendingLabel="ADDING…">
          WATCHLIST
        </CgSubmitButton>
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
            <CgSubmitButton
              className="w-full rounded-[var(--cg-r-input)] px-2 py-2 text-left text-[13px] font-medium text-[var(--cg-text-1)] hover:bg-white/8"
            >
              {list.name}
            </CgSubmitButton>
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
        <CgSubmitButton className={cls} pendingLabel="…">
          Don&apos;t like it
        </CgSubmitButton>
      </form>
      <form action={submitPickFeedbackAction}>
        <input type="hidden" name="titleId" value={titleId} />
        <input type="hidden" name="status" value="skipped" />
        <input type="hidden" name="redirectTo" value={redirectTo} />
        <CgSubmitButton className={cls} pendingLabel="…">
          Another time
        </CgSubmitButton>
      </form>
      <details className="relative">
        <summary className={cls + " cursor-pointer list-none [&::-webkit-details-marker]:hidden"}>
          Watched it already
        </summary>
        <div className="cg-pane absolute top-[calc(100%+6px)] left-0 z-10 flex min-w-[170px] flex-col gap-1 p-2">
          <span className="px-2 pt-1 pb-1.5 text-[11px] font-bold tracking-[.1em] text-[var(--cg-text-3)]">
            DID YOU LIKE IT?
          </span>
          <form action={submitWatchedFeedbackAction}>
            <input type="hidden" name="titleId" value={titleId} />
            <input type="hidden" name="status" value="liked" />
            <input type="hidden" name="redirectTo" value={redirectTo} />
            <CgSubmitButton
              className="w-full rounded-[var(--cg-r-input)] px-2 py-2 text-left text-[13px] font-medium text-[var(--cg-text-1)] hover:bg-white/8"
            >
              Liked it
            </CgSubmitButton>
          </form>
          <form action={submitWatchedFeedbackAction}>
            <input type="hidden" name="titleId" value={titleId} />
            <input type="hidden" name="status" value="disliked" />
            <input type="hidden" name="redirectTo" value={redirectTo} />
            <CgSubmitButton
              className="w-full rounded-[var(--cg-r-input)] px-2 py-2 text-left text-[13px] font-medium text-[var(--cg-text-1)] hover:bg-white/8"
            >
              Disliked it
            </CgSubmitButton>
          </form>
        </div>
      </details>
    </div>
  );
}
