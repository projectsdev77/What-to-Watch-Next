"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { recordTitleFeedback, type FeedbackStatus } from "@/lib/taste-profile";
import { safeRedirectTarget } from "@/lib/redirect";

const VALID_STATUSES: FeedbackStatus[] = ["liked", "disliked", "skipped", "watched"];

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

  await recordTitleFeedback(user.id, titleId, "watched");
  revalidatePath(redirectTo);
}
