import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signOutAction } from "@/app/login/actions";

const NAV_LINKS = [
  { href: "/", label: "Tonight's pick" },
  { href: "/browse", label: "Browse" },
  { href: "/watchlist", label: "Watchlist" },
  { href: "/settings", label: "Settings" },
] as const;

/** The Cinematic Glass nav pill (client-provided redesign handoff) —
 * replaces AppHeader's steel bar on the 4 redesigned screens only.
 * Every other page (auth, title detail, search, onboarding) keeps the
 * original AppHeader, unchanged. */
export async function CgNavPill({ active }: { active?: (typeof NAV_LINKS)[number]["href"] }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="cg-nav flex flex-wrap items-center gap-[18px] px-[22px] py-[13px]">
      <span className="font-wordmark text-[16px] tracking-[-.03em] text-[var(--cg-text-1)]">WWN</span>

      <div className="flex flex-wrap gap-[5px]">
        {NAV_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={
              link.href === active
                ? "rounded-full bg-white/14 px-[17px] py-[9px] text-[12.5px] font-semibold text-[var(--cg-text-1)]"
                : "rounded-full px-[17px] py-[9px] text-[12.5px] text-[var(--cg-text-2)] hover:text-[var(--cg-text-1)]"
            }
          >
            {link.label}
          </Link>
        ))}
      </div>

      {user && (
        <form action="/search" method="GET" className="flex items-center">
          <input
            type="text"
            name="q"
            placeholder="Search titles"
            className="min-w-[190px] rounded-full border border-white/14 bg-white/6 px-[18px] py-[9px] text-[13px] text-[var(--cg-text-1)] placeholder:text-[var(--cg-text-3)] focus:border-white/30 focus:outline-none"
          />
        </form>
      )}

      {user && (
        <form action={signOutAction} className="ml-auto flex items-center gap-[13px]">
          <span className="hidden text-[12.5px] text-[var(--cg-text-3)] sm:inline">{user.email}</span>
          <button
            type="submit"
            className="rounded-full border border-white/18 bg-white/9 px-5 py-[9px] text-[12px] font-semibold tracking-[.06em] text-[var(--cg-text-1)]"
          >
            LOG OUT
          </button>
        </form>
      )}
    </div>
  );
}
