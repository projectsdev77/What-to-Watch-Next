"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export interface PasswordResetState {
  variant: "error" | "info";
  message: string;
}

export async function requestPasswordResetAction(
  _prevState: PasswordResetState | undefined,
  formData: FormData
): Promise<PasswordResetState | undefined> {
  const email = String(formData.get("email") ?? "").trim();

  if (!email) {
    return { variant: "error", message: "Email address is required." };
  }

  // Basic email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { variant: "error", message: "Please enter a valid email address." };
  }

  const supabase = await createClient();

  try {
    // Get the origin for the redirect URL
    const origin = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/reset-password`,
    });

    // Security: Do not reveal whether the email exists in the system.
    // Always show the same success message regardless of the result.
    // This prevents email enumeration attacks.
    if (error) {
      // Log the error server-side for debugging, but don't expose it to the user
      console.error("Password reset error:", error.message);
    }

    // Always redirect to the success state, even if there was an error
    redirect("/forgot-password?sent=true");
  } catch (error) {
    // Handle network or unexpected errors
    console.error("Password reset request failed:", error);
    return {
      variant: "error",
      message: "Unable to process your request. Please try again.",
    };
  }
}
