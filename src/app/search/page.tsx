import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TMDB_POSTER_BASE_URL, searchMulti, type MediaType } from "@/lib/tmdb";
import { CgNavPill } from "@/components/chrome/cg-nav-pill";
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
    <div className="cg-screen relative min-h-screen bg-[var(--cg-ground-alt)] font-sans text-[var(--cg-text-1)]">
      <div className="relative mx-auto flex max-w-[1280px] flex-col gap-6 p-[22px] pb-16">
        <CgNavPill />

        <form action="/search" method="GET" className="mb-1 flex max-w-[520px] gap-[10px]">
          <input
            type="text"
            name="q"
            defaultValue={query}
            placeholder="Search for a movie or show"
            autoFocus
            className="min-w-0 flex-1 rounded-full border border-white/16 bg-white/7 px-5 py-[13px] text-[14.5px] text-[var(--cg-text-1)] placeholder:text-[var(--cg-text-3)]"
          />
          <button
            type="submit"
            className="rounded-full bg-[var(--cg-primary)] px-7 py-[13px] text-[12.5px] font-bold tracking-[.1em] text-[var(--cg-on-primary)]"
          >
            SEARCH
          </button>
        </form>

        {!query ? (
          <p className="text-[14.5px] text-[var(--cg-text-2)]">Search by title to find something specific.</p>
        ) : localResults.length === 0 && liveResults.length === 0 ? (
          <p className="text-[14.5px] text-[var(--cg-text-2)]">Nothing found for &quot;{query}&quot;.</p>
        ) : (
          <div className="flex flex-col gap-9">
            {localResults.length > 0 && (
              <section className="flex flex-col gap-4">
                <h2 className="text-[12px] font-bold tracking-[.18em] text-[var(--cg-text-3)]">RESULTS</h2>
                <div className="grid grid-cols-2 gap-[18px] sm:grid-cols-3 md:grid-cols-6">
                  {localResults.map((title) => (
                    <Link key={title.id} href={`/title/${title.id}`} className="flex flex-col gap-[11px]">
                      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-[22px] bg-white/5 shadow-[0_18px_40px_rgba(2,6,14,.6)]">
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
                      <p className="truncate text-[13px] font-semibold text-[var(--cg-text-1)]">{title.title}</p>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {liveResults.length > 0 && (
              <section className="flex flex-col gap-4">
                <h2 className="text-[12px] font-bold tracking-[.18em] text-[var(--cg-text-3)]">MORE FROM TMDB</h2>
                <p className="-mt-2 text-[13px] text-[var(--cg-text-3)]">
                  Not in our catalog yet — picking one adds it, then takes you straight there.
                </p>
                <div className="grid grid-cols-2 gap-[18px] sm:grid-cols-3 md:grid-cols-6">
                  {liveResults.map((title) => (
                    <form
                      key={`${title.mediaType}-${title.tmdbId}`}
                      action={ingestAndViewAction}
                      className="flex flex-col gap-[11px] text-left"
                    >
                      <input type="hidden" name="tmdbId" value={title.tmdbId} />
                      <input type="hidden" name="mediaType" value={title.mediaType} />
                      <button type="submit" className="flex flex-col gap-[11px] text-left">
                        <div className="relative aspect-[2/3] w-full overflow-hidden rounded-[22px] bg-white/5 shadow-[0_18px_40px_rgba(2,6,14,.6)]">
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
                        <p className="truncate text-[13px] font-semibold text-[var(--cg-text-1)]">{title.title}</p>
                      </button>
                    </form>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        <span className="px-1 pt-1 text-[12px] text-[var(--cg-text-legal)]">
          Streaming availability data provided by JustWatch. © 2026 What To Watch Next.
        </span>
      </div>
    </div>
  );
}
