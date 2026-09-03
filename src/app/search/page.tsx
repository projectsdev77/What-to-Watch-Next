import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/chrome/app-header";
import { TMDB_POSTER_BASE_URL, searchMulti, type MediaType } from "@/lib/tmdb";
import { ingestAndViewAction } from "./actions";

interface LocalResult {
  id: number;
  title: string;
  poster_path: string | null;
  media_type: MediaType;
  vote_average: number | null;
  tmdb_id: number;
}

const LOCAL_RESULT_LIMIT = 24;
const LIVE_RESULT_LIMIT = 12;

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  let localResults: LocalResult[] = [];
  let liveResults: { tmdbId: number; mediaType: MediaType; title: string; posterPath: string | null }[] = [];

  if (query) {
    const { data } = await supabase
      .from("titles")
      .select("id, title, poster_path, media_type, vote_average, tmdb_id")
      .ilike("title", `%${query}%`)
      .limit(LOCAL_RESULT_LIMIT);
    localResults = data ?? [];

    const localTmdbIds = new Set(localResults.map((r) => `${r.media_type}:${r.tmdb_id}`));

    try {
      const live = await searchMulti(query);
      liveResults = live.results
        .filter((r) => (r.media_type === "movie" || r.media_type === "tv") && r.poster_path)
        .filter((r) => !localTmdbIds.has(`${r.media_type}:${r.id}`))
        .slice(0, LIVE_RESULT_LIMIT)
        .map((r) => ({
          tmdbId: r.id,
          mediaType: r.media_type as MediaType,
          title: r.title ?? r.name ?? "Untitled",
          posterPath: r.poster_path,
        }));
    } catch (err) {
      // A live TMDB failure shouldn't blank out local results the user
      // can already see — just show what we have from our own catalog.
      console.error("Live search failed:", err instanceof Error ? err.message : err);
    }
  }

  return (
    <div className="flex flex-1 flex-col bg-sky">
      <AppHeader />
      <main className="mx-auto w-full max-w-[1280px] flex-1 px-4 py-9 sm:px-10">
        <form action="/search" method="GET" className="mb-8 flex max-w-[520px] gap-[10px]">
          <input
            type="text"
            name="q"
            defaultValue={query}
            placeholder="Search for a movie or show"
            autoFocus
            className="min-w-0 flex-1 border border-[rgba(12,35,52,.24)] bg-card px-4 py-[13px] text-[14.5px] text-text-1"
          />
          <button type="submit" className="bg-ink px-7 py-[13px] text-[12.5px] font-bold tracking-[.1em] text-white">
            SEARCH
          </button>
        </form>

        {!query ? (
          <p className="text-[14.5px] text-text-2">Search by title to find something specific.</p>
        ) : localResults.length === 0 && liveResults.length === 0 ? (
          <p className="text-[14.5px] text-text-2">Nothing found for &quot;{query}&quot;.</p>
        ) : (
          <div className="flex flex-col gap-9">
            {localResults.length > 0 && (
              <section className="flex flex-col gap-4">
                <h2 className="font-heading text-[14px] font-semibold tracking-[.16em]">RESULTS</h2>
                <div className="grid grid-cols-2 gap-[18px] sm:grid-cols-3 md:grid-cols-6">
                  {localResults.map((title) => (
                    <Link
                      key={title.id}
                      href={`/title/${title.id}`}
                      className="flex flex-col gap-[10px] bg-card p-[11px] shadow-card"
                    >
                      <div className="relative aspect-[2/3] w-full overflow-hidden bg-[rgba(12,35,52,.08)]">
                        {title.poster_path && (
                          <Image
                            src={`${TMDB_POSTER_BASE_URL}${title.poster_path}`}
                            alt={title.title}
                            fill
                            sizes="(max-width: 640px) 45vw, 220px"
                            className="object-cover"
                          />
                        )}
                      </div>
                      <p className="truncate text-[13px] font-semibold">{title.title}</p>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {liveResults.length > 0 && (
              <section className="flex flex-col gap-4">
                <h2 className="font-heading text-[14px] font-semibold tracking-[.16em]">MORE FROM TMDB</h2>
                <p className="-mt-2 text-[13px] text-text-3">
                  Not in our catalog yet — picking one adds it, then takes you straight there.
                </p>
                <div className="grid grid-cols-2 gap-[18px] sm:grid-cols-3 md:grid-cols-6">
                  {liveResults.map((title) => (
                    <form
                      key={`${title.mediaType}-${title.tmdbId}`}
                      action={ingestAndViewAction}
                      className="flex flex-col gap-[10px] bg-card p-[11px] text-left shadow-card"
                    >
                      <input type="hidden" name="tmdbId" value={title.tmdbId} />
                      <input type="hidden" name="mediaType" value={title.mediaType} />
                      <button type="submit" className="flex flex-col gap-[10px] text-left">
                        <div className="relative aspect-[2/3] w-full overflow-hidden bg-[rgba(12,35,52,.08)]">
                          {title.posterPath && (
                            <Image
                              src={`${TMDB_POSTER_BASE_URL}${title.posterPath}`}
                              alt={title.title}
                              fill
                              sizes="(max-width: 640px) 45vw, 220px"
                              className="object-cover"
                            />
                          )}
                        </div>
                        <p className="truncate text-[13px] font-semibold">{title.title}</p>
                      </button>
                    </form>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
