import { notFound, redirect } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { genreName } from "@/lib/genres";
import { DEFAULT_REGION } from "@/lib/platforms";
import { TMDB_POSTER_BASE_URL, tmdbTitleUrl } from "@/lib/tmdb";
import { FeedbackActions } from "@/components/watch/feedback-actions";

export default async function TitleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const titleId = Number(id);
  if (!titleId) notFound();

  const [{ data: title }, { data: availabilityRows }, { data: feedback }] = await Promise.all([
    supabase
      .from("titles")
      .select("id, tmdb_id, media_type, title, overview, poster_path, genre_ids, cast_names, vote_average")
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
  ]);

  if (!title) notFound();

  const platforms = [...new Set((availabilityRows ?? []).map((r) => r.platform_name as string))];
  const redirectTo = `/title/${titleId}`;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-12 sm:flex-row">
      <div className="relative aspect-[2/3] w-full shrink-0 overflow-hidden rounded bg-zinc-200 sm:w-64 dark:bg-zinc-800">
        {title.poster_path && (
          <Image
            src={`${TMDB_POSTER_BASE_URL}${title.poster_path}`}
            alt={title.title}
            fill
            sizes="256px"
            className="object-cover"
          />
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3">
        <h1 className="text-2xl font-semibold">{title.title}</h1>

        <div className="flex flex-wrap gap-2 text-xs text-zinc-500">
          {(title.genre_ids as number[]).map((gid) => (
            <span key={gid} className="rounded bg-zinc-200 px-2 py-0.5 dark:bg-zinc-800">
              {genreName(gid)}
            </span>
          ))}
          {title.vote_average != null && <span>★ {title.vote_average.toFixed(1)}</span>}
        </div>

        {platforms.length > 0 && (
          <p className="text-sm text-zinc-500">Available on {platforms.join(" · ")}</p>
        )}

        {title.overview && <p className="text-sm text-zinc-400">{title.overview}</p>}

        {title.cast_names && (title.cast_names as string[]).length > 0 && (
          <p className="text-sm text-zinc-500">
            <span className="text-zinc-400">Cast: </span>
            {(title.cast_names as string[]).join(", ")}
          </p>
        )}

        {feedback?.status && (
          <p className="text-xs text-zinc-500">
            Your status: <span className="font-medium">{feedback.status}</span>
          </p>
        )}

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <a
            href={tmdbTitleUrl(title.media_type, title.tmdb_id)}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded bg-foreground px-4 py-2 text-sm text-background"
          >
            Watch Now
          </a>
          <FeedbackActions
            titleId={title.id}
            redirectTo={redirectTo}
            isWatchlisted={feedback?.status === "watchlisted"}
          />
        </div>
      </div>
    </main>
  );
}
