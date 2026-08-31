"use client";

import { useActionState } from "react";
import { signInAction, signUpAction, type AuthState } from "@/app/login/actions";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const action = mode === "login" ? signInAction : signUpAction;
  const [state, formAction, pending] = useActionState<AuthState | undefined, FormData>(
    action,
    undefined
  );

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input
        name="email"
        type="email"
        required
        placeholder="Email"
        autoComplete="email"
        className="rounded border border-black/10 px-3 py-2 dark:border-white/15"
      />
      <input
        name="password"
        type="password"
        required
        minLength={8}
        placeholder="Password"
        autoComplete={mode === "login" ? "current-password" : "new-password"}
        className="rounded border border-black/10 px-3 py-2 dark:border-white/15"
      />
      {state && (
        <p className={state.variant === "error" ? "text-sm text-red-500" : "text-sm text-emerald-500"}>
          {state.message}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-foreground px-4 py-2 text-background disabled:opacity-60"
      >
        {pending ? "Please wait…" : mode === "login" ? "Log in" : "Sign up"}
      </button>
    </form>
  );
}
