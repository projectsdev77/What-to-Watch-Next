"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { recordTitleFeedback, type FeedbackStatus } from "@/lib/taste-profile";

const VALID_STATUSES: FeedbackStatus[] = ["liked", "disliked", "skipped", "watched", "watchlisted"];

// Server Functions are reachable via direct POST requests, not just
// through our own UI (see Next.js's mutating-data docs) — never trust
// a redirect target from form input without validating it's a local
// path, or this becomes an open redirect.
function safeRedirectTarget(formData: FormData): string {
  const target = String(formData.get("redirectTo") ?? "/");
  return target.startsWith("/") && !target.startsWith("//") ? target : "/";
}

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

/** Clears any feedback on a title (e.g. removing it from the watchlist), making it a fresh candidate again. */
export async function removeFeedbackAction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const titleId = Number(formData.get("titleId"));
  const redirectTo = safeRedirectTarget(formData);
  if (!titleId) redirect(redirectTo);

  await supabase.from("user_title_feedback").delete().eq("user_id", user.id).eq("title_id", titleId);

  revalidatePath(redirectTo);
  redirect(redirectTo);
}
