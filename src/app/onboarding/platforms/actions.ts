"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { PlatformsFormState } from "@/components/settings/platform-picker-form";

export async function savePlatformsAction(
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
    return { error: 'Pick at least one option to continue — choose "Other" if none of these are yours.' };
  }

  // Simplest correct way to sync a selection: clear and re-insert. Both
  // steps' errors are checked — Supabase-js resolves with { error }
  // rather than throwing, so an unchecked call here would otherwise
  // silently redirect as if the save succeeded even when it didn't.
  const { error: deleteError } = await supabase.from("user_platforms").delete().eq("user_id", user.id);
  if (deleteError) {
    console.error("Failed to clear existing platforms:", deleteError.message);
    return { error: "Something went wrong saving your platforms. Please try again." };
  }

  const { error: insertError } = await supabase
    .from("user_platforms")
    .insert(platforms.map((platform_name) => ({ user_id: user.id, platform_name })));
  if (insertError) {
    console.error("Failed to save platforms:", insertError.message);
    return { error: "Something went wrong saving your platforms. Please try again." };
  }

  redirect("/onboarding/quiz");
}
