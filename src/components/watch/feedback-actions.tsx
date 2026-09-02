import { submitPickFeedbackAction, removeFeedbackAction } from "@/app/actions";

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
  return isWatchlisted ? (
    <ActionButton
      titleId={titleId}
      redirectTo={redirectTo}
      status="watchlisted"
      action={removeFeedbackAction}
      label={compact ? "🔖✓" : "ON WATCHLIST — REMOVE"}
      className={
        compact
          ? PILL_ON_GLASS_COMPACT
          : "rounded-full border border-white bg-white/70 px-[26px] py-[14px] text-[13px] font-bold tracking-[.1em] text-ink"
      }
    />
  ) : (
    <ActionButton
      titleId={titleId}
      redirectTo={redirectTo}
      status="watchlisted"
      label={compact ? "🔖" : "WATCHLIST"}
      className={
        compact
          ? PILL_ON_GLASS_COMPACT
          : "rounded-full border border-white bg-white/70 px-[26px] py-[14px] text-[13px] font-bold tracking-[.1em] text-ink"
      }
    />
  );
}

/** Like / Dislike / Watched / Not tonight — the four secondary rating
 * actions. Watchlist is handled separately by WatchlistButton so it can
 * sit on the primary action row next to Watch Now, matching the mock. */
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
      <ActionButton titleId={titleId} redirectTo={redirectTo} status="liked" label={compact ? "👍" : "Like"} className={cls} />
      <ActionButton titleId={titleId} redirectTo={redirectTo} status="disliked" label={compact ? "👎" : "Dislike"} className={cls} />
      <ActionButton titleId={titleId} redirectTo={redirectTo} status="watched" label={compact ? "✅" : "Watched"} className={cls} />
      <ActionButton titleId={titleId} redirectTo={redirectTo} status="skipped" label={compact ? "🔁" : "Not tonight"} className={cls} />
    </div>
  );
}
