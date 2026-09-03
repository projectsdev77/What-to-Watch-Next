"use client";

import { updatePasswordAction, type UpdatePasswordState } from "@/app/reset-password/actions";
import { FloatingLabelInput } from "@/components/auth/floating-label-input";
import { PASSWORD_REQUIREMENTS_HINT } from "@/lib/password";
import { useActionState } from "react";

export function ResetPasswordForm() {
  const [state, formAction, pending] = useActionState<UpdatePasswordState | undefined, FormData>(
    updatePasswordAction,
    undefined
  );

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <FloatingLabelInput
        id="password"
        label="New Password"
        name="password"
        type="password"
        required
        minLength={8}
        autoComplete="new-password"
      />
      <FloatingLabelInput
        id="confirmPassword"
        label="Confirm New Password"
        name="confirmPassword"
        type="password"
        required
        minLength={8}
        autoComplete="new-password"
      />
      <p className="-mt-2 text-[12.5px] text-text-3">{PASSWORD_REQUIREMENTS_HINT}</p>
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
        className="bg-ink px-4 py-[15px] text-[13.5px] font-bold tracking-[.14em] text-white disabled:opacity-60"
      >
        {pending ? "UPDATING…" : "UPDATE PASSWORD"}
      </button>
    </form>
  );
}
