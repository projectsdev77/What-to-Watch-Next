"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Only real judgments go to the server. "Didn't Watch" has zero effect
// by design (stays eligible, no taste-profile change) — see
// quiz-batch.tsx, which handles it entirely client-side and never calls
// this action for it.
const RATEABLE_STATUSES = ["liked", "disliked"] as const;

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

  revalidatePath("/onboarding/quiz");
}

interface FeedbackWithGenres {
  status: string;
  titles: { genre_ids: number[] } | null;
}

export async function finishQuizAction() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: feedback } = await supabase
    .from("user_title_feedback")
    .select("status, titles(genre_ids)")
    .eq("user_id", user.id)
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
    { user_id: user.id, genre_weights: genreWeights, updated_at: new Date().toISOString() },
    { onConflict: "user_id" }
  );
  if (error) throw new Error(`Failed to save taste profile: ${error.message}`);

  redirect("/");
}
