import type { ReactNode } from "react";
import Image from "next/image";
import { genreName } from "@/lib/genres";
import { TMDB_BACKDROP_BASE_URL, TMDB_POSTER_BASE_URL, type MediaType, type PickMedia } from "@/lib/tmdb";
import type { RecommendedTitle } from "@/lib/recommendations";
import { CgNavPill } from "@/components/chrome/cg-nav-pill";
import { CgMediaTypeTabs } from "@/components/chrome/cg-media-type-tabs";
import { CgWatchNowButton } from "@/components/watch/cg-watch-now-button";
import { CgFeedbackActions } from "@/components/watch/cg-feedback-actions";
import { CgTrailerPreview } from "@/components/watch/cg-trailer-preview";

/** Huge Anton title, stepped down for longer titles so it stays within ~3
 * lines and clear of the trailer card. On desktop it also scales with the
 * window height, so the whole pick fits on a laptop screen. */
function titleSizeClass(title: string) {
  if (title.length <= 16) {
    return "text-[64px] sm:text-[96px] lg:text-[min(150px,18vh)] min-[1201px]:text-[min(200px,22vh)]";
  }
  if (title.length <= 30) {
    return "text-[52px] sm:text-[80px] lg:text-[min(124px,15vh)] min-[1201px]:text-[min(150px,17vh)]";
  }
  return "text-[44px] sm:text-[64px] lg:text-[min(100px,12vh)] min-[1201px]:text-[min(124px,14vh)]";
}

/** Tonight's Pick, full screen ("6a — Immersive, top nav" handoff): the
 * title's wide backdrop fills the right of the screen behind dark scrims,
 * with a huge title and the actions bottom-left and the trailer card
 * bottom-right. On phones the art fills the top of the screen and
 * everything stacks below it. */
export function CgTonightsPickHero({
  pick,
  media,
  mediaType,
  unrestricted,
  matchingPlatforms,
  redirectTo,
  banner,
}: {
  pick: RecommendedTitle;
  media: PickMedia;
  mediaType: MediaType;
  unrestricted: boolean;
  matchingPlatforms: string[];
  redirectTo: string;
  banner?: ReactNode;
}) {
  const genres = pick.genreIds.slice(0, 3).map((id) => genreName(id).toUpperCase());
  const meta = [pick.mediaType === "tv" ? "TV SHOW" : "MOVIE", ...genres].join(" · ");

  return (
    <div className="cg-screen relative flex min-h-screen flex-col overflow-hidden bg-[var(--cg-ground)] font-sans text-[var(--cg-text-1)]">
      {/* Key art: the sharp 16:9 backdrop when TMDB has one. Without it,
          a blurred copy of the portrait poster fills the screen instead —
          a sharp portrait poster would crop badly at this size. */}
      <div
        key={pick.id}
        className="cg-art-in absolute inset-x-0 top-0 h-[55vh] lg:inset-y-0 lg:right-0 lg:left-auto lg:h-auto lg:w-[78%]"
      >
        {media.backdropPath ? (
          <Image
            src={`${TMDB_BACKDROP_BASE_URL}${media.backdropPath}`}
            alt=""
            aria-hidden
            fill
            priority
            sizes="(min-width: 1024px) 78vw, 100vw"
            className="object-cover object-[50%_22%]"
          />
        ) : (
          pick.posterPath && (
            <div className="absolute inset-0 scale-110 opacity-60 blur-[40px]">
              <Image src={`${TMDB_POSTER_BASE_URL}${pick.posterPath}`} alt="" aria-hidden fill sizes="100vw" className="object-cover" />
            </div>
          )
        )}
        {/* Phones: fade the art into the ground where the content starts. */}
        <div className="absolute inset-0 bg-[linear-gradient(0deg,#060B14_0%,rgba(6,11,20,.55)_35%,rgba(6,11,20,0)_65%)] lg:hidden" />
      </div>

      {/* Scrims: left-to-right and bottom for the text, top for the nav. */}
      <div className="absolute inset-0 hidden bg-[linear-gradient(90deg,#060B14_0%,#060B14_22%,rgba(6,11,20,.7)_42%,rgba(6,11,20,.05)_70%)] lg:block" />
      <div className="absolute inset-0 hidden bg-[linear-gradient(0deg,rgba(6,11,20,.95)_0%,rgba(6,11,20,0)_42%)] lg:block" />
      <div className="absolute inset-x-0 top-0 h-[160px] bg-[linear-gradient(180deg,rgba(6,11,20,.55)_0%,rgba(6,11,20,0)_100%)]" />

      <div className="relative flex flex-1 flex-col px-4 pt-4 pb-6 sm:px-6 lg:px-[28px] lg:pt-[24px] lg:pb-[48px]">
        <CgNavPill
          active="/"
          immersive
          slot={<CgMediaTypeTabs active={mediaType} basePath="/" variant="segmented" />}
        />
        <div className="mt-3 self-start rounded-full bg-[rgba(6,11,20,.45)] backdrop-blur-[24px] lg:hidden">
          <CgMediaTypeTabs active={mediaType} basePath="/" variant="segmented" />
        </div>
        {banner && <div className="mt-3 max-w-[720px]">{banner}</div>}

        {/* Pushes the pick to the bottom of the screen on desktop, and to
            where the art fades out on phones. */}
        <div className="min-h-[22vh] flex-1 lg:min-h-[40px]" />

        <div
          key={pick.id}
          className="cg-content-in flex flex-col gap-8 lg:flex-row lg:items-end lg:gap-12 lg:pr-[28px] lg:pl-[44px]"
        >
          <div className="flex min-w-0 flex-1 flex-col gap-[22px]">
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] font-bold tracking-[.16em] sm:text-[13px]">
              <span className="text-[var(--cg-accent)]">TONIGHT&apos;S PICK</span>
              <span className="text-white/85">{meta}</span>
              <span className="text-white/85">{pick.matchPercent}% MATCH</span>
            </div>
            <h1
              className={`font-display leading-[.88] text-balance break-words uppercase ${titleSizeClass(pick.title)}`}
            >
              {pick.title}
            </h1>
            {pick.overview && (
              <p className="line-clamp-4 max-w-[54ch] text-[16px] leading-[1.6] text-[rgba(234,242,250,.84)] sm:text-[16.5px] lg:line-clamp-3">
                {pick.overview}
              </p>
            )}
            <p className="max-w-[54ch] text-[16px] leading-[1.5] font-semibold sm:text-[16.5px]">{pick.why}</p>
            {/* With a real platform selection, each platform has its own
                watch button below; only list them in unrestricted mode,
                where there are no per-platform buttons. */}
            {unrestricted && pick.platforms.length > 0 && (
              <p className="text-[13px] text-white/85">On {pick.platforms.join(", ")}</p>
            )}

            <div className="flex flex-col items-stretch gap-[26px] pt-1 sm:items-start">
              <div className="flex flex-col gap-[10px] sm:flex-row sm:flex-wrap sm:items-center">
                <CgWatchNowButton
                  title={pick.title}
                  titleId={pick.id}
                  redirectTo={redirectTo}
                  matchingPlatforms={matchingPlatforms}
                  platformLinks={pick.platformLinks}
                  fallbackUrl={pick.watchUrl}
                  variant="hero"
                />
              </div>
              <div className="flex flex-col gap-3 border-t border-white/14 pt-5 sm:flex-row sm:items-center sm:gap-4">
                <span className="text-[12px] font-bold tracking-[.16em] text-white/70">NOT TONIGHT?</span>
                <CgFeedbackActions titleId={pick.id} redirectTo={redirectTo} quiet />
              </div>
            </div>
          </div>

          {/* Phones/tablets: a card above the content (full width on phones). */}
          <div
            className={`order-first w-full shrink-0 flex-col gap-[10px] sm:max-w-[520px] lg:order-none lg:max-w-none lg:flex ${media.trailerKey ? "flex" : "hidden"} lg:w-[320px] min-[1201px]:w-[380px]`}
          >
            {media.trailerKey && <CgTrailerPreview youtubeKey={media.trailerKey} title={pick.title} />}
            <span className="hidden text-right text-[11.5px] text-[rgba(234,242,250,.55)] lg:block">
              Data by JustWatch · © 2026 What To Watch Next
            </span>
          </div>
        </div>

        <span className="mt-8 text-[11.5px] text-[rgba(234,242,250,.55)] lg:hidden">
          Data by JustWatch · © 2026 What To Watch Next
        </span>
      </div>
    </div>
  );
}
