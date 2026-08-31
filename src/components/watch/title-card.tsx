import Link from "next/link";
import Image from "next/image";
import { TMDB_POSTER_BASE_URL } from "@/lib/tmdb";
import type { RecommendedTitle } from "@/lib/recommendations";
import { FeedbackActions } from "@/components/watch/feedback-actions";

export function TitleCard({
  title,
  redirectTo,
  featured = false,
}: {
  title: RecommendedTitle;
  redirectTo: string;
  featured?: boolean;
}) {
  return (
    <div
      className={
        featured
          ? "flex flex-col gap-4 rounded-lg border border-black/10 p-4 sm:flex-row dark:border-white/15"
          : "flex flex-col gap-2 rounded border border-black/10 p-2 dark:border-white/15"
      }
    >
      <Link
        href={`/title/${title.id}`}
        className={
          featured
            ? "relative aspect-[2/3] w-full shrink-0 overflow-hidden rounded bg-zinc-200 sm:w-48 dark:bg-zinc-800"
            : "relative aspect-[2/3] w-full overflow-hidden rounded bg-zinc-200 dark:bg-zinc-800"
        }
      >
        {title.posterPath && (
          <Image
            src={`${TMDB_POSTER_BASE_URL}${title.posterPath}`}
            alt={title.title}
            fill
            sizes={featured ? "192px" : "(max-width: 640px) 45vw, 220px"}
            className="object-cover"
          />
        )}
      </Link>

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <Link href={`/title/${title.id}`} className="min-w-0 hover:underline">
            <p className={featured ? "text-lg font-semibold" : "line-clamp-2 text-sm font-medium"}>{title.title}</p>
          </Link>
          <span className="shrink-0 rounded bg-emerald-600/20 px-2 py-0.5 text-xs font-medium text-emerald-500">
            {title.matchPercent}% match
          </span>
        </div>

        {title.platforms.length > 0 && <p className="text-xs text-zinc-500">{title.platforms.join(" · ")}</p>}

        <p className={featured ? "text-sm text-zinc-500" : "line-clamp-2 text-xs text-zinc-500"}>{title.why}</p>

        {featured && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <a
              href={title.watchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded bg-foreground px-4 py-2 text-sm text-background"
            >
              Watch Now
            </a>
            <FeedbackActions titleId={title.id} redirectTo={redirectTo} isWatchlisted={title.isWatchlisted} />
          </div>
        )}
      </div>
    </div>
  );
}
