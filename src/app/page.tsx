import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOnboardingStatus } from "@/lib/onboarding";
import { getTonightsPick, type CandidateStatus } from "@/lib/recommendations";
import { TitleCard } from "@/components/watch/title-card";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { hasPlatforms, hasTasteProfile } = await getOnboardingStatus(user.id);
  if (!hasPlatforms) redirect("/onboarding/platforms");
  if (!hasTasteProfile) redirect("/onboarding/quiz");

  const result = await getTonightsPick(user.id);

  if (result.status !== "ok") {
    return <EmptyState status={result.status} />;
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-10 px-4 py-12">
      <section>
        <h1 className="mb-4 text-2xl font-semibold">Tonight&apos;s Pick</h1>
        <TitleCard title={result.pick} redirectTo="/" featured />
      </section>

      {result.discover.length > 0 && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-medium text-zinc-400">Also consider</h2>
            <Link href="/browse" className="text-sm underline">
              Browse all
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {result.discover.map((title) => (
              <TitleCard key={title.id} title={title} redirectTo="/" />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

function EmptyState({ status }: { status: CandidateStatus }) {
  const copy: Record<CandidateStatus, { heading: string; body: string; cta?: { href: string; label: string } }> = {
    "no-platforms": {
      heading: "Pick your platforms first",
      body: "We couldn't find any selected streaming services for your account.",
      cta: { href: "/onboarding/platforms", label: "Choose platforms" },
    },
    "empty-catalog": {
      heading: "Catalog isn't loaded yet",
      body: "The title catalog hasn't been seeded yet — run `npm run seed` to populate it, then refresh.",
    },
    "nothing-available": {
      heading: "Nothing found on your platforms yet",
      body: "We don't have any cached titles available on the services you picked. Try adding another platform, or check back after the catalog is refreshed.",
      cta: { href: "/settings", label: "Update platforms" },
    },
    "all-rated": {
      heading: "You've seen everything we've got",
      body: "You've rated or watched everything currently cached for your platforms. More titles will show up once the catalog is refreshed.",
    },
  };

  const { heading, body, cta } = copy[status];

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <h1 className="mb-2 text-xl font-semibold">{heading}</h1>
      <p className="max-w-md text-sm text-zinc-500">{body}</p>
      {cta && (
        <Link href={cta.href} className="mt-4 rounded bg-foreground px-4 py-2 text-sm text-background">
          {cta.label}
        </Link>
      )}
    </main>
  );
}
