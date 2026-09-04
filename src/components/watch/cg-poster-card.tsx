import Link from "next/link";
import Image from "next/image";
import { TMDB_POSTER_BASE_URL } from "@/lib/tmdb";
import type { RecommendedTitle } from "@/lib/recommendations";

/** Cinematic Glass poster grid card — Browse's grid and Tonight's
 * Pick's "Also consider" strip are visually identical (poster + corner
 * % chip + title + platforms), just a different radius, so this one
 * component covers both. Not used by the old light-theme pages (title
 * detail keeps its own TitleCard). */
export function CgPosterCard({
  title,
  radiusPx = 20,
  hoverPlay = false,
}: {
  title: RecommendedTitle;
  radiusPx?: number;
  hoverPlay?: boolean;
}) {
  return (
    <Link href={`/title/${title.id}`} className="group flex flex-col gap-[11px]">
      <div
        className="relative aspect-[2/3] overflow-hidden bg-white/5 shadow-[0_18px_40px_rgba(2,6,14,.6)]"
        style={{ borderRadius: radiusPx }}
      >
        {title.posterPath && (
          <Image
            src={`${TMDB_POSTER_BASE_URL}${title.posterPath}`}
            alt={title.title}
            fill
            sizes="(max-width: 640px) 45vw, 200px"
            className="object-cover"
          />
        )}
        <span className="cg-chip absolute top-[11px] right-[11px] px-[11px] py-[5px] text-[10.5px] font-bold text-[var(--cg-text-1)]">
          {title.matchPercent}%
        </span>
        {hoverPlay && (
          <div className="absolute inset-0 flex items-center justify-center bg-[rgba(6,11,20,.45)] opacity-0 transition-opacity group-hover:opacity-100">
            <span className="flex h-[54px] w-[54px] items-center justify-center rounded-full border border-white/45 bg-white/20 text-[16px] text-[var(--cg-text-1)] backdrop-blur-[24px]">
              ▶
            </span>
          </div>
        )}
      </div>
      <div className="flex flex-col gap-[3px]">
        <span className="truncate text-[13px] font-semibold text-[var(--cg-text-1)]">{title.title}</span>
        {title.platforms.length > 0 && (
          <span className="truncate text-[11.5px] text-[var(--cg-text-3)]">{title.platforms.join(" · ")}</span>
        )}
      </div>
    </Link>
  );
}
