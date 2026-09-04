import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOnboardingStatus } from "@/lib/onboarding";
import { getDiscoverList, type CandidateStatus } from "@/lib/recommendations";
import { parseMediaType, TMDB_POSTER_BASE_URL, type MediaType } from "@/lib/tmdb";
import { CgPosterCard } from "@/components/watch/cg-poster-card";
import { CgNavPill } from "@/components/chrome/cg-nav-pill";
import { CgMediaTypeTabs } from "@/components/chrome/cg-media-type-tabs";

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<{ platform?: string; genre?: string; type?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { hasPlatforms, hasTasteProfile } = await getOnboardingStatus(user.id);
  if (!hasPlatforms) redirect("/onboarding/platforms");
  if (!hasTasteProfile) redirect("/onboarding/quiz");

  const { platform, genre, type } = await searchParams;
  const genreId = genre ? Number(genre) : undefined;
  const mediaType = parseMediaType(type);

  const result = await getDiscoverList(user.id, { platform, genreId, mediaType, limit: 60 });

  if (result.status !== "ok") {
    return <EmptyState status={result.status} mediaType={mediaType} />;
  }

  const hasFilters = Boolean(platform || genre);
  const clearHref = mediaType === "tv" ? "/browse?type=tv" : "/browse";
  const ambientPoster = result.titles[0]?.posterPath ?? null;

  return (
    <div className="cg-screen relative min-h-screen overflow-hidden bg-[var(--cg-ground-alt)] font-sans text-[var(--cg-text-1)]">
      {ambientPoster && (
        <div className="absolute inset-x-0 top-0 h-[40%] opacity-50">
          <Image src={`${TMDB_POSTER_BASE_URL}${ambientPoster}`} alt="" aria-hidden fill className="object-cover" />
        </div>
      )}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(6,11,20,.72)_0%,rgba(6,11,20,.95)_32%,#070D18_56%)]" />

      <div className="relative mx-auto flex max-w-[1280px] flex-col gap-6 p-[22px] pb-16">
        <CgNavPill active="/browse" />

        <div className="flex flex-wrap items-center gap-[14px] px-1">
          <CgMediaTypeTabs active={mediaType} basePath="/browse" preserveParams={{ platform, genre }} />
          <div className="ml-auto flex flex-wrap items-center gap-[10px]">
            <span className="text-[11.5px] font-bold tracking-[.18em] text-[var(--cg-text-3)]">FILTER</span>
            <form className="flex flex-wrap items-center gap-[10px]" action="/browse">
              {mediaType === "tv" && <input type="hidden" name="type" value="tv" />}
              <div className="relative">
                <select
                  name="platform"
                  defaultValue={platform ?? ""}
                  className="min-w-[165px] appearance-none rounded-full border border-white/16 bg-white/7 py-[11px] pr-[34px] pl-[18px] text-[13px] text-[var(--cg-text-1)]"
                >
                  <option className="text-black" value="">
                    All platforms
                  </option>
                  {result.availablePlatforms.map((p) => (
                    <option className="text-black" key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute top-1/2 right-[14px] -translate-y-1/2 text-[var(--cg-text-3)]">
                  ⌄
                </span>
              </div>
              <div className="relative">
                <select
                  name="genre"
                  defaultValue={genre ?? ""}
                  className="min-w-[165px] appearance-none rounded-full border border-white/16 bg-white/7 py-[11px] pr-[34px] pl-[18px] text-[13px] text-[var(--cg-text-1)]"
                >
                  <option className="text-black" value="">
                    All genres
                  </option>
                  {result.availableGenres.map((g) => (
                    <option className="text-black" key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute top-1/2 right-[14px] -translate-y-1/2 text-[var(--cg-text-3)]">
                  ⌄
                </span>
              </div>
              <button
                type="submit"
                className="rounded-full bg-[var(--cg-primary)] px-[26px] py-[12px] text-[12px] font-bold tracking-[.09em] text-[var(--cg-on-primary)]"
              >
                APPLY
              </button>
              {hasFilters && (
                <Link href={clearHref} className="text-[13px] text-[var(--cg-accent)] underline">
                  Clear
                </Link>
              )}
            </form>
            <span className="pl-1 text-[12.5px] text-[var(--cg-text-3)]">{result.titles.length} titles</span>
          </div>
        </div>

        {result.titles.length === 0 ? (
          <div className="cg-pane flex w-full max-w-[560px] flex-col items-start gap-4 p-9">
            <h1 className="font-heading text-[20px] font-semibold tracking-[.16em] text-[var(--cg-text-1)]">
              NOTHING ON THOSE FILTERS
            </h1>
            <p className="max-w-[44ch] text-[14.5px] leading-[1.65] text-[var(--cg-text-2)]">
              No titles match that combination right now. Widen the platform or the genre and try again.
            </p>
            <div className="flex gap-[10px] pt-1">
              <Link
                href={clearHref}
                className="rounded-full bg-[var(--cg-primary)] px-[26px] py-[13px] text-[12.5px] font-bold tracking-[.1em] text-[var(--cg-on-primary)]"
              >
                CLEAR FILTERS
              </Link>
              <Link
                href="/settings"
                className="rounded-full border border-white/18 bg-white/9 px-6 py-[13px] text-[12.5px] font-semibold tracking-[.1em] text-[var(--cg-text-1)]"
              >
                EDIT PLATFORMS
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-[18px] sm:grid-cols-3 md:grid-cols-6">
            {result.titles.map((title) => (
              <CgPosterCard key={title.id} title={title} radiusPx={22} hoverPlay />
            ))}
          </div>
        )}

        <span className="px-1 pt-1 text-[12px] text-[var(--cg-text-legal)]">
          Streaming availability data provided by JustWatch. © 2026 What To Watch Next.
        </span>
      </div>
    </div>
  );
}

function EmptyState({ status, mediaType }: { status: CandidateStatus; mediaType: MediaType }) {
  const copy: Record<CandidateStatus, { heading: string; body: string; cta?: { href: string; label: string } }> = {
    "no-platforms": {
      heading: "PICK YOUR PLATFORMS FIRST",
      body: "We couldn't find any selected streaming services for your account.",
      cta: { href: "/onboarding/platforms", label: "CHOOSE PLATFORMS" },
    },
    "empty-catalog": {
      heading: "CATALOG ISN'T LOADED YET",
      body: "The title catalog hasn't been seeded yet — run `npm run seed` to populate it, then refresh.",
    },
    "nothing-available": {
      heading: "NOTHING FOUND ON YOUR PLATFORMS YET",
      body: "We don't have any cached titles available on the services you picked. Try adding another platform, or check back after the catalog is refreshed.",
      cta: { href: "/settings", label: "UPDATE PLATFORMS" },
    },
    "all-rated": {
      heading: "YOU'VE SEEN EVERYTHING WE'VE GOT",
      body: "You've rated or watched everything currently cached for your platforms. More titles will show up once the catalog is refreshed.",
    },
  };

  const { heading, body, cta } = copy[status];

  return (
    <div className="cg-screen min-h-screen bg-[var(--cg-ground-alt)] font-sans text-[var(--cg-text-1)]">
      <div className="mx-auto flex max-w-[1280px] flex-col gap-6 p-[22px]">
        <CgNavPill active="/browse" />
        <CgMediaTypeTabs active={mediaType} basePath="/browse" />
        <div className="flex flex-1 flex-col items-center justify-center px-4 py-16">
          <div className="cg-pane flex w-full max-w-[520px] flex-col items-start gap-4 p-9">
            <h1 className="font-heading text-[20px] font-semibold tracking-[.18em] text-[var(--cg-text-1)]">
              {heading}
            </h1>
            <p className="max-w-[48ch] text-[15px] leading-[1.7] text-[var(--cg-text-2)]">{body}</p>
            {cta && (
              <Link
                href={cta.href}
                className="rounded-full bg-[var(--cg-primary)] px-[26px] py-[13px] text-[12.5px] font-bold tracking-[.1em] text-[var(--cg-on-primary)]"
              >
                {cta.label}
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
