"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export interface AuthState {
  variant: "error" | "info";
  message: string;
}

export async function signInAction(
  _prevState: AuthState | undefined,
  formData: FormData
): Promise<AuthState | undefined> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { variant: "error", message: error.message };

  redirect("/");
}

export async function signUpAction(
  _prevState: AuthState | undefined,
  formData: FormData
): Promise<AuthState | undefined> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  if (password.length < 8) {
    return { variant: "error", message: "Password must be at least 8 characters." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) return { variant: "error", message: error.message };

  if (!data.session) {
    // Supabase's default "Confirm email" setting is on — no active
    // session until the user clicks the confirmation link.
    return {
      variant: "info",
      message: "Check your email to confirm your account, then log in.",
    };
  }

  redirect("/onboarding/platforms");
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
