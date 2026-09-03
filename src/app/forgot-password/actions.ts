"use server";

import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { redirect } from "next/navigation";

export interface PasswordResetState {
  variant: "error";
  message: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Shared key format with settings/actions.ts's logged-in reset request —
// both ultimately email the same address, so they draw from one combined
// budget rather than two independent ones that together allow double
// the intended rate.
const RESET_EMAIL_LIMIT = 3;
const RESET_WINDOW_MS = 15 * 60 * 1000;

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

  const { allowed } = checkRateLimit(`reset:email:${email.toLowerCase()}`, RESET_EMAIL_LIMIT, RESET_WINDOW_MS);
  if (allowed) {
    const supabase = await createClient();
    const origin = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/reset-password`,
    });
    if (error) console.error("Password reset error:", error.message);
  }
  // else: silently skip sending — see the comment below on why this
  // still redirects to the same success state either way.

  // Security: never reveal whether the email exists, or whether it's
  // being rate-limited — always land on the same success state
  // regardless of outcome (email enumeration protection extends to the
  // rate limit itself, not just to whether the account exists).
  // redirect() throws internally, so it must run outside any try/catch
  // here, or our own catch would swallow the navigation and show an
  // error instead — see node_modules/next/dist/docs's redirect.md.
  redirect("/forgot-password?sent=true");
}
