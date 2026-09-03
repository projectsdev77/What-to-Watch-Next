"use server";

import { passwordError } from "@/lib/password";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export interface UpdatePasswordState {
  variant: "error" | "info";
  message: string;
}

export async function updatePasswordAction(
  _prevState: UpdatePasswordState | undefined,
  formData: FormData
): Promise<UpdatePasswordState | undefined> {
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  // Validate password requirements
  const passwordIssue = passwordError(password);
  if (passwordIssue) {
    return { variant: "error", message: passwordIssue };
  }

  // Ensure passwords match
  if (password !== confirmPassword) {
    return { variant: "error", message: "Passwords do not match." };
  }

  const supabase = await createClient();

  try {
    // Verify we have a valid session from the recovery link
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      redirect("/reset-password?error=invalid");
    }

    // Update the user's password
    const { error } = await supabase.auth.updateUser({
      password: password,
    });

    if (error) {
      console.error("Password update error:", error.message);
      
      // Handle specific error cases
      if (error.message.includes("session") || error.message.includes("token")) {
        redirect("/reset-password?error=expired");
      }
      
      return {
        variant: "error",
        message: "Unable to update password. Please request a new reset link.",
      };
    }

    // Sign out the user after password change for security
    await supabase.auth.signOut();

    // Redirect to success page
    redirect("/reset-password?success=true");
  } catch (error) {
    console.error("Password update failed:", error);
    return {
      variant: "error",
      message: "An unexpected error occurred. Please try again.",
    };
  }
}
