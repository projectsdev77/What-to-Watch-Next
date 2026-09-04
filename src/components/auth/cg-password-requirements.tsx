"use client";

import { getPasswordRequirements } from "@/lib/password";

export function CgPasswordRequirements({ password }: { password: string }) {
  return (
    <ul className="-mt-2 flex flex-col gap-1">
      {getPasswordRequirements(password).map((req) => (
        <li
          key={req.label}
          className={
            "flex items-center gap-2 text-[12.5px] transition-colors " +
            (req.met ? "text-[var(--cg-accent)]" : "text-[var(--cg-text-3)]")
          }
        >
          <span
            aria-hidden
            className={
              "flex h-[14px] w-[14px] shrink-0 items-center justify-center rounded-full border text-[9px] leading-none transition-colors " +
              (req.met
                ? "border-[var(--cg-accent)] bg-[var(--cg-accent)] text-[var(--cg-on-primary)]"
                : "border-white/25 text-transparent")
            }
          >
            ✓
          </span>
          {req.label}
        </li>
      ))}
    </ul>
  );
}
