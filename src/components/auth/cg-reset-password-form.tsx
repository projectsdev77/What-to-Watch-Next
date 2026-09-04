"use client";

import { updatePasswordAction, type UpdatePasswordState } from "@/app/reset-password/actions";
import { CgFloatingLabelInput } from "@/components/auth/cg-floating-label-input";
import { CgPasswordRequirements } from "@/components/auth/cg-password-requirements";
import { useActionState, useState } from "react";

export function CgResetPasswordForm() {
  const [state, formAction, pending] = useActionState<UpdatePasswordState | undefined, FormData>(
    updatePasswordAction,
    undefined
  );
  const [password, setPassword] = useState("");

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <CgFloatingLabelInput
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
      <CgFloatingLabelInput
        id="confirmPassword"
        label="Confirm New Password"
        name="confirmPassword"
        type="password"
        required
        minLength={8}
        autoComplete="new-password"
      />
      <CgPasswordRequirements password={password} />
      {state && <p className="text-[13px] font-medium text-[var(--cg-danger)]">{state.message}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-[var(--cg-r-input)] bg-[var(--cg-primary)] px-4 py-[15px] text-[13.5px] font-bold tracking-[.14em] text-[var(--cg-on-primary)] disabled:opacity-60"
      >
        {pending ? "UPDATING…" : "UPDATE PASSWORD"}
      </button>
    </form>
  );
}
