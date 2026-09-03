"use client";

import type { ReactNode } from "react";
import { useActionState, useRef, useState } from "react";
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
  requireChange = false,
}: {
  action: (
    prevState: PlatformsFormState | undefined,
    formData: FormData
  ) => Promise<PlatformsFormState | undefined>;
  selected: Set<string>;
  submitLabel: string;
  pendingLabel: string;
  footer?: ReactNode;
  // When true, the submit button stays disabled until the checked set
  // actually differs from `selected` — used in Settings, where saving
  // an unchanged selection is pointless. Onboarding leaves this off,
  // since there the button should be usable as soon as something's
  // checked, not compared against a prior save.
  requireChange?: boolean;
}) {
  const [state, formAction, pending] = useActionState<PlatformsFormState | undefined, FormData>(
    action,
    undefined
  );
  const formRef = useRef<HTMLFormElement>(null);
  const [hasChanged, setHasChanged] = useState(false);

  function syncHasChanged() {
    if (!requireChange || !formRef.current) return;
    const checked = new Set(
      Array.from(formRef.current.querySelectorAll<HTMLInputElement>('input[name="platforms"]:checked')).map(
        (el) => el.value
      )
    );
    setHasChanged(checked.size !== selected.size || [...checked].some((p) => !selected.has(p)));
  }

  return (
    <form ref={formRef} action={formAction} onChange={syncHasChanged} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        {STREAMING_PLATFORMS.map((name) => (
          <PlatformCheckbox key={name} name={name} checked={selected.has(name)} />
        ))}
      </div>
      {state?.error && <p className="text-[13px] font-medium text-danger-ink">{state.error}</p>}
      <div className="flex items-center gap-4 pt-1">
        <button
          type="submit"
          disabled={pending || (requireChange && !hasChanged)}
          className="bg-ink px-[34px] py-[14px] text-[12.5px] font-bold tracking-[.12em] text-white disabled:opacity-60"
        >
          {pending ? pendingLabel : submitLabel}
        </button>
        {footer}
      </div>
    </form>
  );
}
