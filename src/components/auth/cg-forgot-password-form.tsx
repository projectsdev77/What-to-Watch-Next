"use client";

import { requestPasswordResetAction, type PasswordResetState } from "@/app/forgot-password/actions";
import { CgFloatingLabelInput } from "@/components/auth/cg-floating-label-input";
import { useActionState } from "react";

export function CgForgotPasswordForm() {
  const [state, formAction, pending] = useActionState<PasswordResetState | undefined, FormData>(
    requestPasswordResetAction,
    undefined
  );

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <CgFloatingLabelInput id="email" label="Email" name="email" type="email" required autoComplete="email" />
      {state && <p className="text-[13px] font-medium text-[var(--cg-danger)]">{state.message}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-[var(--cg-r-input)] bg-[var(--cg-primary)] px-4 py-[15px] text-[13.5px] font-bold tracking-[.14em] text-[var(--cg-on-primary)] disabled:opacity-60"
      >
        {pending ? "SENDING…" : "SEND RESET LINK"}
      </button>
    </form>
  );
}
