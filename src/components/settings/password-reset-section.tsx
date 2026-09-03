"use client";

import { requestPasswordResetForLoggedInUserAction, type PasswordResetRequestState } from "@/app/settings/actions";
import { useActionState } from "react";

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
        <span className="text-[12.5px] font-bold tracking-[.16em] text-text-3">PASSWORD</span>
        <div className="rounded-sm bg-mist px-5 py-4">
          <p className="text-[14px] font-semibold text-ink">Reset link sent</p>
          <p className="mt-1 text-[13px] text-ink/80">
            Check your email at <span className="font-semibold">{userEmail}</span> for instructions to reset your
            password.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[14px]">
      <span className="text-[12.5px] font-bold tracking-[.16em] text-text-3">PASSWORD</span>
      <p className="text-[14px] leading-[1.65] text-text-2">
        Reset your password by sending a secure link to your email address.
      </p>
      <div className="rounded-sm border border-[rgba(12,35,52,.16)] bg-[rgba(12,35,52,.03)] px-4 py-3">
        <p className="text-[13px] text-text-3">
          Password reset link will be sent to:{" "}
          <span className="font-semibold text-text-1">{userEmail}</span>
        </p>
      </div>
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
      <form action={formAction}>
        <button
          type="submit"
          disabled={pending}
          className="border border-[rgba(12,35,52,.28)] px-6 py-[13px] text-[12.5px] font-bold tracking-[.1em] disabled:opacity-60"
        >
          {pending ? "SENDING…" : "SEND RESET LINK"}
        </button>
      </form>
    </div>
  );
}
