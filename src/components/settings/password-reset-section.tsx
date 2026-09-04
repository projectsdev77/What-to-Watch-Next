"use client";

import { requestPasswordResetForLoggedInUserAction, type PasswordResetRequestState } from "@/app/settings/actions";
import { useActionState } from "react";

/** Cinematic Glass styling — settings-only component, no other screen affected. */
export function PasswordResetSection({
  userEmail,
  passwordResetSent,
}: {
  userEmail: string;
  passwordResetSent: boolean;
}) {
  const [state, formAction, pending] = useActionState<PasswordResetRequestState | undefined, FormData>(
    requestPasswordResetForLoggedInUserAction,
    undefined
  );

  if (passwordResetSent) {
    return (
      <div className="flex flex-col gap-[14px]">
        <span className="text-[11.5px] font-bold tracking-[.2em] text-[var(--cg-text-3)]">PASSWORD</span>
        <div className="rounded-[var(--cg-r-input)] bg-[rgba(159,212,236,.16)] px-5 py-4">
          <p className="text-[14px] font-semibold text-[var(--cg-text-1)]">Reset link sent</p>
          <p className="mt-1 text-[13px] text-[var(--cg-text-2)]">
            Check your email at <span className="font-semibold text-[var(--cg-text-1)]">{userEmail}</span> for
            instructions to reset your password.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[14px]">
      <span className="text-[11.5px] font-bold tracking-[.2em] text-[var(--cg-text-3)]">PASSWORD</span>
      <p className="text-[13.5px] leading-[1.65] text-[var(--cg-text-2)]">
        Reset your password by sending a secure link to your email address.
      </p>
      <div className="rounded-[var(--cg-r-input)] border border-white/12 bg-white/5 px-[17px] py-[14px]">
        <p className="text-[13px] text-[var(--cg-text-2)]">
          Link will be sent to <span className="font-semibold text-[var(--cg-text-1)]">{userEmail}</span>
        </p>
      </div>
      {state && <p className="text-[13px] font-medium text-[var(--cg-danger)]">{state.message}</p>}
      <form action={formAction}>
        <button
          type="submit"
          disabled={pending}
          className="rounded-full border border-white/20 bg-white/9 px-[26px] py-[13px] text-[12px] font-bold tracking-[.09em] text-[var(--cg-text-1)] disabled:opacity-60"
        >
          {pending ? "SENDING…" : "SEND RESET LINK"}
        </button>
      </form>
    </div>
  );
}
