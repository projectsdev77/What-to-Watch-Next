"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { passwordError } from "@/lib/password";
import { checkRateLimit } from "@/lib/rate-limit";

export interface AuthState {
  variant: "error" | "info";
  message: string;
}

async function clientIp(): Promise<string> {
  const h = await headers();
  // Most hosts (including Vercel) set this; falls back to a shared
  // bucket in local dev where it's absent, which is fine there.
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

function tooManyAttemptsMessage(retryAfterSeconds: number): string {
  const minutes = Math.max(1, Math.ceil(retryAfterSeconds / 60));
  return `Too many attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`;
}

const SIGN_IN_EMAIL_LIMIT = 5;
const SIGN_IN_IP_LIMIT = 20;
const SIGN_IN_WINDOW_MS = 5 * 60 * 1000;

export async function signInAction(
  _prevState: AuthState | undefined,
  formData: FormData
): Promise<AuthState | undefined> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  // Two limits: per-email (stop password-guessing on one account) and
  // per-IP (stop one source spraying attempts across many emails).
  const ip = await clientIp();
  const byEmail = checkRateLimit(`signin:email:${email.toLowerCase()}`, SIGN_IN_EMAIL_LIMIT, SIGN_IN_WINDOW_MS);
  const byIp = checkRateLimit(`signin:ip:${ip}`, SIGN_IN_IP_LIMIT, SIGN_IN_WINDOW_MS);
  if (!byEmail.allowed || !byIp.allowed) {
    return { variant: "error", message: tooManyAttemptsMessage(Math.max(byEmail.retryAfterSeconds, byIp.retryAfterSeconds)) };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { variant: "error", message: error.message };

  redirect("/");
}

const SIGN_UP_IP_LIMIT = 5;
const SIGN_UP_WINDOW_MS = 15 * 60 * 1000;

export async function signUpAction(
  _prevState: AuthState | undefined,
  formData: FormData
): Promise<AuthState | undefined> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const passwordIssue = passwordError(password);
  if (passwordIssue) return { variant: "error", message: passwordIssue };

  const ip = await clientIp();
  const { allowed, retryAfterSeconds } = checkRateLimit(`signup:ip:${ip}`, SIGN_UP_IP_LIMIT, SIGN_UP_WINDOW_MS);
  if (!allowed) return { variant: "error", message: tooManyAttemptsMessage(retryAfterSeconds) };

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
