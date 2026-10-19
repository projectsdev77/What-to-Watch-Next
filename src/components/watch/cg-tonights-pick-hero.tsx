import type { ReactNode } from "react";
import Image from "next/image";
import { genreName } from "@/lib/genres";
import { TMDB_POSTER_BASE_URL } from "@/lib/tmdb";
import type { RecommendedTitle } from "@/lib/recommendations";
import { CgWatchNowButton } from "@/components/watch/cg-watch-now-button";
import { CgFeedbackActions } from "@/components/watch/cg-feedback-actions";

/** Full-screen Tonight's Pick hero: big title, synopsis and actions on the
 * left, a large poster on the right (stacked on mobile, poster first), all
 * over a blurred copy of the poster. `header` is the nav and tabs above it. */
export function CgTonightsPickHero({
  pick,
  unrestricted,
  matchingPlatforms,
  redirectTo,
  header,
}: {
  pick: RecommendedTitle;
  unrestricted: boolean;
  matchingPlatforms: string[];
  redirectTo: string;
  header: ReactNode;
}) {
  const genres = pick.genreIds.slice(0, 3).map((id) => genreName(id)).join(", ");

  return (
    <div className="cg-screen relative flex min-h-screen flex-col overflow-hidden bg-[var(--cg-ground)] font-sans text-[var(--cg-text-1)]">
      {/* Ambient background: the poster, blurred and darkened to fill the
          screen. The catalog stores portrait posters only, so a sharp
          full-bleed version would crop badly. */}
      {pick.posterPath && (
        <div className="absolute inset-0 scale-110 opacity-55 blur-[40px]">
          <Image src={`${TMDB_POSTER_BASE_URL}${pick.posterPath}`} alt="" aria-hidden fill sizes="100vw" className="object-cover" />
        </div>
      )}
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(6,11,20,.92)_0%,rgba(6,11,20,.7)_45%,rgba(6,11,20,.35)_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(6,11,20,.55)_0%,transparent_30%,transparent_70%,#060B14_100%)]" />

      <div className="relative mx-auto flex w-full max-w-[1400px] flex-1 flex-col gap-5 p-[22px] pb-8">
        {header}

        <section className="flex flex-1 flex-col-reverse items-center gap-8 py-6 lg:flex-row lg:justify-between lg:gap-16 lg:px-6 lg:py-10">
          <div className="flex w-full min-w-0 flex-1 flex-col gap-5 lg:max-w-[640px]">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] font-semibold tracking-[.08em] text-[var(--cg-text-2)] uppercase">
              <span className="text-[var(--cg-accent)]">Tonight&apos;s pick</span>
              <span>{pick.mediaType === "tv" ? "TV show" : "Movie"}</span>
              {genres && <span>{genres}</span>}
            </div>
            <h1 className="font-heading text-[44px] leading-[.95] font-bold tracking-[-.045em] text-balance sm:text-[64px] lg:text-[84px]">
              {pick.title}
            </h1>
            <div className="flex flex-wrap items-center gap-[9px]">
              <span className="rounded-full border border-white/20 bg-white/12 px-[15px] py-[7px] text-[12.5px] font-semibold backdrop-blur-[20px]">
                {pick.matchPercent}% match
              </span>
              {/* With a real platform selection, each platform already has
                  its own watch button below; only list them here in
                  unrestricted mode, where there are no per-platform buttons. */}
              {unrestricted &&
                pick.platforms.map((platform) => (
                  <span
                    key={platform}
                    className="rounded-full border border-white/20 bg-white/12 px-[15px] py-[7px] text-[12.5px] font-semibold backdrop-blur-[20px]"
                  >
                    {platform}
                  </span>
                ))}
            </div>
            {pick.overview && (
              <p className="line-clamp-4 max-w-[58ch] text-[15.5px] leading-[1.65] text-[var(--cg-text-2)]">
                {pick.overview}
              </p>
            )}
            <p className="max-w-[52ch] text-[17px] leading-[1.55] font-medium text-[var(--cg-text-1)]">{pick.why}</p>
            <div className="flex flex-wrap gap-[11px] pt-2">
              <CgWatchNowButton
                title={pick.title}
                titleId={pick.id}
                redirectTo={redirectTo}
                matchingPlatforms={matchingPlatforms}
                platformLinks={pick.platformLinks}
                fallbackUrl={pick.watchUrl}
              />
            </div>
            <div>
              <CgFeedbackActions titleId={pick.id} redirectTo={redirectTo} />
            </div>
          </div>

          {pick.posterPath && (
            <div className="relative aspect-[2/3] w-[62vw] max-w-[300px] shrink-0 overflow-hidden rounded-[var(--cg-r-poster)] shadow-[0_40px_90px_rgba(2,6,14,.8)] lg:w-auto lg:max-w-none lg:h-[min(72vh,640px)]">
              <Image
                src={`${TMDB_POSTER_BASE_URL}${pick.posterPath}`}
                alt={pick.title}
                fill
                priority
                sizes="(min-width: 1024px) 430px, 62vw"
                className="object-cover"
              />
            </div>
          )}
        </section>

        <span className="px-1 text-[12px] text-[var(--cg-text-legal)]">
          Streaming availability data provided by JustWatch. © 2026 What To Watch Next.
        </span>
      </div>
    </div>
  );
}
