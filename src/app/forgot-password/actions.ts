"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export interface PasswordResetState {
  variant: "error";
  message: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function requestPasswordResetAction(
  _prevState: PasswordResetState | undefined,
  formData: FormData
): Promise<PasswordResetState | undefined> {
  const email = String(formData.get("email") ?? "").trim();

  if (!email) {
    return { variant: "error", message: "Email address is required." };
  }
  if (!EMAIL_REGEX.test(email)) {
    return { variant: "error", message: "Please enter a valid email address." };
  }

  const supabase = await createClient();
  const origin = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/reset-password`,
  });
  if (error) console.error("Password reset error:", error.message);

  // Security: never reveal whether the email exists — always land on the
  // same success state regardless of outcome (email enumeration
  // protection). redirect() throws internally, so it must run outside any
  // try/catch here or our own catch would swallow the navigation and show
  // an error instead — see node_modules/next/dist/docs/.../redirect.md.
  redirect("/forgot-password?sent=true");
}
