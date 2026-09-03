"use client";

import { updatePasswordAction, type UpdatePasswordState } from "@/app/reset-password/actions";
import { FloatingLabelInput } from "@/components/auth/floating-label-input";
import { PasswordRequirements } from "@/components/auth/password-requirements";
import { useActionState, useState } from "react";

export function ResetPasswordForm() {
  const [state, formAction, pending] = useActionState<UpdatePasswordState | undefined, FormData>(
    updatePasswordAction,
    undefined
  );
  const [password, setPassword] = useState("");

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <FloatingLabelInput
        id="password"
        label="New Password"
        name="password"
        type="password"
        required
        minLength={8}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
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
      <PasswordRequirements password={password} />
      {state && <p className="text-[13px] font-medium text-danger-ink">{state.message}</p>}
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
