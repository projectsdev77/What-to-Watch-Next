import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_REGION } from "@/lib/platforms";
import { TMDB_POSTER_BASE_URL } from "@/lib/tmdb";
import { AppHeader } from "@/components/chrome/app-header";
import { createWatchlistAction, deleteWatchlistAction, removeFromListAction } from "./actions";

interface WatchlistItemTitle {
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

  const [{ data: lists }, { data: itemRows }] = await Promise.all([
    supabase.from("watchlists").select("id, name, created_at").eq("user_id", user.id).order("created_at"),
    supabase
      .from("watchlist_items")
      .select("watchlist_id, titles(id, title, poster_path)")
      .eq("user_id", user.id),
  ]);

  const itemsByListId = new Map<number, WatchlistItemTitle[]>();
  const allTitleIds: number[] = [];
  for (const row of itemRows ?? []) {
    const listId = row.watchlist_id as number;
    const title = row.titles as unknown as WatchlistItemTitle | null;
    if (!title) continue;
    const list = itemsByListId.get(listId) ?? [];
    list.push(title);
    itemsByListId.set(listId, list);
    allTitleIds.push(title.id);
  }

  const { data: availabilityRows } =
    allTitleIds.length > 0
      ? await supabase
          .from("title_availability")
          .select("title_id, platform_name")
          .eq("region", DEFAULT_REGION)
          .in("title_id", allTitleIds)
      : { data: [] };

  const platformsByTitleId = new Map<number, string[]>();
  for (const row of availabilityRows ?? []) {
    const list = platformsByTitleId.get(row.title_id as number) ?? [];
    list.push(row.platform_name as string);
    platformsByTitleId.set(row.title_id as number, list);
  }

  const totalSaved = allTitleIds.length;

  return (
    <div className="flex flex-1 flex-col bg-sky">
      <AppHeader active="/watchlist" />
      <main className="mx-auto w-full max-w-[1000px] flex-1 px-4 py-9 sm:px-10">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div className="flex items-baseline gap-4">
            <h1 className="font-heading text-[22px] font-semibold tracking-[.2em]">WATCHLISTS</h1>
            <span className="text-[13.5px] text-text-2">{totalSaved} saved</span>
          </div>
          <form action={createWatchlistAction} className="flex gap-[8px]">
            <input
              type="text"
              name="name"
              placeholder="New list name"
              required
              className="border border-[rgba(12,35,52,.24)] bg-card px-3 py-2.5 text-[13.5px] text-text-1"
            />
            <button type="submit" className="bg-ink px-5 py-2.5 text-[12px] font-bold tracking-[.1em] text-white">
              + NEW LIST
            </button>
          </form>
        </div>

        {!lists || lists.length === 0 ? (
          <div className="flex w-full max-w-[560px] flex-col items-start gap-4 bg-card p-9 shadow-card">
            <h2 className="font-heading text-[20px] font-semibold tracking-[.18em]">NOTHING SAVED YET</h2>
            <p className="max-w-[48ch] text-[15px] leading-[1.7] text-text-2">
              Hit Watchlist on any title, or make a named list above (like &quot;Weekend Watches&quot;) and start
              adding to it.
            </p>
            <Link href="/" className="bg-ink px-[26px] py-[13px] text-[12.5px] font-bold tracking-[.12em] text-white">
              GO TO TONIGHT&apos;S PICK
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            {lists.map((list) => {
              const items = itemsByListId.get(list.id as number) ?? [];
              return (
                <section key={list.id} className="flex flex-col gap-3">
                  <div className="flex items-baseline gap-4">
                    <h2 className="font-heading text-[16px] font-semibold tracking-[.14em]">
                      {(list.name as string).toUpperCase()}
                    </h2>
                    <span className="text-[13px] text-text-3">{items.length}</span>
                    <div className="h-[2px] flex-1 bg-steel" />
                    <form action={deleteWatchlistAction}>
                      <input type="hidden" name="watchlistId" value={list.id} />
                      <button type="submit" className="text-[12px] font-semibold text-danger-ink underline">
                        DELETE LIST
                      </button>
                    </form>
                  </div>

                  {items.length === 0 ? (
                    <p className="text-[13.5px] text-text-2">Nothing in this list yet.</p>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {items.map((title) => (
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
                              <span className="font-heading text-[20px] font-semibold tracking-[-.02em]">
                                {title.title}
                              </span>
                            </Link>
                            <p className="truncate text-[13px] text-text-2">
                              {(platformsByTitleId.get(title.id) ?? []).join(" · ") ||
                                "Not currently available on your platforms"}
                            </p>
                          </div>
                          <form action={removeFromListAction} className="ml-auto shrink-0">
                            <input type="hidden" name="watchlistId" value={list.id} />
                            <input type="hidden" name="titleId" value={title.id} />
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
                </section>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
