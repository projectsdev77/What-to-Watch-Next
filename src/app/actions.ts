"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { recordTitleFeedback, type FeedbackStatus } from "@/lib/taste-profile";

const VALID_STATUSES: FeedbackStatus[] = ["liked", "disliked", "skipped", "watched"];

export async function submitPickFeedbackAction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const titleId = Number(formData.get("titleId"));
  const status = String(formData.get("status")) as FeedbackStatus;
  if (!titleId || !VALID_STATUSES.includes(status)) return;

  await recordTitleFeedback(user.id, titleId, status);

  revalidatePath("/");
  redirect("/");
}
