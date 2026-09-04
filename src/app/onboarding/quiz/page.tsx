import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SiteFooter } from "@/components/chrome/site-footer";
import { finishQuizAction } from "./actions";
import { RATING_GOAL } from "./constants";
import { QuizBatch } from "./quiz-batch";

const QUIZ_BATCH_SIZE = 9;
// How deep into the catalog to draw candidates from — deliberately much
// larger than RATING_GOAL so the pool can't realistically run dry, even
// after a bunch of "Didn't Watch" dismissals (see quiz-batch.tsx; those
// never leave the pool, since nothing was actually judged).
const CANDIDATE_POOL_SIZE = 500;

// Deterministic per-user "shuffle" key — gives each user a varied but
// stable ordering without calling an impure function (Math.random)
// during render, which React disallows for Server Components.
function shuffleKey(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return hash;
}

export default async function QuizOnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { count: platformCount } = await supabase
    .from("user_platforms")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);
  if (!platformCount) redirect("/onboarding/platforms");

  const { data: rated } = await supabase
    .from("user_title_feedback")
    .select("title_id, status")
    .eq("user_id", user.id);
  const ratedIds = new Set((rated ?? []).map((r) => r.title_id as number));
  const ratedCount = (rated ?? []).filter((r) => r.status === "liked" || r.status === "disliked").length;

  // No media_type filter — movies and TV shows are both fair game here;
  // the taste profile this builds (genre weights) is used for both.
  const { data: candidates } = await supabase
    .from("titles")
    .select("id, title, poster_path")
    .not("vote_average", "is", null)
    .order("vote_average", { ascending: false })
    .limit(CANDIDATE_POOL_SIZE);

  const unrated = (candidates ?? []).filter((t) => !ratedIds.has(t.id));
  const batch = [...unrated]
    .sort((a, b) => shuffleKey(`${user.id}-${a.id}`) - shuffleKey(`${user.id}-${b.id}`))
    .slice(0, QUIZ_BATCH_SIZE);

  const progressPercent = Math.min(100, Math.round((ratedCount / RATING_GOAL) * 100));

  return (
    <>
    <main className="flex flex-1 flex-col bg-sky">
      <div className="flex items-center gap-6 bg-steel px-6 py-3.5 sm:px-10">
        <span className="font-wordmark text-[17px] tracking-[-.02em] text-white">WWN</span>
        <span className="ml-auto text-[12.5px] font-semibold tracking-[.14em] text-white/85">
          BUILDING YOUR TASTE PROFILE
        </span>
      </div>

      <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-10">
        <div className="mb-7 flex flex-wrap items-end gap-6">
          <div>
            <h1 className="font-heading text-[24px] font-semibold tracking-[.2em]">TASTE QUIZ</h1>
            <p className="mt-2 max-w-[46ch] text-[14.5px] leading-[1.6] text-text-2">
              Only rate what you&apos;ve actually watched. We&apos;ll take you straight to your
              recommendations once we have enough to work with.
            </p>
          </div>
          <div className="ml-auto flex w-[220px] flex-col gap-[7px]">
            <div className="flex items-baseline justify-between">
              <span className="text-[13px] font-bold tracking-[.04em]">
                {ratedCount} <span className="font-medium text-text-3">/ {RATING_GOAL} rated</span>
              </span>
              <span className="text-[12px] font-semibold text-text-3">{progressPercent}%</span>
            </div>
            <div className="h-[7px] overflow-hidden rounded-full bg-[rgba(12,35,52,.12)]">
              <div
                className="h-full rounded-full bg-ink transition-[width] duration-500 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {batch.length === 0 ? (
          <p className="mb-8 text-[14.5px] text-text-2">
            You&apos;ve rated everything we have cached so far — hit the button below to continue.
          </p>
        ) : (
          <QuizBatch batch={batch} />
        )}

        <form action={finishQuizAction}>
          <button
            type="submit"
            className="border border-[rgba(12,35,52,.28)] px-7 py-[13px] text-[12.5px] font-bold tracking-[.12em] text-text-2 transition-colors hover:border-ink hover:text-ink"
          >
            {ratedCount > 0 ? "FINISH WITH WHAT I'VE RATED" : "SKIP — I DON'T RECOGNIZE THESE"}
          </button>
        </form>
      </div>
    </main>
    <SiteFooter />
    </>
  );
}
