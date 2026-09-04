import { notFound, redirect } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { genreName } from "@/lib/genres";
import { DEFAULT_REGION, NO_PREFERENCE_PLATFORM } from "@/lib/platforms";
import { TMDB_BACKDROP_BASE_URL, TMDB_POSTER_BASE_URL, tmdbTitleUrl } from "@/lib/tmdb";
import { CgNavPill } from "@/components/chrome/cg-nav-pill";
import { CgWatchNowButton } from "@/components/watch/cg-watch-now-button";
import { CgWatchlistButton, CgFeedbackActions } from "@/components/watch/cg-feedback-actions";

export default async function TitleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const titleId = Number(id);
  if (!titleId) notFound();

  const [
    { data: title },
    { data: availabilityRows },
    { data: feedback },
    { data: userPlatformRows },
    { data: watchlistRows },
    { data: lists },
  ] = await Promise.all([
    supabase
      .from("titles")
      .select(
        "id, tmdb_id, media_type, title, overview, poster_path, genre_ids, cast_names, vote_average, justwatch_link, imdb_rating, rotten_tomatoes_rating"
      )
      .eq("id", titleId)
      .maybeSingle(),
    supabase
      .from("title_availability")
      .select("platform_name")
      .eq("title_id", titleId)
      .eq("region", DEFAULT_REGION),
    supabase
      .from("user_title_feedback")
      .select("status")
      .eq("user_id", user.id)
      .eq("title_id", titleId)
      .maybeSingle(),
    supabase.from("user_platforms").select("platform_name").eq("user_id", user.id),
    supabase.from("watchlist_items").select("title_id").eq("user_id", user.id).eq("title_id", titleId).limit(1),
    supabase.from("watchlists").select("id, name").eq("user_id", user.id).order("created_at"),
  ]);

  if (!title) notFound();

  const platforms = [...new Set((availabilityRows ?? []).map((r) => r.platform_name as string))];
  const redirectTo = `/title/${titleId}`;
  const isWatchlisted = (watchlistRows ?? []).length > 0;

  // "Other" isn't a real platform to build a Watch Now picker from —
  // when that's all the user picked, there's nothing to filter to, so
  // fall back to the generic combined link (same as recommendations.ts's
  // unrestricted mode).
  const userRealPlatforms = (userPlatformRows ?? [])
    .map((p) => p.platform_name as string)
    .filter((p) => p !== NO_PREFERENCE_PLATFORM);
  const matchingPlatforms =
    userRealPlatforms.length === 0 ? [] : platforms.filter((p) => userRealPlatforms.includes(p));

  const chipCls = "rounded-full border border-white/20 bg-white/12 px-[15px] py-[7px] text-[12.5px] font-semibold backdrop-blur-[20px]";

  return (
    <div className="cg-screen relative min-h-screen overflow-hidden bg-[var(--cg-ground-alt)] font-sans text-[var(--cg-text-1)]">
      {title.poster_path && (
        <div className="absolute inset-x-0 top-0 h-[52%] opacity-60">
          <Image
            src={`${TMDB_BACKDROP_BASE_URL}${title.poster_path}`}
            alt=""
            aria-hidden
            fill
            sizes="100vw"
            className="object-cover"
          />
        </div>
      )}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(6,11,20,.7)_0%,rgba(6,11,20,.94)_34%,#080F1B_58%)]" />

      <div className="relative mx-auto flex min-h-screen max-w-[1280px] flex-col justify-center gap-6 p-[22px] pb-16">
        <CgNavPill />

        <div className="cg-pane flex flex-col gap-[18px] p-6 sm:flex-row sm:gap-[26px]">
          <div className="relative mx-auto aspect-[2/3] w-[190px] shrink-0 overflow-hidden rounded-[var(--cg-r-poster)] shadow-[0_28px_60px_rgba(2,6,14,.75)] sm:mx-0 sm:w-[230px]">
            {title.poster_path && (
              <Image
                src={`${TMDB_POSTER_BASE_URL}${title.poster_path}`}
                alt={title.title}
                fill
                sizes="230px"
                className="object-cover"
              />
            )}
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-[14px]">
            <div className="flex flex-col gap-[10px]">
              <h1 className="font-heading text-[28px] leading-[1.05] font-bold tracking-[-.03em] text-balance sm:text-[36px]">
                {title.title}
              </h1>
              <div className="flex flex-wrap items-center gap-[9px]">
                {(title.genre_ids as number[]).map((gid) => (
                  <span key={gid} className={chipCls}>
                    {genreName(gid)}
                  </span>
                ))}
                {title.vote_average != null && (
                  <span className="text-[13px] font-semibold text-[var(--cg-text-2)]">
                    ★ {title.vote_average.toFixed(1)}
                  </span>
                )}
                {title.imdb_rating != null && (
                  <span className="text-[13px] font-semibold text-[var(--cg-text-2)]">
                    IMDb {Number(title.imdb_rating).toFixed(1)}
                  </span>
                )}
                {title.rotten_tomatoes_rating && (
                  <span className="text-[13px] font-semibold text-[var(--cg-text-2)]">
                    🍅 {title.rotten_tomatoes_rating}
                  </span>
                )}
              </div>
              {platforms.length > 0 && (
                <span className="text-[13.5px] font-semibold text-[var(--cg-text-2)]">{platforms.join(" · ")}</span>
              )}
            </div>

            {title.overview && (
              <p className="max-w-[75ch] text-[14.5px] leading-[1.65] text-[var(--cg-text-2)]">{title.overview}</p>
            )}

            {title.cast_names && (title.cast_names as string[]).length > 0 && (
              <p className="text-[13.5px] text-[var(--cg-text-2)]">
                <span className="text-[var(--cg-text-3)]">Cast: </span>
                {(title.cast_names as string[]).join(", ")}
              </p>
            )}

            {feedback?.status && (
              <p className="text-[12px] font-semibold tracking-[.08em] text-[var(--cg-text-3)] uppercase">
                Your status: {feedback.status}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-[11px] pt-0.5">
              <CgWatchNowButton
                titleId={title.id}
                redirectTo={redirectTo}
                matchingPlatforms={matchingPlatforms}
                fallbackUrl={title.justwatch_link ?? tmdbTitleUrl(title.media_type, title.tmdb_id)}
              />
              <CgWatchlistButton
                titleId={title.id}
                redirectTo={redirectTo}
                isWatchlisted={isWatchlisted}
                lists={lists ?? []}
              />
            </div>
            <CgFeedbackActions titleId={title.id} redirectTo={redirectTo} />
          </div>
        </div>

        <span className="px-1 text-[12px] text-[var(--cg-text-legal)]">
          Streaming availability data provided by JustWatch. © 2026 What To Watch Next.
        </span>
      </div>
    </div>
  );
}
