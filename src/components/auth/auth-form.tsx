"use client";

import { useActionState } from "react";
import { signInAction, signUpAction, type AuthState } from "@/app/login/actions";

function FloatingLabelInput({
  id,
  label,
  ...props
}: {
  id: string;
  label: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="relative">
      <label
        htmlFor={id}
        className="absolute -top-[9px] left-3 bg-card px-1.5 text-[12.5px] text-text-3"
      >
        {label}
      </label>
      <input
        id={id}
        {...props}
        className="w-full border border-[rgba(12,35,52,.30)] px-4 py-[15px] text-[14.5px] text-text-1 focus:border-2 focus:border-steel focus:px-[15px] focus:py-[14px] focus:outline-none"
      />
    </div>
  );
}

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
