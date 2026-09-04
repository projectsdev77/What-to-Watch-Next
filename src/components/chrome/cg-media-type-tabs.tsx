import Link from "next/link";
import type { MediaType } from "@/lib/tmdb";

const TABS: { type: MediaType; label: string }[] = [
  { type: "movie", label: "MOVIES" },
  { type: "tv", label: "TV SHOWS" },
];

/** Cinematic Glass tab pill pair — same URL-driven behavior as
 * MediaTypeTabs, restyled for the redesigned screens (Browse and
 * Tonight's Pick). */
export function CgMediaTypeTabs({
  active,
  basePath,
  preserveParams = {},
}: {
  active: MediaType;
  basePath: string;
  preserveParams?: Record<string, string | undefined>;
}) {
  function hrefFor(type: MediaType) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(preserveParams)) {
      if (value) params.set(key, value);
    }
    if (type !== "movie") params.set("type", type);
    const query = params.toString();
    return query ? `${basePath}?${query}` : basePath;
  }

  return (
    <div className="flex gap-[6px]">
      {TABS.map(({ type, label }) => (
        <Link
          key={type}
          href={hrefFor(type)}
          className={
            active === type
              ? "rounded-full bg-[var(--cg-primary)] px-[22px] py-[10px] text-[12px] font-bold tracking-[.1em] text-[var(--cg-on-primary)]"
              : "rounded-full border border-white/13 bg-white/6 px-[22px] py-[10px] text-[12px] font-semibold tracking-[.1em] text-[var(--cg-text-2)]"
          }
        >
          {label}
        </Link>
      ))}
    </div>
  );
}
