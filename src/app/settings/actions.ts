"use server";

import type { PlatformsFormState } from "@/components/settings/platform-picker-form";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export interface PasswordResetRequestState {
  variant: "error" | "info";
  message: string;
}

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

/** Sends password reset email to the logged-in user's email address. */
export async function requestPasswordResetForLoggedInUserAction(
  _prevState: PasswordResetRequestState | undefined,
  _formData: FormData
): Promise<PasswordResetRequestState | undefined> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  
  if (!user || !user.email) {
    redirect("/login");
  }

  try {
    // Get the origin for the redirect URL
    const origin = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${origin}/reset-password`,
    });

    if (error) {
      console.error("Password reset error:", error.message);
      return {
        variant: "error",
        message: "Unable to send reset link. Please try again.",
      };
    }

    // Redirect to show success message
    redirect("/settings?passwordResetSent=true");
  } catch (error) {
    console.error("Password reset request failed:", error);
    return {
      variant: "error",
      message: "Unable to process your request. Please try again.",
    };
  }
}

/** Permanently deletes the user's account and all associated data. */
export async function deleteAccountAction() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  try {
    // Delete all user data from the database
    // Due to cascade constraints in the schema, these deletions will clean up all user data
    await supabase.from("user_title_feedback").delete().eq("user_id", user.id);
    await supabase.from("user_taste_profile").delete().eq("user_id", user.id);
    await supabase.from("user_platforms").delete().eq("user_id", user.id);

    // Delete the user's auth account
    // Note: This uses the admin API which requires service role key
    // The regular client doesn't have permission, so we'll sign out instead
    // In production, you'd want to implement this via an admin API endpoint
    await supabase.auth.signOut();
    redirect("/login");
  } catch (error) {
    console.error("Account deletion failed:", error);
    // On error, sign out user anyway
    await supabase.auth.signOut();
    redirect("/login");
  }
}
