import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOnboardingStatus } from "@/lib/onboarding";
import { getTonightsPick, type CandidateStatus } from "@/lib/recommendations";
import { getTrailerKey, parseMediaType } from "@/lib/tmdb";
import { CgNavPill } from "@/components/chrome/cg-nav-pill";
import { CgMediaTypeTabs } from "@/components/chrome/cg-media-type-tabs";
import { CgTonightsPickHero } from "@/components/watch/cg-tonights-pick-hero";
import { CgWatchCheckIn } from "@/components/watch/cg-watch-check-in";

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

  // A Watch Now click leaves the title "watched" with no opinion yet — ask
  // how it was before showing the next pick, so the taste profile learns
  // from a real answer instead of assuming every click was a like.
  const { data: pendingWatch } = await supabase
    .from("user_title_feedback")
    .select("title_id, titles(title, poster_path)")
    .eq("user_id", user.id)
    .eq("status", "watched")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const pendingTitle = pendingWatch?.titles as unknown as { title: string; poster_path: string | null } | null;
  if (pendingWatch && pendingTitle) {
    return (
      <div className="cg-screen min-h-screen bg-[var(--cg-ground)] font-sans text-[var(--cg-text-1)]">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-6 p-[22px]">
          <CgNavPill active="/" />
          <div className="px-4 py-12">
            <CgWatchCheckIn
              titleId={pendingWatch.title_id as number}
              title={pendingTitle.title}
              posterPath={pendingTitle.poster_path}
              redirectTo={redirectTo}
            />
          </div>
        </div>
      </div>
    );
  }

  const result = await getTonightsPick(user.id, mediaType);

  if (result.status !== "ok") {
    return <EmptyState status={result.status} />;
  }

  const pick = result.pick;
  const trailerKey = await getTrailerKey(pick.mediaType, pick.tmdbId);
  const matchingPlatforms = result.unrestricted ? [] : pick.platforms;

  return (
    <CgTonightsPickHero
      pick={pick}
      unrestricted={result.unrestricted}
      matchingPlatforms={matchingPlatforms}
      redirectTo={redirectTo}
      trailerKey={trailerKey}
      header={
        <>
          <CgNavPill active="/" />
          <CgMediaTypeTabs active={mediaType} basePath="/" />
          {result.unrestricted && (
            <div className="cg-pane px-4 py-3 text-[13px] text-[var(--cg-text-2)]">
              You haven&apos;t picked a streaming service in{" "}
              <Link href="/settings" className="font-semibold text-[var(--cg-accent)] underline">
                Settings
              </Link>
              , so this pick could be from any platform — it might not be one you can actually watch on.
            </div>
          )}
        </>
      }
    />
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
