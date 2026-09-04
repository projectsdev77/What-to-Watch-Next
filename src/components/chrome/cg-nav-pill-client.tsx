"use client";

import { useState } from "react";
import Link from "next/link";
import { signOutAction } from "@/app/login/actions";

const NAV_LINKS = [
  { href: "/", label: "Tonight's pick" },
  { href: "/browse", label: "Browse" },
  { href: "/watchlist", label: "Watchlist" },
  { href: "/settings", label: "Settings" },
] as const;

export type NavHref = (typeof NAV_LINKS)[number]["href"];

function linkClass(isActive: boolean, mobile: boolean) {
  const base = mobile
    ? "rounded-[var(--cg-r-input)] px-[16px] py-[11px] text-[14px]"
    : "rounded-full px-[17px] py-[9px] text-[12.5px]";
  return isActive
    ? `${base} bg-white/14 font-semibold text-[var(--cg-text-1)]`
    : `${base} text-[var(--cg-text-2)] hover:text-[var(--cg-text-1)]`;
}

/** Client half of CgNavPill — needs interactivity for the mobile
 * hamburger toggle, which a Server Component (the auth lookup half)
 * can't provide. Below the `lg` breakpoint (four links + search + email
 * + logout don't fit comfortably any narrower, even on a tablet) the
 * pill collapses to just the wordmark + a toggle button; tapping it
 * drops an expanded panel in normal document flow (not an overlay), so
 * it pushes page content down instead of covering it. */
export function CgNavPillClient({ active, userEmail }: { active?: NavHref; userEmail: string | null }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col gap-[10px]">
      <div className="cg-nav flex items-center gap-[14px] px-[18px] py-[11px] lg:gap-[18px] lg:px-[22px] lg:py-[13px]">
        <span className="font-wordmark text-[16px] tracking-[-.03em] text-[var(--cg-text-1)]">WWN</span>

        <div className="hidden flex-wrap gap-[5px] lg:flex">
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className={linkClass(link.href === active, false)}>
              {link.label}
            </Link>
          ))}
        </div>

        {userEmail && (
          <form action="/search" method="GET" className="hidden items-center lg:flex">
            <input
              type="text"
              name="q"
              placeholder="Search titles"
              className="min-w-[190px] rounded-full border border-white/14 bg-white/6 px-[18px] py-[9px] text-[13px] text-[var(--cg-text-1)] placeholder:text-[var(--cg-text-3)] focus:border-white/30 focus:outline-none"
            />
          </form>
        )}

        {userEmail && (
          <form action={signOutAction} className="ml-auto hidden items-center gap-[13px] lg:flex">
            <span className="hidden text-[12.5px] text-[var(--cg-text-3)] xl:inline">{userEmail}</span>
            <button
              type="submit"
              className="rounded-full border border-white/18 bg-white/9 px-5 py-[9px] text-[12px] font-semibold tracking-[.06em] text-[var(--cg-text-1)]"
            >
              LOG OUT
            </button>
          </form>
        )}

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? "Close menu" : "Open menu"}
          className="ml-auto flex h-9 w-9 items-center justify-center rounded-full border border-white/18 bg-white/9 text-[var(--cg-text-1)] lg:hidden"
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
            <form action="/search" method="GET" className="mt-[6px] flex items-center">
              <input
                type="text"
                name="q"
                placeholder="Search titles"
                className="w-full rounded-[var(--cg-r-input)] border border-white/14 bg-white/6 px-[16px] py-[11px] text-[14px] text-[var(--cg-text-1)] placeholder:text-[var(--cg-text-3)] focus:border-white/30 focus:outline-none"
              />
            </form>
          )}

          {userEmail && (
            <form action={signOutAction} className="mt-[6px] flex flex-col gap-[8px]">
              <span className="truncate px-[4px] text-[12.5px] text-[var(--cg-text-3)]">{userEmail}</span>
              <button
                type="submit"
                className="rounded-[var(--cg-r-input)] border border-white/18 bg-white/9 px-[16px] py-[11px] text-[12.5px] font-semibold tracking-[.06em] text-[var(--cg-text-1)]"
              >
                LOG OUT
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
