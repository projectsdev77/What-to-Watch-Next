import { submitPickFeedbackAction } from "@/app/actions";
import { addToDefaultWatchlistAction, addToListAction, removeFromAllWatchlistsAction } from "@/app/watchlist/actions";

interface ActionButtonProps {
  titleId: number;
  redirectTo: string;
  status: string;
  label: string;
  action?: (formData: FormData) => void | Promise<void>;
  className?: string;
}

function ActionButton({
  titleId,
  redirectTo,
  status,
  label,
  action = submitPickFeedbackAction,
  className,
}: ActionButtonProps) {
  return (
    <form action={action}>
      <input type="hidden" name="titleId" value={titleId} />
      <input type="hidden" name="status" value={status} />
      <input type="hidden" name="redirectTo" value={redirectTo} />
      <button type="submit" className={className}>
        {label}
      </button>
    </form>
  );
}

const PILL_ON_GLASS =
  "rounded-full border border-white/85 bg-white/55 px-[22px] py-[11px] text-[13px] font-semibold text-ink";
const PILL_ON_GLASS_COMPACT =
  "rounded-full border border-white/85 bg-white/55 px-3 py-1.5 text-xs font-semibold text-ink";

/** One-click save when there's nothing to choose between (already saved,
 * or the user has at most one list) — goes straight to the user's
 * default (first) list. When the user has more than one list, renders a
 * picker instead (see below) so "Watchlist" doesn't silently guess which
 * one they meant. */
export function WatchlistButton({
  titleId,
  redirectTo,
  isWatchlisted,
  lists = [],
  compact = false,
}: {
  titleId: number;
  redirectTo: string;
  isWatchlisted: boolean;
  // The user's named lists (id + name), for the picker below. Omit (or
  // pass 0-1) to keep the plain one-click button.
  lists?: { id: number; name: string }[];
  compact?: boolean;
}) {
  const cls = compact
    ? PILL_ON_GLASS_COMPACT
    : "rounded-full border border-white bg-white/70 px-[26px] py-[14px] text-[13px] font-bold tracking-[.1em] text-ink";

  if (isWatchlisted) {
    return (
      <form action={removeFromAllWatchlistsAction}>
        <input type="hidden" name="titleId" value={titleId} />
        <input type="hidden" name="redirectTo" value={redirectTo} />
        <button type="submit" className={cls}>
          {compact ? "🔖✓" : "ON WATCHLIST — REMOVE"}
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
          {compact ? "🔖" : "WATCHLIST"}
        </button>
      </form>
    );
  }

  // More than one list — a native <details> disclosure needs no client
  // JS, closes itself on the page navigation each pick already triggers,
  // and matches every other button here staying a plain server-rendered form.
  return (
    <details className="group relative">
      <summary
        className={
          cls + " cursor-pointer list-none [&::-webkit-details-marker]:hidden"
        }
      >
        {compact ? "🔖" : "WATCHLIST"}
      </summary>
      <div className="absolute top-[calc(100%+6px)] left-0 z-10 flex min-w-[190px] flex-col gap-1 bg-card p-2 shadow-panel">
        <span className="px-2 pt-1 pb-1.5 text-[11px] font-bold tracking-[.1em] text-text-3">ADD TO WHICH LIST?</span>
        {lists.map((list) => (
          <form key={list.id} action={addToListAction}>
            <input type="hidden" name="titleId" value={titleId} />
            <input type="hidden" name="watchlistId" value={list.id} />
            <input type="hidden" name="redirectTo" value={redirectTo} />
            <button
              type="submit"
              className="w-full px-2 py-2 text-left text-[13px] font-medium text-text-1 hover:bg-mist"
            >
              {list.name}
            </button>
          </form>
        ))}
      </div>
    </details>
  );
}

/** Don't like it / Another time — the two reaction buttons alongside
 * Watch Now (which now itself records "watched" — see WatchNowButton)
 * and Watchlist (handled separately by WatchlistButton, its own thing:
 * "save for later" isn't the same as "ask me again tomorrow"). */
export function FeedbackActions({
  titleId,
  redirectTo,
  compact = false,
}: {
  titleId: number;
  redirectTo: string;
  compact?: boolean;
}) {
  const cls = compact ? PILL_ON_GLASS_COMPACT : PILL_ON_GLASS;
  return (
    <div className={compact ? "flex flex-wrap gap-1.5" : "flex flex-wrap items-center gap-[9px]"}>
      <ActionButton
        titleId={titleId}
        redirectTo={redirectTo}
        status="disliked"
        label={compact ? "👎" : "Don't like it"}
        className={cls}
      />
      <ActionButton
        titleId={titleId}
        redirectTo={redirectTo}
        status="skipped"
        label={compact ? "🔁" : "Another time"}
        className={cls}
      />
    </div>
  );
}
