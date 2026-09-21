import { createClient } from "@/lib/supabase/server";

export type FeedbackStatus = "liked" | "disliked" | "skipped" | "watched";

// "watched" carries the same weight as "liked" — clicking Watch Now is a
// real behavioral commitment (stronger than an abstract Like, arguably),
// and it's now the only positive signal on Tonight's Pick since there's
// no separate Like button there anymore.
const GENRE_WEIGHT_DELTA: Partial<Record<FeedbackStatus, number>> = {
  liked: 1,
  disliked: -0.5,
  watched: 1,
};

// Without a ceiling, a genre someone rates a lot of just keeps growing
// forever and permanently dominates every other genre in scoring — a
// user who's liked 200 action titles ends up with action:200, dwarfing
// everything else, and the engine can never recover into recommending
// anything different. Clamping keeps relative preference intact (a
// strongly-preferred genre still clearly outranks a mildly-preferred
// one) without letting any single genre become unbeatable forever.
export const MAX_GENRE_WEIGHT = 10;

export function clampGenreWeight(weight: number): number {
  return Math.max(-MAX_GENRE_WEIGHT, Math.min(MAX_GENRE_WEIGHT, weight));
}

/**
 * Records a user's reaction to a title and, for liked/disliked/watched,
 * nudges their taste profile's genre weights. Only for use
 * post-onboarding — the onboarding quiz writes feedback directly and
 * computes the taste profile once in bulk at the end (see
 * src/app/onboarding/quiz/actions.ts), since a taste-profile row
 * existing is what marks onboarding as complete; creating one early
 * here would let a user skip the quiz's "Continue" step.
 *
 * Does the actual write via record_title_feedback (see migration 0007)
 * rather than a JS-side read-then-write — a plain "read genre_weights,
 * add delta, write it back" is a double-submit race: two near-
 * simultaneous reactions (a fast double-click, a retried request) could
 * each read the same pre-update weight and both add their delta,
 * double-counting one click. The SQL function does the whole thing
 * atomically, including only applying the delta when the status is
 * actually new or changed, so a genuine duplicate resubmission is a
 * no-op past the first one.
 *
 * No error-display UI of its own — called from submitPickFeedbackAction
 * and recordWatchedAction, neither of which have anywhere to show an
 * inline error. A failure throws instead of silently succeeding,
 * surfacing on the existing error boundary (src/app/error.tsx) with its
 * retry button, rather than leaving the UI showing a reaction that was
 * never actually recorded.
 */
export async function recordTitleFeedback(
  userId: string,
  titleId: number,
  status: FeedbackStatus,
  options: { watched?: boolean } = {}
) {
  const supabase = await createClient();

  const { data: title, error: titleError } = await supabase
    .from("titles")
    .select("genre_ids")
    .eq("id", titleId)
    .single();
  if (titleError || !title) throw new Error(`Failed to look up title ${titleId}: ${titleError?.message}`);

  const delta = GENRE_WEIGHT_DELTA[status] ?? 0;

  const { error } = await supabase.rpc("record_title_feedback", {
    p_user_id: userId,
    p_title_id: titleId,
    p_status: status,
    p_genre_ids: title.genre_ids as number[],
    p_delta: delta,
    p_max: MAX_GENRE_WEIGHT,
    p_watched_at: options.watched ? new Date().toISOString() : null,
  });
  if (error) throw new Error(`Failed to record feedback: ${error.message}`);
}

/**
 * Undoes a reaction — clears the feedback row and reverses whatever
 * genre-weight delta it applied, via undo_title_feedback (migration
 * 0008). A no-op if there was nothing to undo. Same atomicity rationale
 * as recordTitleFeedback: the lookup of what to reverse happens inside
 * the DB function under its advisory lock, not read here in JS first,
 * so there's no gap for a concurrent call to race with.
 */
export async function undoTitleFeedback(userId: string, titleId: number) {
  const supabase = await createClient();

  const { data: title, error: titleError } = await supabase
    .from("titles")
    .select("genre_ids")
    .eq("id", titleId)
    .single();
  if (titleError || !title) throw new Error(`Failed to look up title ${titleId}: ${titleError?.message}`);

  const { error } = await supabase.rpc("undo_title_feedback", {
    p_user_id: userId,
    p_title_id: titleId,
    p_genre_ids: title.genre_ids as number[],
    p_max: MAX_GENRE_WEIGHT,
  });
  if (error) throw new Error(`Failed to undo feedback: ${error.message}`);
}
