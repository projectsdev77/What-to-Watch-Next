"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { RATING_GOAL } from "./constants";

// Only real judgments go to the server. "Didn't Watch" has zero effect
// by design (stays eligible, no taste-profile change) — see
// quiz-batch.tsx, which handles it entirely client-side and never calls
// this action for it.
const RATEABLE_STATUSES = ["liked", "disliked"] as const;

interface FeedbackWithGenres {
  status: string;
  titles: { genre_ids: number[] } | null;
}

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

/** Builds the genre-weight taste profile from every liked/disliked rating
 * so far and saves it. Doesn't redirect itself — callers do that, since
 * redirect() must never run inside a try/catch (it works by throwing). */
async function saveTasteProfile(supabase: SupabaseClient, userId: string) {
  const { data: feedback } = await supabase
    .from("user_title_feedback")
    .select("status, titles(genre_ids)")
    .eq("user_id", userId)
    .in("status", ["liked", "disliked"]);

  const rows = (feedback ?? []) as unknown as FeedbackWithGenres[];

  // Simple v1 taste signal: +1 per genre on a liked title, -0.5 on a
  // disliked one. Phase 3 will use this (plus cast/keyword weights)
  // to score recommendations.
  const genreWeights: Record<string, number> = {};
  for (const row of rows) {
    const delta = row.status === "liked" ? 1 : -0.5;
    for (const genreId of row.titles?.genre_ids ?? []) {
      genreWeights[genreId] = (genreWeights[genreId] ?? 0) + delta;
    }
  }

  // Critical: a user_taste_profile row existing is what marks onboarding
  // as complete (see src/lib/onboarding.ts). An unchecked failure here
  // would redirect to "/" anyway, which would then bounce right back to
  // /onboarding/quiz with no explanation — instead throw, surfacing on
  // the existing error boundary (src/app/error.tsx) with its retry
  // button.
  const { error } = await supabase.from("user_taste_profile").upsert(
    { user_id: userId, genre_weights: genreWeights, updated_at: new Date().toISOString() },
    { onConflict: "user_id" }
  );
  if (error) throw new Error(`Failed to save taste profile: ${error.message}`);
}

export async function rateTitleAction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const titleId = Number(formData.get("titleId"));
  const status = String(formData.get("status"));
  if (!titleId || !RATEABLE_STATUSES.includes(status as (typeof RATEABLE_STATUSES)[number])) {
    return;
  }

  const { error } = await supabase.from("user_title_feedback").upsert(
    { user_id: user.id, title_id: titleId, status, updated_at: new Date().toISOString() },
    { onConflict: "user_id,title_id" }
  );
  if (error) throw new Error(`Failed to record quiz rating: ${error.message}`);

  // Once there's enough signal, skip straight to recommendations instead
  // of making the user keep rating or hunt for a "continue" button —
  // this is the primary way the quiz ends now.
  const { count } = await supabase
    .from("user_title_feedback")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .in("status", ["liked", "disliked"]);

  if ((count ?? 0) >= RATING_GOAL) {
    await saveTasteProfile(supabase, user.id);
    redirect("/");
  }

  revalidatePath("/onboarding/quiz");
}

/** Manual escape hatch for someone who doesn't recognize enough titles
 * to reach RATING_GOAL — finishes onboarding early with whatever real
 * ratings exist so far (possibly zero, which recommendations.ts already
 * handles as a cold start ranked by popularity). */
export async function finishQuizAction() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await saveTasteProfile(supabase, user.id);
  redirect("/");
}
