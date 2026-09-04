"use client";

import type { ReactNode } from "react";
import { useActionState, useRef, useState } from "react";
import { STREAMING_PLATFORMS } from "@/lib/platforms";
import type { PlatformsFormState } from "./platform-picker-form";

/** Cinematic Glass version of PlatformPickerForm, for Settings only —
 * onboarding/platforms keeps the original light-theme PlatformPickerForm
 * unchanged, since that screen was explicitly out of scope for this
 * redesign. Same server action, same requireChange behavior, new look. */
export function CgPlatformPickerForm({
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
  const formRef = useRef<HTMLFormElement>(null);
  const [hasChanged, setHasChanged] = useState(false);

  function syncHasChanged() {
    if (!formRef.current) return;
    const checked = new Set(
      Array.from(formRef.current.querySelectorAll<HTMLInputElement>('input[name="platforms"]:checked')).map(
        (el) => el.value
      )
    );
    setHasChanged(checked.size !== selected.size || [...checked].some((p) => !selected.has(p)));
  }

  return (
    <form ref={formRef} action={formAction} onChange={syncHasChanged} className="flex flex-col gap-[22px]">
      <div className="grid grid-cols-1 gap-[11px] sm:grid-cols-2">
        {STREAMING_PLATFORMS.map((name) => (
          <label
            key={name}
            className="flex cursor-pointer items-center gap-3 rounded-[var(--cg-r-input)] border border-white/13 bg-white/5 px-[18px] py-[15px] has-[:checked]:border-[rgba(159,212,236,.5)] has-[:checked]:bg-[rgba(159,212,236,.16)]"
          >
            <input
              type="checkbox"
              name="platforms"
              value={name}
              defaultChecked={selected.has(name)}
              className="peer sr-only"
            />
            <span
              aria-hidden
              className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[var(--cg-r-check)] border border-white/30 text-[10px] font-bold text-transparent peer-checked:border-[var(--cg-accent)] peer-checked:bg-[var(--cg-accent)] peer-checked:text-[var(--cg-on-primary)]"
            >
              ✓
            </span>
            <span className="text-[14px] text-[var(--cg-text-2)] peer-checked:font-semibold peer-checked:text-[var(--cg-text-1)]">
              {name}
            </span>
          </label>
        ))}
      </div>
      {state?.error && <p className="text-[13px] font-medium text-[var(--cg-danger)]">{state.error}</p>}
      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={pending || !hasChanged}
          className="rounded-full bg-[var(--cg-primary)] px-[36px] py-[15px] text-[12.5px] font-bold tracking-[.1em] text-[var(--cg-on-primary)] disabled:opacity-50"
        >
          {pending ? pendingLabel : submitLabel}
        </button>
        {footer}
      </div>
    </form>
  );
}
