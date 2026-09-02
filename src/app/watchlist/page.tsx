import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_REGION } from "@/lib/platforms";
import { TMDB_POSTER_BASE_URL } from "@/lib/tmdb";
import { removeFeedbackAction } from "@/app/actions";
import { AppHeader } from "@/components/chrome/app-header";

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
    <div className="flex flex-1 flex-col bg-sky">
      <AppHeader active="/watchlist" />
      <main className="mx-auto w-full max-w-[1000px] flex-1 px-4 py-9 sm:px-10">
        {titles.length === 0 ? (
          <div className="flex w-full max-w-[560px] flex-col items-start gap-4 bg-card p-9 shadow-card">
            <h1 className="font-heading text-[20px] font-semibold tracking-[.18em]">NOTHING SAVED YET</h1>
            <p className="max-w-[48ch] text-[15px] leading-[1.7] text-text-2">
              Hit Watchlist on any title and it lands here. Tonight&apos;s pick skips anything you&apos;ve already
              watched.
            </p>
            <Link href="/" className="bg-ink px-[26px] py-[13px] text-[12.5px] font-bold tracking-[.12em] text-white">
              GO TO TONIGHT&apos;S PICK
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="mb-1 flex items-baseline gap-4">
              <h1 className="font-heading text-[22px] font-semibold tracking-[.2em]">WATCHLIST</h1>
              <span className="text-[13.5px] text-text-2">{titles.length} saved</span>
              <div className="h-[2px] flex-1 bg-steel" />
            </div>
            {titles.map((title) => (
              <div key={title.id} className="flex items-center gap-5 bg-card p-4 shadow-card">
                <Link
                  href={`/title/${title.id}`}
                  className="relative h-[104px] w-[74px] shrink-0 overflow-hidden bg-[rgba(12,35,52,.08)]"
                >
                  {title.poster_path && (
                    <Image
                      src={`${TMDB_POSTER_BASE_URL}${title.poster_path}`}
                      alt={title.title}
                      fill
                      sizes="74px"
                      className="object-cover"
                    />
                  )}
                </Link>
                <div className="min-w-0 flex-1">
                  <Link href={`/title/${title.id}`} className="block truncate hover:underline">
                    <span className="font-heading text-[20px] font-semibold tracking-[-.02em]">{title.title}</span>
                  </Link>
                  <p className="truncate text-[13px] text-text-2">
                    {(platformsByTitleId.get(title.id) ?? []).join(" · ") ||
                      "Not currently available on your platforms"}
                  </p>
                </div>
                <form action={removeFeedbackAction} className="ml-auto shrink-0">
                  <input type="hidden" name="titleId" value={title.id} />
                  <input type="hidden" name="redirectTo" value="/watchlist" />
                  <button
                    type="submit"
                    className="border border-[rgba(12,35,52,.28)] px-[22px] py-3 text-[12.5px] font-bold tracking-[.1em]"
                  >
                    REMOVE
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
