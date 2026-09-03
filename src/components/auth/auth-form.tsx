"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signInAction, signUpAction, type AuthState } from "@/app/login/actions";
import { FloatingLabelInput } from "@/components/auth/floating-label-input";
import { PASSWORD_REQUIREMENTS_HINT } from "@/lib/password";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const action = mode === "login" ? signInAction : signUpAction;
  const [state, formAction, pending] = useActionState<AuthState | undefined, FormData>(
    action,
    undefined
  );

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <FloatingLabelInput
        id="email"
        label="Email"
        name="email"
        type="email"
        required
        autoComplete="email"
      />
      <div className="flex flex-col gap-2">
        <FloatingLabelInput
          id="password"
          label="Password"
          name="password"
          type="password"
          required
          // Only enforce a minimum length when creating a password (signup).
          // On login we should just attempt auth with whatever was typed —
          // gating on length there produced a confusing "too short" message
          // even when the credentials might otherwise be valid.
          minLength={mode === "signup" ? 8 : undefined}
          autoComplete={mode === "login" ? "current-password" : "new-password"}
        />
        {mode === "login" && (
          <Link
            href="/forgot-password"
            className="self-end text-[12.5px] font-medium text-steel-dark hover:text-ink"
          >
            Forgot password?
          </Link>
        )}
      </div>
      {mode === "signup" && (
        <p className="-mt-2 text-[12.5px] text-text-3">{PASSWORD_REQUIREMENTS_HINT}</p>
      )}
      {state && (
        <p
          className={
            state.variant === "error"
              ? "text-[13px] font-medium text-danger-ink"
              : "text-[13px] font-medium text-steel-dark"
          }
        >
          {state.message}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className={
          mode === "login"
            ? "bg-steel px-4 py-[15px] text-[13.5px] font-bold tracking-[.14em] text-white disabled:opacity-60"
            : "bg-ink px-4 py-[15px] text-[13.5px] font-bold tracking-[.14em] text-white disabled:opacity-60"
        }
      >
        {pending ? "PLEASE WAIT…" : mode === "login" ? "LOG IN" : "CREATE ACCOUNT"}
      </button>
    </form>
  );
}
