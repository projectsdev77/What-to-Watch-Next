import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOnboardingStatus } from "@/lib/onboarding";
import { getDiscoverList, type CandidateStatus } from "@/lib/recommendations";
import { TitleCard } from "@/components/watch/title-card";

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<{ platform?: string; genre?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { hasPlatforms, hasTasteProfile } = await getOnboardingStatus(user.id);
  if (!hasPlatforms) redirect("/onboarding/platforms");
  if (!hasTasteProfile) redirect("/onboarding/quiz");

  const { platform, genre } = await searchParams;
  const genreId = genre ? Number(genre) : undefined;

  const result = await getDiscoverList(user.id, { platform, genreId, limit: 60 });

  if (result.status !== "ok") {
    return <EmptyState status={result.status} />;
  }

  const query = new URLSearchParams();
  if (platform) query.set("platform", platform);
  if (genre) query.set("genre", genre);
  const redirectTo = query.size > 0 ? `/browse?${query}` : "/browse";

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-12">
      <h1 className="text-2xl font-semibold">Browse</h1>

      <form className="flex flex-wrap gap-3 text-sm" action="/browse">
        <select name="platform" defaultValue={platform ?? ""} className="rounded border border-black/10 px-2 py-1 dark:border-white/15">
          <option value="">All platforms</option>
          {result.availablePlatforms.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <select name="genre" defaultValue={genre ?? ""} className="rounded border border-black/10 px-2 py-1 dark:border-white/15">
          <option value="">All genres</option>
          {result.availableGenres.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
        <button type="submit" className="rounded bg-foreground px-3 py-1 text-background">
          Filter
        </button>
        {(platform || genre) && (
          <Link href="/browse" className="self-center text-zinc-500 underline">
            Clear
          </Link>
        )}
      </form>

      {result.titles.length === 0 ? (
        <p className="text-sm text-zinc-500">No titles match that filter yet.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {result.titles.map((title) => (
            <TitleCard key={title.id} title={title} redirectTo={redirectTo} />
          ))}
        </div>
      )}
    </main>
  );
}

function EmptyState({ status }: { status: CandidateStatus }) {
  const messages: Record<CandidateStatus, string> = {
    "no-platforms": "Pick your streaming platforms in Settings first.",
    "empty-catalog": "The title catalog hasn't been seeded yet.",
    "nothing-available": "Nothing cached for your platforms yet.",
    "all-rated": "You've rated or watched everything currently cached.",
  };

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <p className="max-w-md text-sm text-zinc-500">{messages[status]}</p>
    </main>
  );
}
