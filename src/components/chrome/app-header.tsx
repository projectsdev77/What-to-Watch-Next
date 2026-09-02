import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signOutAction } from "@/app/login/actions";

const NAV_LINKS = [
  { href: "/", label: "Tonight's Pick" },
  { href: "/browse", label: "Browse" },
  { href: "/watchlist", label: "Watchlist" },
  { href: "/settings", label: "Settings" },
] as const;

export async function AppHeader({ active }: { active?: (typeof NAV_LINKS)[number]["href"] }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex flex-wrap items-center gap-x-7 gap-y-2 bg-steel px-6 py-3.5 sm:px-10">
      <span className="font-wordmark text-[17px] tracking-[-.02em] text-white">WWN</span>

      <nav className="flex flex-wrap gap-x-6 gap-y-1 text-[13px] font-semibold tracking-[.11em] text-white/72">
        {NAV_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={
              link.href === active
                ? "border-b-2 border-mist pb-[3px] text-white"
                : "border-b-2 border-transparent pb-[3px] text-white/72 hover:text-white"
            }
          >
            {link.label.toUpperCase()}
          </Link>
        ))}
      </nav>

      {user && (
        <form action={signOutAction} className="ml-auto flex items-center gap-4">
          <span className="hidden text-[13px] text-white/82 sm:inline">{user.email}</span>
          <button
            type="submit"
            className="bg-ink px-5 py-2.5 text-[12.5px] font-bold tracking-[.1em] text-white"
          >
            LOG OUT
          </button>
        </form>
      )}
    </div>
  );
}
