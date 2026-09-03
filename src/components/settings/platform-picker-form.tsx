"use client";

import type { ReactNode } from "react";
import { useActionState } from "react";
import { STREAMING_PLATFORMS } from "@/lib/platforms";
import { PlatformCheckbox } from "./platform-checkbox";

export interface PlatformsFormState {
  error: string;
}

export function PlatformPickerForm({
  action,
  selected,
  submitLabel,
  pendingLabel,
  footer,
}: {
  action: (
    prevState: PlatformsFormState | undefined,
    formData: FormData
  ) => Promise<PlatformsFormState | undefined>;
  selected: Set<string>;
  submitLabel: string;
  pendingLabel: string;
  footer?: ReactNode;
}) {
  const [state, formAction, pending] = useActionState<PlatformsFormState | undefined, FormData>(
    action,
    undefined
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        {STREAMING_PLATFORMS.map((name) => (
          <PlatformCheckbox key={name} name={name} checked={selected.has(name)} />
        ))}
      </div>
      {state?.error && <p className="text-[13px] font-medium text-danger-ink">{state.error}</p>}
      <div className="flex items-center gap-4 pt-1">
        <button
          type="submit"
          disabled={pending}
          className="bg-ink px-[34px] py-[14px] text-[12.5px] font-bold tracking-[.12em] text-white disabled:opacity-60"
        >
          {pending ? pendingLabel : submitLabel}
        </button>
        {footer}
      </div>
    </form>
  );
}
