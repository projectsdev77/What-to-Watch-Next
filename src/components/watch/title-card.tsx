import Link from "next/link";
import Image from "next/image";
import { TMDB_POSTER_BASE_URL } from "@/lib/tmdb";
import type { RecommendedTitle } from "@/lib/recommendations";
import { FeedbackActions, WatchlistButton } from "@/components/watch/feedback-actions";
import { WatchNowButton } from "@/components/watch/watch-now-button";

export function TitleCard({
  title,
  redirectTo,
  featured = false,
  unrestricted = false,
}: {
  title: RecommendedTitle;
  redirectTo: string;
  featured?: boolean;
  // True when the user has no real platform preference (picked only
  // "Other") — title.platforms then lists everything available rather
  // than what the user actually subscribes to, so Watch Now shouldn't
  // offer a per-platform picker built from it.
  unrestricted?: boolean;
}) {
  if (featured) {
    return <FeaturedCard title={title} redirectTo={redirectTo} unrestricted={unrestricted} />;
  }

  return (
    <div className="flex flex-col gap-[10px] bg-card p-[11px] shadow-card">
      <Link href={`/title/${title.id}`} className="relative aspect-[2/3] w-full overflow-hidden bg-[rgba(12,35,52,.08)]">
        {title.posterPath && (
          <Image
            src={`${TMDB_POSTER_BASE_URL}${title.posterPath}`}
            alt={title.title}
            fill
            sizes="(max-width: 640px) 45vw, 220px"
            className="object-cover"
          />
        )}
      </Link>
      <div className="flex items-center gap-2">
        <Link href={`/title/${title.id}`} className="min-w-0 flex-1 hover:underline">
          <p className="truncate text-[13px] font-semibold">{title.title}</p>
        </Link>
        <span className="shrink-0 bg-mist px-2 py-[3px] text-[11px] font-bold text-ink">
          {title.matchPercent}%
        </span>
      </div>
      {title.platforms.length > 0 && (
        <p className="truncate text-[12px] text-text-3">{title.platforms.join(" · ")}</p>
      )}
    </div>
  );
}

function FeaturedCard({
  title,
  redirectTo,
  unrestricted,
}: {
  title: RecommendedTitle;
  redirectTo: string;
  unrestricted: boolean;
}) {
  // No 16:9 backdrop asset exists for arbitrary titles — the poster
  // itself, blurred and scaled behind the glass panel, stands in as
  // the "artwork behind the glass" the design system requires (real
  // image data, not a placeholder).
  return (
    <div className="relative flex min-h-[400px] items-end overflow-hidden p-[10px] sm:p-[22px]">
      {title.posterPath && (
        <Image
          src={`${TMDB_POSTER_BASE_URL}${title.posterPath}`}
          alt=""
          aria-hidden
          fill
          sizes="100vw"
          className="scale-125 object-cover blur-2xl brightness-75"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-r from-ink/35 to-steel/25" />

      <div className="glass-crystal relative flex w-full flex-col gap-[18px] p-6 sm:flex-row sm:gap-[26px]">
        <Link
          href={`/title/${title.id}`}
          className="relative mx-auto aspect-[2/3] w-[150px] shrink-0 overflow-hidden rounded-[14px] shadow-[0_16px_38px_rgba(12,35,52,.3)] sm:mx-0 sm:w-[180px]"
        >
          {title.posterPath && (
            <Image
              src={`${TMDB_POSTER_BASE_URL}${title.posterPath}`}
              alt={title.title}
              fill
              sizes="180px"
              className="object-cover"
            />
          )}
        </Link>

        <div className="flex min-w-0 flex-1 flex-col gap-[14px]">
          <div className="flex items-start gap-4">
            <div className="flex min-w-0 flex-col gap-[6px]">
              <span className="text-[12px] font-bold tracking-[.16em] text-text-2">TONIGHT&apos;S PICK</span>
              <Link href={`/title/${title.id}`} className="hover:underline">
                <h1 className="font-heading text-[28px] leading-[1.05] font-semibold tracking-[-.03em] sm:text-[38px]">
                  {title.title}
                </h1>
              </Link>
              {title.platforms.length > 0 && (
                <span className="text-[13.5px] font-semibold text-text-2">{title.platforms.join(" · ")}</span>
              )}
            </div>
            <span
              className="ml-auto shrink-0 bg-ink px-4 py-[9px] text-[13px] font-bold tracking-[.06em] text-white"
              aria-label={`${title.matchPercent}% match`}
            >
              {title.matchPercent}% MATCH
            </span>
          </div>

          <p className="max-w-[62ch] text-[14.5px] leading-[1.65] text-text-2">{title.why}</p>

          <div className="flex flex-wrap items-center gap-[11px] pt-0.5">
            <WatchNowButton
              matchingPlatforms={unrestricted ? [] : title.platforms}
              fallbackUrl={title.watchUrl}
            />
            <WatchlistButton titleId={title.id} redirectTo={redirectTo} isWatchlisted={title.isWatchlisted} />
          </div>
          <div className="pt-1">
            <FeedbackActions titleId={title.id} redirectTo={redirectTo} />
          </div>
        </div>
      </div>
    </div>
  );
}
