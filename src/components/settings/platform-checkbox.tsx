export function PlatformCheckbox({ name, checked }: { name: string; checked: boolean }) {
  return (
    <label className="flex cursor-pointer items-center gap-3 border border-[rgba(12,35,52,.22)] px-[17px] py-[15px] has-[:checked]:border-ink has-[:checked]:bg-mist">
      <input type="checkbox" name="platforms" value={name} defaultChecked={checked} className="peer sr-only" />
      <span
        aria-hidden
        className="flex h-4 w-4 shrink-0 items-center justify-center border border-[rgba(12,35,52,.35)] text-[11px] font-bold text-transparent peer-checked:border-ink peer-checked:bg-ink peer-checked:text-white"
      >
        ✓
      </span>
      <span className="text-[14.5px] text-text-2 peer-checked:font-semibold peer-checked:text-text-1">
        {name}
      </span>
    </label>
  );
}
