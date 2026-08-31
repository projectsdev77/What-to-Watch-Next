import { submitPickFeedbackAction, removeFeedbackAction } from "@/app/actions";

interface FeedbackActionsProps {
  titleId: number;
  redirectTo: string;
  isWatchlisted: boolean;
  /** Compact renders icon-only buttons for use inside a grid card; full renders labeled buttons for a hero/detail layout. */
  variant?: "full" | "compact";
}

function ActionButton({
  titleId,
  redirectTo,
  status,
  label,
  action = submitPickFeedbackAction,
}: {
  titleId: number;
  redirectTo: string;
  status: string;
  label: string;
  action?: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <form action={action}>
      <input type="hidden" name="titleId" value={titleId} />
      <input type="hidden" name="status" value={status} />
      <input type="hidden" name="redirectTo" value={redirectTo} />
      <button type="submit" className="rounded border border-black/10 px-3 py-1.5 text-sm dark:border-white/15">
        {label}
      </button>
    </form>
  );
}

export function FeedbackActions({ titleId, redirectTo, isWatchlisted, variant = "full" }: FeedbackActionsProps) {
  const compact = variant === "compact";
  return (
    <div className={compact ? "flex flex-wrap gap-1 text-xs" : "flex flex-wrap items-center gap-2"}>
      <ActionButton titleId={titleId} redirectTo={redirectTo} status="liked" label={compact ? "👍" : "👍 Like"} />
      {!compact && (
        <ActionButton titleId={titleId} redirectTo={redirectTo} status="disliked" label="👎 Dislike" />
      )}
      <ActionButton titleId={titleId} redirectTo={redirectTo} status="watched" label={compact ? "✅" : "✅ Watched"} />
      {isWatchlisted ? (
        <ActionButton
          titleId={titleId}
          redirectTo={redirectTo}
          status="watchlisted"
          label={compact ? "🔖✓" : "🔖 On watchlist — remove"}
          action={removeFeedbackAction}
        />
      ) : (
        <ActionButton
          titleId={titleId}
          redirectTo={redirectTo}
          status="watchlisted"
          label={compact ? "🔖" : "🔖 Watchlist"}
        />
      )}
      <ActionButton
        titleId={titleId}
        redirectTo={redirectTo}
        status="skipped"
        label={compact ? "🔁" : "🔁 Not tonight"}
      />
    </div>
  );
}
