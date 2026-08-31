import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOnboardingStatus } from "@/lib/onboarding";
import { getTonightsPick, type RecommendedTitle } from "@/lib/recommendations";
import { TMDB_POSTER_BASE_URL } from "@/lib/tmdb";
import { submitPickFeedbackAction } from "@/app/actions";

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
        <PickCard title={result.pick} featured />
      </section>

      {result.discover.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-medium text-zinc-400">Also consider</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {result.discover.map((title) => (
              <PickCard key={title.id} title={title} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

function PickCard({ title, featured = false }: { title: RecommendedTitle; featured?: boolean }) {
  return (
    <div
      className={
        featured
          ? "flex flex-col gap-4 rounded-lg border border-black/10 p-4 sm:flex-row dark:border-white/15"
          : "flex flex-col gap-2 rounded border border-black/10 p-2 dark:border-white/15"
      }
    >
      <div
        className={
          featured
            ? "relative aspect-[2/3] w-full shrink-0 overflow-hidden rounded bg-zinc-200 sm:w-48 dark:bg-zinc-800"
            : "relative aspect-[2/3] w-full overflow-hidden rounded bg-zinc-200 dark:bg-zinc-800"
        }
      >
        {title.posterPath && (
          <Image
            src={`${TMDB_POSTER_BASE_URL}${title.posterPath}`}
            alt={title.title}
            fill
            sizes={featured ? "192px" : "(max-width: 640px) 45vw, 220px"}
            className="object-cover"
          />
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <p className={featured ? "text-lg font-semibold" : "line-clamp-2 text-sm font-medium"}>{title.title}</p>
          <span className="shrink-0 rounded bg-emerald-600/20 px-2 py-0.5 text-xs font-medium text-emerald-500">
            {title.matchPercent}% match
          </span>
        </div>

        {title.platforms.length > 0 && (
          <p className="text-xs text-zinc-500">{title.platforms.join(" · ")}</p>
        )}

        <p className={featured ? "text-sm text-zinc-500" : "line-clamp-2 text-xs text-zinc-500"}>{title.why}</p>

        {featured && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <a
              href={title.watchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded bg-foreground px-4 py-2 text-sm text-background"
            >
              Watch Now
            </a>
            <FeedbackButton titleId={title.id} status="liked" label="👍 Like" />
            <FeedbackButton titleId={title.id} status="watched" label="✅ Watched" />
            <FeedbackButton titleId={title.id} status="skipped" label="🔁 Not tonight" />
          </div>
        )}
      </div>
    </div>
  );
}

function FeedbackButton({
  titleId,
  status,
  label,
}: {
  titleId: number;
  status: "liked" | "disliked" | "watched" | "skipped";
  label: string;
}) {
  return (
    <form action={submitPickFeedbackAction}>
      <input type="hidden" name="titleId" value={titleId} />
      <input type="hidden" name="status" value={status} />
      <button type="submit" className="rounded border border-black/10 px-3 py-2 text-sm dark:border-white/15">
        {label}
      </button>
    </form>
  );
}

function EmptyState({ status }: { status: "no-platforms" | "empty-catalog" | "nothing-available" | "all-rated" }) {
  const copy: Record<typeof status, { heading: string; body: string; cta?: { href: string; label: string } }> = {
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
      cta: { href: "/onboarding/platforms", label: "Update platforms" },
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
