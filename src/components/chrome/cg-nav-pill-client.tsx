"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { signOutAction } from "@/app/login/actions";
import { CgSubmitButton } from "@/components/watch/cg-submit-button";

const NAV_LINKS = [
  { href: "/", label: "Tonight's pick" },
  { href: "/settings", label: "Settings" },
] as const;

export type NavHref = (typeof NAV_LINKS)[number]["href"];

function linkClass(isActive: boolean, mobile: boolean, immersive = false) {
  const base = mobile
    ? "rounded-[var(--cg-r-input)] px-[16px] py-[11px] text-[14px]"
    : immersive
      ? "rounded-full px-[20px] py-[11px] text-[14px]"
      : "rounded-full px-[17px] py-[9px] text-[12.5px]";
  return isActive
    ? `${base} bg-white/14 font-semibold text-[var(--cg-text-1)]`
    : `${base} text-[var(--cg-text-2)] hover:text-[var(--cg-text-1)]`;
}

/** Client half of CgNavPill — needs interactivity for the mobile
 * hamburger toggle, which a Server Component (the auth lookup half)
 * can't provide. Below the `lg` breakpoint the pill collapses to just
 * the wordmark + a toggle button; tapping it drops an expanded panel
 * in normal document flow (not an overlay), so it pushes page content
 * down instead of covering it.
 *
 * `immersive`: the larger, darker glass pill Tonight's Pick floats over its
 * key art. `slot` is extra desktop-only content before the account area
 * (Tonight's Pick puts its Movies/TV toggle there). */
export function CgNavPillClient({
  active,
  userEmail,
  immersive = false,
  slot,
}: {
  active?: NavHref;
  userEmail: string | null;
  immersive?: boolean;
  slot?: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col gap-[10px]">
      <div
        className={
          immersive
            ? "flex items-center gap-[8px] rounded-full border border-white/16 bg-[rgba(6,11,20,.35)] py-[8px] pr-[8px] pl-[22px] text-[var(--cg-text-1)] backdrop-blur-[24px] lg:pl-[26px]"
            : "cg-nav flex items-center gap-[14px] px-[18px] py-[11px] lg:gap-[18px] lg:px-[22px] lg:py-[13px]"
        }
      >
        <span
          className={`font-wordmark tracking-[-.03em] text-[var(--cg-text-1)] ${immersive ? "mr-[16px] text-[19px]" : "text-[16px]"}`}
        >
          WWN
        </span>

        <div className="hidden flex-wrap gap-[5px] lg:flex">
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className={linkClass(link.href === active, false, immersive)}>
              {link.label}
            </Link>
          ))}
        </div>

        {slot && <div className="ml-auto hidden lg:block">{slot}</div>}

        {userEmail && (
          <form
            action={signOutAction}
            className={`hidden items-center lg:flex ${slot ? "gap-[16px] pl-[16px]" : "ml-auto gap-[13px]"}`}
          >
            <span className={`hidden xl:inline ${immersive ? "text-[14px] text-white/85" : "text-[12.5px] text-[var(--cg-text-3)]"}`}>
              {userEmail}
            </span>
            <CgSubmitButton
              pendingLabel="…"
              className={
                immersive
                  ? "rounded-full border border-white/35 px-6 py-[12px] text-[13px] font-bold tracking-[.1em] text-[var(--cg-text-1)]"
                  : "rounded-full border border-white/18 bg-white/9 px-5 py-[9px] text-[12px] font-semibold tracking-[.06em] text-[var(--cg-text-1)]"
              }
            >
              LOG OUT
            </CgSubmitButton>
          </form>
        )}

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? "Close menu" : "Open menu"}
          className="ml-auto flex h-10 w-10 items-center justify-center rounded-full border border-white/18 bg-white/9 text-[var(--cg-text-1)] transition-transform active:scale-90 lg:hidden"
        >
          <span aria-hidden className="text-[15px] leading-none">
            {open ? "✕" : "☰"}
          </span>
        </button>
      </div>

      {open && (
        <div className="cg-pane flex flex-col gap-[6px] p-[14px] lg:hidden">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className={linkClass(link.href === active, true)}
            >
              {link.label}
            </Link>
          ))}

          {userEmail && (
            <form action={signOutAction} className="mt-[6px] flex flex-col gap-[8px]">
              <span className="truncate px-[4px] text-[12.5px] text-[var(--cg-text-3)]">{userEmail}</span>
              <CgSubmitButton
                pendingLabel="…"
                className="rounded-[var(--cg-r-input)] border border-white/18 bg-white/9 px-[16px] py-[11px] text-[12.5px] font-semibold tracking-[.06em] text-[var(--cg-text-1)]"
              >
                LOG OUT
              </CgSubmitButton>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
