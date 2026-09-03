"use server";

import type { PlatformsFormState } from "@/components/settings/platform-picker-form";
import { DELETE_CONFIRMATION_TEXT } from "@/lib/account";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export interface PasswordResetRequestState {
  variant: "error";
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

/** Sends a password reset email to the logged-in user's own address. */
export async function requestPasswordResetForLoggedInUserAction(
  _prevState: PasswordResetRequestState | undefined,
  _formData: FormData
): Promise<PasswordResetRequestState | undefined> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !user.email) redirect("/login");

  const origin = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
    redirectTo: `${origin}/reset-password`,
  });

  if (error) {
    console.error("Password reset error:", error.message);
    return { variant: "error", message: "Unable to send reset link. Please try again." };
  }

  // redirect() throws internally and must run outside try/catch — see
  // node_modules/next/dist/docs/.../redirect.md — so the success path
  // above must never be wrapped, or the navigation gets swallowed.
  redirect("/settings?passwordResetSent=true");
}

export interface DeleteAccountState {
  error: string;
}

/**
 * Permanently deletes the user's account. Every user-data table
 * (platforms, feedback, taste profile) references auth.users with
 * `on delete cascade` (see supabase/migrations/0001_init.sql) — so
 * deleting the auth user via the admin API is the one call that actually
 * removes everything, not the other way around. Requires typing a literal
 * confirmation string, checked here server-side since a Server Function
 * is reachable via direct POST, not just through the confirmation UI.
 */
export async function deleteAccountAction(
  _prevState: DeleteAccountState | undefined,
  formData: FormData
): Promise<DeleteAccountState | undefined> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const confirmation = String(formData.get("confirm") ?? "");
  if (confirmation !== DELETE_CONFIRMATION_TEXT) {
    return { error: `Type "${DELETE_CONFIRMATION_TEXT}" to confirm.` };
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    console.error("Account deletion failed:", error.message);
    return { error: "Something went wrong deleting your account. Please try again." };
  }

  await supabase.auth.signOut();
  redirect("/login?accountDeleted=true");
}
