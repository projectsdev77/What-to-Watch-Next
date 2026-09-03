"use client";

import { requestPasswordResetAction, type PasswordResetState } from "@/app/forgot-password/actions";
import { FloatingLabelInput } from "@/components/auth/floating-label-input";
import { useActionState } from "react";

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState<PasswordResetState | undefined, FormData>(
    requestPasswordResetAction,
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
      {state && <p className="text-[13px] font-medium text-danger-ink">{state.message}</p>}
      <button
        type="submit"
        disabled={pending}
        className="bg-ink px-4 py-[15px] text-[13.5px] font-bold tracking-[.14em] text-white disabled:opacity-60"
      >
        {pending ? "SENDING…" : "SEND RESET LINK"}
      </button>
    </form>
  );
}
