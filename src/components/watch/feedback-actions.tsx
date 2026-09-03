import { submitPickFeedbackAction } from "@/app/actions";
import { addToDefaultWatchlistAction, removeFromAllWatchlistsAction } from "@/app/watchlist/actions";

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

/** Quick one-click save — goes to the user's default (first) list. For
 * managing multiple named lists, see the Watchlist page itself. */
export function WatchlistButton({
  titleId,
  redirectTo,
  isWatchlisted,
  compact = false,
}: {
  titleId: number;
  redirectTo: string;
  isWatchlisted: boolean;
  compact?: boolean;
}) {
  const cls = compact
    ? PILL_ON_GLASS_COMPACT
    : "rounded-full border border-white bg-white/70 px-[26px] py-[14px] text-[13px] font-bold tracking-[.1em] text-ink";
  const action = isWatchlisted ? removeFromAllWatchlistsAction : addToDefaultWatchlistAction;
  const label = isWatchlisted ? (compact ? "🔖✓" : "ON WATCHLIST — REMOVE") : compact ? "🔖" : "WATCHLIST";

  return (
    <form action={action}>
      <input type="hidden" name="titleId" value={titleId} />
      <input type="hidden" name="redirectTo" value={redirectTo} />
      <button type="submit" className={cls}>
        {label}
      </button>
    </form>
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
