import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_REGION } from "@/lib/platforms";
import { TMDB_BACKDROP_BASE_URL, TMDB_POSTER_BASE_URL } from "@/lib/tmdb";
import { CgNavPill } from "@/components/chrome/cg-nav-pill";
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
  const ambientPoster =
    (itemRows ?? [])
      .map((r) => (r.titles as unknown as WatchlistItemTitle | null)?.poster_path)
      .find((path): path is string => Boolean(path)) ?? null;

  return (
    <div className="cg-screen relative min-h-screen overflow-hidden bg-[var(--cg-ground-alt)] font-sans text-[var(--cg-text-1)]">
      {ambientPoster && (
        <div className="absolute inset-x-0 top-0 h-[36%] opacity-45">
          <Image
            src={`${TMDB_BACKDROP_BASE_URL}${ambientPoster}`}
            alt=""
            aria-hidden
            fill
            sizes="100vw"
            className="object-cover"
          />
        </div>
      )}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(6,11,20,.75)_0%,rgba(6,11,20,.96)_30%,#070D18_52%)]" />

      <div className="relative mx-auto flex max-w-[1280px] flex-col gap-6 p-[22px] pb-16">
        <CgNavPill active="/watchlist" />

        <div className="flex flex-wrap items-end gap-4 px-2 pt-1">
          <span className="font-heading text-[38px] font-bold tracking-[-.035em]">Watchlists</span>
          <span className="pb-2 text-[13.5px] text-[var(--cg-text-3)]">{totalSaved} saved</span>
          <form action={createWatchlistAction} className="ml-auto flex items-center gap-[10px]">
            <input
              type="text"
              name="name"
              placeholder="New list name"
              required
              className="min-w-[210px] rounded-full border border-white/16 bg-white/7 px-[20px] py-[12px] text-[13px] text-[var(--cg-text-1)] placeholder:text-[var(--cg-text-3)]"
            />
            <button
              type="submit"
              className="rounded-full bg-[var(--cg-primary)] px-[26px] py-[13px] text-[12px] font-bold tracking-[.09em] text-[var(--cg-on-primary)]"
            >
              + NEW LIST
            </button>
          </form>
        </div>

        {!lists || lists.length === 0 ? (
          <div className="cg-pane flex w-full max-w-[560px] flex-col items-start gap-4 p-9">
            <h2 className="font-heading text-[20px] font-semibold tracking-[.18em]">NOTHING SAVED YET</h2>
            <p className="max-w-[48ch] text-[15px] leading-[1.7] text-[var(--cg-text-2)]">
              Hit Watchlist on any title, or make a named list above (like &quot;Weekend Watches&quot;) and start
              adding to it.
            </p>
            <Link
              href="/"
              className="rounded-full bg-[var(--cg-primary)] px-[26px] py-[13px] text-[12.5px] font-bold tracking-[.12em] text-[var(--cg-on-primary)]"
            >
              GO TO TONIGHT&apos;S PICK
            </Link>
          </div>
        ) : (
          <div className="cg-pane flex flex-col gap-[28px] p-[26px]">
            {lists.map((list) => {
              const items = itemsByListId.get(list.id as number) ?? [];
              return (
                <section key={list.id} className="flex flex-col gap-[14px]">
                  <div className="flex items-center gap-[14px]">
                    <span className="font-heading text-[17px] font-semibold tracking-[.06em] uppercase">
                      {list.name as string}
                    </span>
                    <span className="rounded-full bg-white/10 px-[10px] py-[3px] text-[11.5px] font-semibold">
                      {items.length}
                    </span>
                    <div className="h-px flex-1 bg-white/10" />
                    <form action={deleteWatchlistAction}>
                      <input type="hidden" name="watchlistId" value={list.id} />
                      <button
                        type="submit"
                        className="text-[11.5px] font-bold tracking-[.09em] text-[var(--cg-danger)]"
                      >
                        DELETE LIST
                      </button>
                    </form>
                  </div>

                  {items.length === 0 ? (
                    <div className="flex items-center justify-center rounded-[var(--cg-r-row)] border border-dashed border-white/16 bg-white/3 p-7">
                      <span className="text-[13.5px] text-[var(--cg-text-3)]">Nothing in this list yet.</span>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-[11px]">
                      {items.map((title) => (
                        <div key={title.id} className="cg-row flex items-center gap-[18px] p-[13px]">
                          <Link
                            href={`/title/${title.id}`}
                            className="relative h-[92px] w-[62px] shrink-0 overflow-hidden rounded-[var(--cg-r-input)] shadow-[0_12px_26px_rgba(2,6,14,.55)]"
                          >
                            {title.poster_path && (
                              <Image
                                src={`${TMDB_POSTER_BASE_URL}${title.poster_path}`}
                                alt={title.title}
                                fill
                                sizes="62px"
                                className="object-cover"
                              />
                            )}
                          </Link>
                          <div className="min-w-0 flex-1">
                            <Link href={`/title/${title.id}`} className="block truncate hover:underline">
                              <span className="font-heading text-[19px] font-semibold tracking-[-.025em]">
                                {title.title}
                              </span>
                            </Link>
                            <p className="truncate text-[12.5px] text-[var(--cg-text-3)]">
                              {(platformsByTitleId.get(title.id) ?? []).join(" · ") ||
                                "Not currently available on your platforms"}
                            </p>
                          </div>
                          <form action={removeFromListAction} className="ml-auto shrink-0">
                            <input type="hidden" name="watchlistId" value={list.id} />
                            <input type="hidden" name="titleId" value={title.id} />
                            <button
                              type="submit"
                              className="rounded-full border border-white/18 bg-white/8 px-[24px] py-[12px] text-[12px] font-semibold tracking-[.08em]"
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

        <span className="px-1 pt-1 text-[12px] text-[var(--cg-text-legal)]">
          Streaming availability data provided by JustWatch. © 2026 What To Watch Next.
        </span>
      </div>
    </div>
  );
}
