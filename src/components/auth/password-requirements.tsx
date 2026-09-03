"use client";

import { getPasswordRequirements } from "@/lib/password";

export function PasswordRequirements({ password }: { password: string }) {
  return (
    <ul className="-mt-2 flex flex-col gap-1">
      {getPasswordRequirements(password).map((req) => (
        <li
          key={req.label}
          className={
            "flex items-center gap-2 text-[12.5px] transition-colors " +
            (req.met ? "text-success-ink" : "text-text-3")
          }
        >
          <span
            aria-hidden
            className={
              "flex h-[14px] w-[14px] shrink-0 items-center justify-center rounded-full border text-[9px] leading-none transition-colors " +
              (req.met
                ? "border-success bg-success text-white"
                : "border-[rgba(12,35,52,.3)] text-transparent")
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
