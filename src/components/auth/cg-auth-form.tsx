"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { signInAction, signUpAction, type AuthState } from "@/app/login/actions";
import { CgFloatingLabelInput } from "@/components/auth/cg-floating-label-input";
import { CgPasswordRequirements } from "@/components/auth/cg-password-requirements";

export function CgAuthForm({ mode }: { mode: "login" | "signup" }) {
  const action = mode === "login" ? signInAction : signUpAction;
  const [state, formAction, pending] = useActionState<AuthState | undefined, FormData>(
    action,
    undefined
  );
  const [password, setPassword] = useState("");

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <CgFloatingLabelInput id="email" label="Email" name="email" type="email" required autoComplete="email" />
      <div className="flex flex-col gap-2">
        <CgFloatingLabelInput
          id="password"
          label="Password"
          name="password"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={mode === "signup" ? 8 : undefined}
          autoComplete={mode === "login" ? "current-password" : "new-password"}
        />
        {mode === "login" && (
          <Link
            href="/forgot-password"
            className="self-end text-[12.5px] font-medium text-[var(--cg-text-3)] hover:text-[var(--cg-text-1)]"
          >
            Forgot password?
          </Link>
        )}
      </div>
      {mode === "signup" && <CgPasswordRequirements password={password} />}
      {state && (
        <p
          className={
            state.variant === "error"
              ? "text-[13px] font-medium text-[var(--cg-danger)]"
              : "text-[13px] font-medium text-[var(--cg-accent)]"
          }
        >
          {state.message}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-[var(--cg-r-input)] bg-[var(--cg-primary)] px-4 py-[15px] text-[13.5px] font-bold tracking-[.14em] text-[var(--cg-on-primary)] disabled:opacity-60"
      >
        {pending ? "PLEASE WAIT…" : mode === "login" ? "LOG IN" : "CREATE ACCOUNT"}
      </button>
    </form>
  );
}
