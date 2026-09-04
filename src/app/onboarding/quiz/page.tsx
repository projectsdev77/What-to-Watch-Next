import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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
    <div className="cg-screen relative min-h-screen bg-[var(--cg-ground-alt)] font-sans text-[var(--cg-text-1)]">
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(6,11,20,.78)_0%,rgba(6,11,20,.96)_26%,#070D18_46%)]" />

      <div className="relative mx-auto flex max-w-3xl flex-col gap-6 p-[22px] pb-16">
        <div className="cg-nav flex items-center gap-6 px-[22px] py-[13px]">
          <span className="font-wordmark text-[16px] tracking-[-.03em] text-[var(--cg-text-1)]">WWN</span>
          <span className="ml-auto text-[12px] font-semibold tracking-[.16em] text-[var(--cg-text-3)]">
            BUILDING YOUR TASTE PROFILE
          </span>
        </div>

        <div className="mb-1 flex flex-wrap items-end gap-6">
          <div>
            <h1 className="font-heading text-[24px] font-semibold tracking-[.2em]">TASTE QUIZ</h1>
            <p className="mt-2 max-w-[46ch] text-[14.5px] leading-[1.6] text-[var(--cg-text-2)]">
              Only rate what you&apos;ve actually watched. We&apos;ll take you straight to your
              recommendations once we have enough to work with.
            </p>
          </div>
          <div className="ml-auto flex w-[220px] flex-col gap-[7px]">
            <div className="flex items-baseline justify-between">
              <span className="text-[13px] font-bold tracking-[.04em] text-[var(--cg-text-1)]">
                {ratedCount} <span className="font-medium text-[var(--cg-text-3)]">/ {RATING_GOAL} rated</span>
              </span>
              <span className="text-[12px] font-semibold text-[var(--cg-text-3)]">{progressPercent}%</span>
            </div>
            <div className="h-[7px] overflow-hidden rounded-full bg-white/8">
              <div
                className="h-full rounded-full bg-[var(--cg-primary)] transition-[width] duration-500 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {batch.length === 0 ? (
          <p className="mb-8 text-[14.5px] text-[var(--cg-text-2)]">
            You&apos;ve rated everything we have cached so far — hit the button below to continue.
          </p>
        ) : (
          <QuizBatch batch={batch} />
        )}

        <form action={finishQuizAction}>
          <button
            type="submit"
            className="rounded-[var(--cg-r-input)] border border-white/18 bg-white/8 px-7 py-[13px] text-[12.5px] font-bold tracking-[.12em] text-[var(--cg-text-2)] transition-colors hover:border-white/35 hover:text-[var(--cg-text-1)]"
          >
            {ratedCount > 0 ? "FINISH WITH WHAT I'VE RATED" : "SKIP — I DON'T RECOGNIZE THESE"}
          </button>
        </form>
      </div>
    </div>
  );
}
