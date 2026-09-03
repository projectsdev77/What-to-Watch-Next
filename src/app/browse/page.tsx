import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOnboardingStatus } from "@/lib/onboarding";
import { getDiscoverList, type CandidateStatus } from "@/lib/recommendations";
import { parseMediaType, type MediaType } from "@/lib/tmdb";
import { TitleCard } from "@/components/watch/title-card";
import { AppHeader } from "@/components/chrome/app-header";
import { MediaTypeTabs } from "@/components/chrome/media-type-tabs";

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

  const query = new URLSearchParams();
  if (platform) query.set("platform", platform);
  if (genre) query.set("genre", genre);
  if (mediaType === "tv") query.set("type", "tv");
  const redirectTo = query.size > 0 ? `/browse?${query}` : "/browse";
  const hasFilters = Boolean(platform || genre);
  const clearHref = mediaType === "tv" ? "/browse?type=tv" : "/browse";

  return (
    <div className="flex flex-1 flex-col bg-sky">
      <AppHeader active="/browse" />
      <MediaTypeTabs active={mediaType} basePath="/browse" preserveParams={{ platform, genre }} />

      <div className="flex flex-wrap items-center gap-3 bg-steel-dark px-6 py-3.5 sm:px-10">
        <span className="text-[11.5px] font-bold tracking-[.16em] text-white/80">FILTER</span>
        <form className="flex flex-wrap items-center gap-[10px]" action="/browse">
          {mediaType === "tv" && <input type="hidden" name="type" value="tv" />}
          <select
            name="platform"
            defaultValue={platform ?? ""}
            className="min-w-[170px] bg-white px-[15px] py-[10px] text-[13.5px] text-text-1"
          >
            <option value="">All platforms</option>
            {result.availablePlatforms.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <select
            name="genre"
            defaultValue={genre ?? ""}
            className="min-w-[170px] bg-white px-[15px] py-[10px] text-[13.5px] text-text-1"
          >
            <option value="">All genres</option>
            {result.availableGenres.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
          <button type="submit" className="bg-mist px-6 py-[11px] text-[12.5px] font-bold tracking-[.1em] text-ink">
            APPLY
          </button>
          {hasFilters && (
            <Link href={clearHref} className="text-[13px] font-semibold text-white/85 underline">
              Clear
            </Link>
          )}
        </form>
        <span className="ml-auto text-[13px] text-white/85">{result.titles.length} titles</span>
      </div>

      <main className="mx-auto w-full max-w-[1280px] flex-1 px-4 py-9 sm:px-10">
        {result.titles.length === 0 ? (
          <div className="flex w-full max-w-[560px] flex-col items-start gap-4 bg-card p-9 shadow-card">
            <h1 className="font-heading text-[20px] font-semibold tracking-[.16em]">NOTHING ON THOSE FILTERS</h1>
            <p className="max-w-[44ch] text-[14.5px] leading-[1.65] text-text-2">
              No titles match that combination right now. Widen the platform or the genre and try again.
            </p>
            <div className="flex gap-[10px] pt-1">
              <Link href={clearHref} className="bg-ink px-[26px] py-[13px] text-[12.5px] font-bold tracking-[.1em] text-white">
                CLEAR FILTERS
              </Link>
              <Link
                href="/settings"
                className="border border-[rgba(12,35,52,.28)] px-6 py-[13px] text-[12.5px] font-bold tracking-[.1em]"
              >
                EDIT PLATFORMS
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-[18px] sm:grid-cols-3 md:grid-cols-6">
            {result.titles.map((title) => (
              <TitleCard key={title.id} title={title} redirectTo={redirectTo} />
            ))}
          </div>
        )}
      </main>
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
    <div className="flex flex-1 flex-col bg-sky">
      <AppHeader active="/browse" />
      <MediaTypeTabs active={mediaType} basePath="/browse" />
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-16">
        <div className="flex w-full max-w-[520px] flex-col items-start gap-4 bg-card p-9 shadow-card">
          <h1 className="font-heading text-[20px] font-semibold tracking-[.18em]">{heading}</h1>
          <p className="max-w-[48ch] text-[15px] leading-[1.7] text-text-2">{body}</p>
          {cta && (
            <Link href={cta.href} className="bg-ink px-[26px] py-[13px] text-[12.5px] font-bold tracking-[.1em] text-white">
              {cta.label}
            </Link>
          )}
        </div>
      </main>
    </div>
  );
}
