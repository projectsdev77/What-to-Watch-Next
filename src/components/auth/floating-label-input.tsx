export function FloatingLabelInput({
  id,
  label,
  ...props
}: {
  id: string;
  label: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="relative">
      <label htmlFor={id} className="absolute -top-[9px] left-3 bg-card px-1.5 text-[12.5px] text-text-3">
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
