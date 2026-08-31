"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function savePlatformsAction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const platforms = formData.getAll("platforms").map(String);

  // Simplest correct way to sync a selection: clear and re-insert.
  await supabase.from("user_platforms").delete().eq("user_id", user.id);
  if (platforms.length > 0) {
    await supabase
      .from("user_platforms")
      .insert(platforms.map((platform_name) => ({ user_id: user.id, platform_name })));
  }

  redirect("/onboarding/quiz");
}
