"use client";

import { requestPasswordResetAction, type PasswordResetState } from "@/app/forgot-password/actions";
import { useActionState } from "react";

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
        {pending ? "SENDING…" : "SEND RESET LINK"}
      </button>
    </form>
  );
}
