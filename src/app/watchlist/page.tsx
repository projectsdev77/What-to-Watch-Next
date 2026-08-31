import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_REGION } from "@/lib/platforms";
import { TMDB_POSTER_BASE_URL } from "@/lib/tmdb";
import { removeFeedbackAction } from "@/app/actions";

interface WatchlistTitle {
  id: number;
  title: string;
  poster_path: string | null;
}

export default async function WatchlistPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: feedbackRows } = await supabase
    .from("user_title_feedback")
    .select("titles(id, title, poster_path)")
    .eq("user_id", user.id)
    .eq("status", "watchlisted");

  const titles = (feedbackRows ?? [])
    .map((row) => row.titles as unknown as WatchlistTitle | null)
    .filter((t): t is WatchlistTitle => t !== null);

  const titleIds = titles.map((t) => t.id);
  const { data: availabilityRows } =
    titleIds.length > 0
      ? await supabase
          .from("title_availability")
          .select("title_id, platform_name")
          .eq("region", DEFAULT_REGION)
          .in("title_id", titleIds)
      : { data: [] };

  const platformsByTitleId = new Map<number, string[]>();
  for (const row of availabilityRows ?? []) {
    const list = platformsByTitleId.get(row.title_id as number) ?? [];
    list.push(row.platform_name as string);
    platformsByTitleId.set(row.title_id as number, list);
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-12">
      <h1 className="text-2xl font-semibold">Watchlist</h1>

      {titles.length === 0 ? (
        <p className="text-sm text-zinc-500">
          Nothing here yet — add titles from <Link href="/browse" className="underline">Browse</Link> or Tonight&apos;s
          Pick.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {titles.map((title) => (
            <div
              key={title.id}
              className="flex items-center gap-4 rounded border border-black/10 p-3 dark:border-white/15"
            >
              <Link href={`/title/${title.id}`} className="relative h-24 w-16 shrink-0 overflow-hidden rounded bg-zinc-200 dark:bg-zinc-800">
                {title.poster_path && (
                  <Image
                    src={`${TMDB_POSTER_BASE_URL}${title.poster_path}`}
                    alt={title.title}
                    fill
                    sizes="64px"
                    className="object-cover"
                  />
                )}
              </Link>
              <div className="flex-1">
                <Link href={`/title/${title.id}`} className="font-medium hover:underline">
                  {title.title}
                </Link>
                <p className="text-xs text-zinc-500">
                  {(platformsByTitleId.get(title.id) ?? []).join(" · ") || "Not currently available on your platforms"}
                </p>
              </div>
              <form action={removeFeedbackAction}>
                <input type="hidden" name="titleId" value={title.id} />
                <input type="hidden" name="redirectTo" value="/watchlist" />
                <button type="submit" className="text-sm text-zinc-500 underline">
                  Remove
                </button>
              </form>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
