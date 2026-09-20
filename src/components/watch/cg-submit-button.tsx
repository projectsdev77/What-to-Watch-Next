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
  children,
}: {
  className: string;
  pendingLabel?: ReactNode;
  children: ReactNode;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={`${className} transition-[transform,opacity] active:scale-95 disabled:opacity-60`}
    >
      {pending && pendingLabel ? pendingLabel : children}
    </button>
  );
}
