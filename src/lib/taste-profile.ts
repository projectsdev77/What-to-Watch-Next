import { createClient } from "@/lib/supabase/server";

export type FeedbackStatus = "liked" | "disliked" | "skipped" | "watched" | "watchlisted";

// "watched" carries the same weight as "liked" — clicking Watch Now is a
// real behavioral commitment (stronger than an abstract Like, arguably),
// and it's now the only positive signal on Tonight's Pick since there's
// no separate Like button there anymore.
const GENRE_WEIGHT_DELTA: Partial<Record<FeedbackStatus, number>> = {
  liked: 1,
  disliked: -0.5,
  watched: 1,
};

/**
 * Records a user's reaction to a title and, for liked/disliked/watched,
 * nudges their taste profile's genre weights incrementally. Only for use
 * post-onboarding — the onboarding quiz writes feedback directly and
 * computes the taste profile once in bulk at the end (see
 * src/app/onboarding/quiz/actions.ts), since a taste-profile row
 * existing is what marks onboarding as complete; creating one early
 * here would let a user skip the quiz's "Continue" step.
 *
 * No error-display UI of its own — called from submitPickFeedbackAction
 * and recordWatchedAction, neither of which have anywhere to show an
 * inline error. A failure throws instead of silently succeeding,
 * surfacing on the existing error boundary (src/app/error.tsx) with its
 * retry button, rather than leaving the UI showing a reaction that was
 * never actually recorded.
 */
export async function recordTitleFeedback(userId: string, titleId: number, status: FeedbackStatus) {
  const supabase = await createClient();

  const { error: feedbackError } = await supabase
    .from("user_title_feedback")
    .upsert(
      { user_id: userId, title_id: titleId, status, updated_at: new Date().toISOString() },
      { onConflict: "user_id,title_id" }
    );
  if (feedbackError) throw new Error(`Failed to record feedback: ${feedbackError.message}`);

  const delta = GENRE_WEIGHT_DELTA[status];
  if (!delta) return;

  const [{ data: title }, { data: profile }] = await Promise.all([
    supabase.from("titles").select("genre_ids").eq("id", titleId).single(),
    supabase.from("user_taste_profile").select("genre_weights").eq("user_id", userId).maybeSingle(),
  ]);
  if (!title) return;

  const weights: Record<string, number> = { ...(profile?.genre_weights as Record<string, number>) };
  for (const genreId of title.genre_ids as number[]) {
    weights[genreId] = (weights[genreId] ?? 0) + delta;
  }

  const { error: profileError } = await supabase
    .from("user_taste_profile")
    .upsert(
      { user_id: userId, genre_weights: weights, updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    );
  if (profileError) throw new Error(`Failed to update taste profile: ${profileError.message}`);
}
