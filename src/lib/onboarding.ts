import { createClient } from "@/lib/supabase/server";

export interface OnboardingStatus {
  hasPlatforms: boolean;
  hasTasteProfile: boolean;
}

export async function getOnboardingStatus(userId: string): Promise<OnboardingStatus> {
  const supabase = await createClient();

  const [{ count: platformCount }, { data: tasteProfile }] = await Promise.all([
    supabase
      .from("user_platforms")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase.from("user_taste_profile").select("user_id").eq("user_id", userId).maybeSingle(),
  ]);

  return {
    hasPlatforms: (platformCount ?? 0) > 0,
    hasTasteProfile: Boolean(tasteProfile),
  };
}
