import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOnboardingStatus } from "@/lib/onboarding";
import { getTonightsPick, type CandidateStatus } from "@/lib/recommendations";
import { parseMediaType } from "@/lib/tmdb";
import { TitleCard } from "@/components/watch/title-card";
import { AppHeader } from "@/components/chrome/app-header";
import { MediaTypeTabs } from "@/components/chrome/media-type-tabs";

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

  return (
    <div className="flex flex-1 flex-col bg-sky">
      <AppHeader active="/" />
      <MediaTypeTabs active={mediaType} basePath="/" />
      {result.status !== "ok" ? (
        <EmptyState status={result.status} />
      ) : (
        <main className="mx-auto flex w-full max-w-[1280px] flex-1 flex-col gap-[34px] px-4 py-8 sm:px-10 sm:py-10">
          <TitleCard
            title={result.pick}
            redirectTo={redirectTo}
            featured
            unrestricted={result.unrestricted}
            lists={lists ?? []}
          />

          {result.discover.length > 0 && (
            <section className="flex flex-col gap-4">
              <div className="flex items-baseline gap-4">
                <h2 className="font-heading text-[15px] font-semibold tracking-[.18em]">ALSO CONSIDER</h2>
                <div className="h-[2px] flex-1 bg-steel" />
                <Link href={`/browse${mediaType === "tv" ? "?type=tv" : ""}`} className="text-[13px] font-semibold text-steel-dark">
                  Browse all
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-6">
                {result.discover.map((title) => (
                  <TitleCard key={title.id} title={title} redirectTo={redirectTo} />
                ))}
              </div>
            </section>
          )}
        </main>
      )}
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
  );
}
