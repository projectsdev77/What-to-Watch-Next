export function CgFloatingLabelInput({
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
        className="absolute -top-[9px] left-3 rounded-full bg-[#0c1420] px-1.5 text-[12.5px] text-[var(--cg-text-3)]"
      >
        {label}
      </label>
      <input
        id={id}
        {...props}
        className="w-full rounded-[var(--cg-r-input)] border border-white/16 bg-white/6 px-4 py-[15px] text-[14.5px] text-[var(--cg-text-1)] focus:border-white/40 focus:outline-none"
      />
    </div>
  );
}
