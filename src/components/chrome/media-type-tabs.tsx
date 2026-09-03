import Link from "next/link";
import type { MediaType } from "@/lib/tmdb";

const TABS: { type: MediaType; label: string }[] = [
  { type: "movie", label: "MOVIES" },
  { type: "tv", label: "TV SHOWS" },
];

/** Movies / TV Shows tabs used on both the home and browse pages — a real
 * structural split (separate candidate pools, separate picks) rather than
 * just another filter, driven by the `type` URL search param. */
export function MediaTypeTabs({
  active,
  basePath,
  preserveParams = {},
}: {
  active: MediaType;
  basePath: string;
  // Other query params (e.g. platform, genre) to carry over when switching tabs.
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
    <div className="flex items-center gap-2 bg-steel-dark px-6 py-3 sm:px-10">
      {TABS.map(({ type, label }) => (
        <Link
          key={type}
          href={hrefFor(type)}
          className={`px-5 py-[9px] text-[12.5px] font-bold tracking-[.1em] ${
            active === type ? "bg-white text-ink" : "text-white/80 hover:text-white"
          }`}
        >
          {label}
        </Link>
      ))}
    </div>
  );
}
