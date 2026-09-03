"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PlatformsFormState } from "@/components/settings/platform-picker-form";
import { DELETE_CONFIRMATION_TEXT } from "@/lib/account";
import { checkRateLimit } from "@/lib/rate-limit";

// Shared key format with forgot-password/actions.ts — both ultimately
// email the same address, so they draw from one combined budget.
const RESET_EMAIL_LIMIT = 3;
const RESET_WINDOW_MS = 15 * 60 * 1000;

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

  // Both steps' errors are checked — Supabase-js resolves with { error }
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

  redirect("/settings");
}

/**
 * Wipes all ratings/history and the derived taste profile, sending the
 * user back through the taste quiz. Has no error-display UI of its own
 * (a plain form button, not a useActionState form) — a failure here
 * throws instead of silently redirecting as if it worked, surfacing on
 * the existing error boundary (src/app/error.tsx) with its retry button.
 */
export async function resetTasteProfileAction() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error: feedbackError } = await supabase.from("user_title_feedback").delete().eq("user_id", user.id);
  if (feedbackError) throw new Error(`Failed to clear feedback: ${feedbackError.message}`);

  const { error: profileError } = await supabase.from("user_taste_profile").delete().eq("user_id", user.id);
  if (profileError) throw new Error(`Failed to clear taste profile: ${profileError.message}`);

  redirect("/onboarding/quiz");
}

export interface PasswordResetRequestState {
  variant: "error";
  message: string;
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

  const { allowed, retryAfterSeconds } = checkRateLimit(
    `reset:email:${user.email.toLowerCase()}`,
    RESET_EMAIL_LIMIT,
    RESET_WINDOW_MS
  );
  if (!allowed) {
    const minutes = Math.max(1, Math.ceil(retryAfterSeconds / 60));
    return {
      variant: "error",
      message: `Too many reset requests. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`,
    };
  }

  const origin = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
    redirectTo: `${origin}/reset-password`,
  });

  if (error) {
    console.error("Password reset error:", error.message);
    return { variant: "error", message: "Unable to send reset link. Please try again." };
  }

  // redirect() throws internally and must run outside try/catch — see
  // node_modules/next/dist/docs's redirect.md — so the success path above
  // must never be wrapped, or the navigation gets swallowed.
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
