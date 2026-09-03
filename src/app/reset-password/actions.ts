"use server";

import { passwordError } from "@/lib/password";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export interface UpdatePasswordState {
  variant: "error";
  message: string;
}

export async function updatePasswordAction(
  _prevState: UpdatePasswordState | undefined,
  formData: FormData
): Promise<UpdatePasswordState | undefined> {
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  const passwordIssue = passwordError(password);
  if (passwordIssue) return { variant: "error", message: passwordIssue };
  if (password !== confirmPassword) {
    return { variant: "error", message: "Passwords do not match." };
  }

  const supabase = await createClient();

  // The recovery link's session is established client-side (see
  // ResetPasswordGate, which consumes the tokens Supabase puts in the URL
  // hash — a server render never sees those) and synced into cookies
  // before this form can be submitted, so a valid session should already
  // be here. No session means the link was never a real recovery link, or
  // it genuinely expired.
  const {
    data: { session },
  } = await supabase.auth.getSession();
  // redirect() throws internally, so every call here runs unconditionally
  // (never inside a try/catch) — otherwise a catch block would swallow
  // the navigation and show a generic error instead.
  if (!session) redirect("/reset-password?error=invalid");

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    console.error("Password update error:", error.message);
    return {
      variant: "error",
      message: error.message || "Unable to update password. Please request a new reset link.",
    };
  }

  // Force re-login with the new password — the recovery session shouldn't
  // outlive the change.
  await supabase.auth.signOut();
  redirect("/reset-password?success=true");
}
