"use client";

import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";

/** A <button type="submit"> for a Server Action <form> that visibly
 * reacts to being pressed — both the instant tactile press (CSS
 * :active, fires immediately regardless of network speed) and a
 * pending state for the round-trip itself (dims + disables via
 * useFormStatus, so a slow request doesn't look like the click did
 * nothing). Must render inside the <form> it submits. */
export function CgSubmitButton({
  className,
  pendingLabel,
  disabled,
  children,
}: {
  className: string;
  pendingLabel?: ReactNode;
  /** An extra condition (beyond the in-flight request) that should keep
   * the button disabled — e.g. a gate like the quiz's rating threshold. */
  disabled?: boolean;
  children: ReactNode;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className={`${className} transition-[transform,opacity] active:scale-95 disabled:opacity-60 disabled:active:scale-100`}
    >
      {pending && pendingLabel ? pendingLabel : children}
    </button>
  );
}
