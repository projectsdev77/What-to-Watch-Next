import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOnboardingStatus } from "@/lib/onboarding";
import { getTonightsPick, type CandidateStatus } from "@/lib/recommendations";
import { parseMediaType, TMDB_POSTER_BASE_URL } from "@/lib/tmdb";
import { CgNavPill } from "@/components/chrome/cg-nav-pill";
import { CgMediaTypeTabs } from "@/components/chrome/cg-media-type-tabs";
import { CgPosterCard } from "@/components/watch/cg-poster-card";
import { CgWatchNowButton } from "@/components/watch/cg-watch-now-button";
import { CgWatchlistButton, CgFeedbackActions } from "@/components/watch/cg-feedback-actions";

export default async function Home({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { hasPlatforms, hasTasteProfile } = await getOnboardingStatus(user.id);
  if (!hasPlatforms) redirect("/onboarding/platforms");
  if (!hasTasteProfile) redirect("/onboarding/quiz");

  const mediaType = parseMediaType((await searchParams).type);
  const redirectTo = mediaType === "movie" ? "/" : "/?type=tv";

  const [result, { data: lists }] = await Promise.all([
    getTonightsPick(user.id, mediaType),
    supabase.from("watchlists").select("id, name").eq("user_id", user.id).order("created_at"),
  ]);

  if (result.status !== "ok") {
    return <EmptyState status={result.status} />;
  }

  const pick = result.pick;
  const matchingPlatforms = result.unrestricted ? [] : pick.platforms;

  return (
    <div className="cg-screen relative min-h-screen overflow-hidden bg-[var(--cg-ground)] font-sans text-[var(--cg-text-1)]">
      {pick.posterPath && (
        <div className="absolute inset-x-0 top-0 h-[76%]">
          <Image src={`${TMDB_POSTER_BASE_URL}${pick.posterPath}`} alt="" aria-hidden fill className="object-cover" />
        </div>
      )}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(6,11,20,.4)_0%,rgba(6,11,20,.76)_48%,#060B14_78%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(6,11,20,.7)_0%,transparent_60%)]" />

      <div className="relative mx-auto flex max-w-[1280px] flex-col gap-5 p-[22px] pb-16">
        <CgNavPill active="/" />
        <CgMediaTypeTabs active={mediaType} basePath="/" />

        <div className="flex flex-col gap-[22px] px-2 py-6 sm:flex-row sm:items-end sm:gap-[34px] sm:py-9">
          <div className="relative aspect-[2/3] w-[190px] shrink-0 overflow-hidden rounded-[var(--cg-r-poster)] shadow-[0_28px_60px_rgba(2,6,14,.75)] sm:w-[210px]">
            {pick.posterPath && (
              <Image
                src={`${TMDB_POSTER_BASE_URL}${pick.posterPath}`}
                alt={pick.title}
                fill
                sizes="210px"
                className="object-cover"
              />
            )}
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-[17px] sm:max-w-[58%]">
            <span className="text-[11.5px] font-bold tracking-[.2em] text-[var(--cg-accent)]">TONIGHT&apos;S PICK</span>
            <h1 className="font-heading text-[38px] leading-[1] font-bold tracking-[-.042em] text-balance sm:text-[58px]">
              {pick.title}
            </h1>
            <div className="flex flex-wrap items-center gap-[9px]">
              <span className="rounded-full border border-white/20 bg-white/12 px-[15px] py-[7px] text-[12.5px] font-semibold backdrop-blur-[20px]">
                {pick.matchPercent}% match
              </span>
              {pick.platforms.map((platform) => (
                <span
                  key={platform}
                  className="rounded-full border border-white/20 bg-white/12 px-[15px] py-[7px] text-[12.5px] font-semibold backdrop-blur-[20px]"
                >
                  {platform}
                </span>
              ))}
            </div>
            <p className="max-w-[44ch] text-[16px] leading-[1.6] text-[var(--cg-text-2)]">{pick.why}</p>
            <div className="flex flex-wrap gap-[11px] pt-0.5">
              <CgWatchNowButton
                titleId={pick.id}
                redirectTo={redirectTo}
                matchingPlatforms={matchingPlatforms}
                fallbackUrl={pick.watchUrl}
              />
              <CgWatchlistButton
                titleId={pick.id}
                redirectTo={redirectTo}
                isWatchlisted={pick.isWatchlisted}
                lists={lists ?? []}
              />
            </div>
            <div className="pt-0.5">
              <CgFeedbackActions titleId={pick.id} redirectTo={redirectTo} />
            </div>
          </div>
        </div>

        {result.discover.length > 0 && (
          <div className="cg-pane flex flex-col gap-4 p-6">
            <div className="flex items-baseline gap-[14px]">
              <span className="font-heading text-[19px] font-semibold tracking-[-.02em]">Also consider</span>
              <Link href={`/browse${mediaType === "tv" ? "?type=tv" : ""}`} className="ml-auto text-[13px] text-[var(--cg-accent)]">
                Browse all
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-6">
              {result.discover.map((title) => (
                <CgPosterCard key={title.id} title={title} />
              ))}
            </div>
          </div>
        )}

        <span className="px-1 pt-1 text-[12px] text-[var(--cg-text-legal)]">
          Streaming availability data provided by JustWatch. © 2026 What To Watch Next.
        </span>
      </div>
    </div>
  );
}

function EmptyState({ status }: { status: CandidateStatus }) {
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
    <div className="cg-screen min-h-screen bg-[var(--cg-ground)] font-sans text-[var(--cg-text-1)]">
      <div className="mx-auto flex max-w-[1280px] flex-col gap-6 p-[22px]">
        <CgNavPill active="/" />
        <div className="flex flex-1 flex-col items-center justify-center px-4 py-16">
          <div className="cg-pane flex w-full max-w-[520px] flex-col items-start gap-4 p-9">
            <h1 className="font-heading text-[20px] font-semibold tracking-[.18em]">{heading}</h1>
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
