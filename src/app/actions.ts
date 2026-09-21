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
 * Records Watch Now as a real signal — called directly (not through a
 * <form>) from WatchNowButton's onClick, fired alongside the external
 * link opening in a new tab. Deliberately doesn't redirect(): the
 * current tab isn't navigating anywhere, the new tab is the actual
 * destination, so the caller just refreshes the current view once this
 * resolves.
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
 * "Watched it already" — for a title someone saw outside the app (or
 * before ever getting recommended it), rather than through Watch Now.
 * Unlike the blanket "watched = positive" assumption Watch Now makes,
 * this records a real opinion (liked/disliked), so it feeds the taste
 * profile accurately. Marking watched_at also makes a liked title
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
