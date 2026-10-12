"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { recordTitleFeedback, undoTitleFeedback, type FeedbackStatus } from "@/lib/taste-profile";
import { safeRedirectTarget } from "@/lib/redirect";

const VALID_STATUSES: FeedbackStatus[] = ["liked", "disliked", "skipped", "watched"];
const WATCHED_ALREADY_STATUSES = ["liked", "disliked"] as const;

export async function submitPickFeedbackAction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const titleId = Number(formData.get("titleId"));
  const status = String(formData.get("status")) as FeedbackStatus;
  const redirectTo = safeRedirectTarget(formData);
  if (!titleId || !VALID_STATUSES.includes(status)) redirect(redirectTo);

  await recordTitleFeedback(user.id, titleId, status);

  revalidatePath(redirectTo);
  redirect(redirectTo);
}

/**
 * Marks a title "watched" when Watch Now is clicked — called directly
 * (not through a <form>) from WatchNowButton's onClick, alongside the
 * external link opening in a new tab. This is "opinion pending", not a
 * like: it carries no taste-profile weight, and Tonight's Pick shows a
 * "How was it?" check-in (CgWatchCheckIn) until the user answers.
 * Deliberately doesn't redirect(): the new tab is the destination, so
 * the caller just refreshes the current view, which brings up the
 * check-in.
 */
export async function recordWatchedAction(titleId: number, redirectTo: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !titleId) return;

  await recordTitleFeedback(user.id, titleId, "watched", { watched: true });
  revalidatePath(redirectTo);
}

/**
 * Records a real opinion (liked/disliked) on a title the user has seen —
 * from the "Watched it already" dropdown, and from the "How was it?"
 * check-in after Watch Now. Marking watched_at also makes a liked title
 * eligible to resurface later as a rewatch suggestion instead of being
 * excluded forever — see REWATCH_COOLDOWN_DAYS in recommendations.ts.
 */
export async function submitWatchedFeedbackAction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const titleId = Number(formData.get("titleId"));
  const status = String(formData.get("status"));
  const redirectTo = safeRedirectTarget(formData);
  if (!titleId || !WATCHED_ALREADY_STATUSES.includes(status as (typeof WATCHED_ALREADY_STATUSES)[number])) {
    redirect(redirectTo);
  }

  await recordTitleFeedback(user.id, titleId, status as FeedbackStatus, { watched: true });

  revalidatePath(redirectTo);
  redirect(redirectTo);
}

/**
 * "Haven't watched it" on the post-Watch Now check-in: clears the pending
 * "watched" mark so the title goes back to being a normal candidate (it
 * will usually come straight back as Tonight's Pick). A plain delete is
 * enough — a pending "watched" carries no taste-profile weight to reverse.
 * Only ever deletes a row still in the pending state, never a real opinion.
 */
export async function clearPendingWatchAction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const titleId = Number(formData.get("titleId"));
  const redirectTo = safeRedirectTarget(formData);
  if (!titleId) redirect(redirectTo);

  const { error } = await supabase
    .from("user_title_feedback")
    .delete()
    .eq("user_id", user.id)
    .eq("title_id", titleId)
    .eq("status", "watched");
  if (error) throw new Error(`Failed to clear pending watch: ${error.message}`);

  revalidatePath(redirectTo);
  redirect(redirectTo);
}

/** Clears a reaction — for a misclick, since liked/disliked/watched
 * used to be permanent with no way back. Surfaced on the title detail
 * page next to "Your status: X", the one place that already shows a
 * title's current feedback status. */
export async function undoFeedbackAction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const titleId = Number(formData.get("titleId"));
  const redirectTo = safeRedirectTarget(formData);
  if (!titleId) redirect(redirectTo);

  await undoTitleFeedback(user.id, titleId);

  revalidatePath(redirectTo);
  redirect(redirectTo);
}
