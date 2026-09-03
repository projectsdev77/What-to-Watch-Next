import { notFound, redirect } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { genreName } from "@/lib/genres";
import { DEFAULT_REGION, NO_PREFERENCE_PLATFORM } from "@/lib/platforms";
import { TMDB_POSTER_BASE_URL, tmdbTitleUrl } from "@/lib/tmdb";
import { FeedbackActions, WatchlistButton } from "@/components/watch/feedback-actions";
import { WatchNowButton } from "@/components/watch/watch-now-button";
import { AppHeader } from "@/components/chrome/app-header";

export default async function TitleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const titleId = Number(id);
  if (!titleId) notFound();

  const [{ data: title }, { data: availabilityRows }, { data: feedback }, { data: userPlatformRows }, { data: watchlistRows }] =
    await Promise.all([
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

  return (
    <div className="flex flex-1 flex-col bg-sky">
      <AppHeader />
      <main className="mx-auto w-full max-w-[1000px] flex-1 px-4 py-8 sm:px-10 sm:py-10">
        <div className="relative overflow-hidden p-[10px] sm:p-[22px]">
          {title.poster_path && (
            <Image
              src={`${TMDB_POSTER_BASE_URL}${title.poster_path}`}
              alt=""
              aria-hidden
              fill
              sizes="100vw"
              className="scale-125 object-cover blur-2xl brightness-75"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-ink/35 to-steel/25" />

          <div className="glass-crystal relative flex flex-col gap-[18px] p-6 sm:flex-row sm:gap-[26px]">
            <div className="relative mx-auto aspect-[2/3] w-[150px] shrink-0 overflow-hidden rounded-[14px] shadow-[0_16px_38px_rgba(12,35,52,.3)] sm:mx-0 sm:w-[190px]">
              {title.poster_path && (
                <Image
                  src={`${TMDB_POSTER_BASE_URL}${title.poster_path}`}
                  alt={title.title}
                  fill
                  sizes="190px"
                  className="object-cover"
                />
              )}
            </div>

            <div className="flex min-w-0 flex-1 flex-col gap-[14px]">
              <div className="flex flex-col gap-[8px]">
                <h1 className="font-heading text-[28px] leading-[1.05] font-semibold tracking-[-.03em] sm:text-[36px]">
                  {title.title}
                </h1>
                <div className="flex flex-wrap items-center gap-[9px] text-[13px] font-semibold text-text-2">
                  {(title.genre_ids as number[]).map((gid) => (
                    <span key={gid} className="bg-white/55 px-[9px] py-[3px] text-[11.5px] font-semibold">
                      {genreName(gid)}
                    </span>
                  ))}
                  {title.vote_average != null && <span>★ {title.vote_average.toFixed(1)}</span>}
                  {title.imdb_rating != null && <span>IMDb {Number(title.imdb_rating).toFixed(1)}</span>}
                  {title.rotten_tomatoes_rating && <span>🍅 {title.rotten_tomatoes_rating}</span>}
                </div>
                {platforms.length > 0 && (
                  <span className="text-[13.5px] font-semibold text-text-2">{platforms.join(" · ")}</span>
                )}
              </div>

              {title.overview && (
                <p className="max-w-[62ch] text-[14.5px] leading-[1.65] text-text-2">{title.overview}</p>
              )}

              {title.cast_names && (title.cast_names as string[]).length > 0 && (
                <p className="text-[13.5px] text-text-2">
                  <span className="text-text-3">Cast: </span>
                  {(title.cast_names as string[]).join(", ")}
                </p>
              )}

              {feedback?.status && (
                <p className="text-[12px] font-semibold tracking-[.08em] text-text-3 uppercase">
                  Your status: {feedback.status}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-[11px] pt-0.5">
                <WatchNowButton
                  titleId={title.id}
                  redirectTo={redirectTo}
                  matchingPlatforms={matchingPlatforms}
                  fallbackUrl={title.justwatch_link ?? tmdbTitleUrl(title.media_type, title.tmdb_id)}
                />
                <WatchlistButton titleId={title.id} redirectTo={redirectTo} isWatchlisted={isWatchlisted} />
              </div>
              <FeedbackActions titleId={title.id} redirectTo={redirectTo} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
