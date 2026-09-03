"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { PlatformsFormState } from "@/components/settings/platform-picker-form";

export async function updatePlatformsAction(
  _prevState: PlatformsFormState | undefined,
  formData: FormData
): Promise<PlatformsFormState | undefined> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const platforms = formData.getAll("platforms").map(String);
  if (platforms.length === 0) {
    return { error: 'Pick at least one option — choose "Other" if none of these are yours.' };
  }

  await supabase.from("user_platforms").delete().eq("user_id", user.id);
  await supabase
    .from("user_platforms")
    .insert(platforms.map((platform_name) => ({ user_id: user.id, platform_name })));

  redirect("/settings");
}

/** Wipes all ratings/history and the derived taste profile, sending the user back through the taste quiz. */
export async function resetTasteProfileAction() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase.from("user_title_feedback").delete().eq("user_id", user.id);
  await supabase.from("user_taste_profile").delete().eq("user_id", user.id);

  redirect("/onboarding/quiz");
}
