import { redirect } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { TMDB_POSTER_BASE_URL } from "@/lib/tmdb";
import { rateTitleAction, finishQuizAction } from "./actions";

const QUIZ_BATCH_SIZE = 9;
const SUGGESTED_MINIMUM = 10;

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
    .select("title_id")
    .eq("user_id", user.id);
  const ratedIds = new Set((rated ?? []).map((r) => r.title_id as number));

  const { data: candidates } = await supabase
    .from("titles")
    .select("id, title, poster_path")
    .order("vote_average", { ascending: false })
    .limit(80);

  const unrated = (candidates ?? []).filter((t) => !ratedIds.has(t.id));
  const batch = [...unrated]
    .sort((a, b) => shuffleKey(`${user.id}-${a.id}`) - shuffleKey(`${user.id}-${b.id}`))
    .slice(0, QUIZ_BATCH_SIZE);

  const progressPercent = Math.min(100, Math.round((ratedIds.size / SUGGESTED_MINIMUM) * 100));

  return (
    <main className="flex flex-1 flex-col bg-sky">
      <div className="flex items-center gap-6 bg-steel px-6 py-3.5 sm:px-10">
        <span className="font-wordmark text-[17px] tracking-[-.02em] text-white">WWN</span>
        <span className="ml-auto text-[12.5px] font-semibold tracking-[.14em] text-white/85">
          RATE A FEW TO BEGIN
        </span>
      </div>

      <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-10">
        <div className="mb-7 flex flex-wrap items-end gap-6">
          <div>
            <h1 className="font-heading text-[24px] font-semibold tracking-[.2em]">TASTE QUIZ</h1>
            <p className="mt-2 text-[14.5px] text-text-2">
              Like, pass, or mark titles you&apos;ve seen — tonight&apos;s pick learns from every one.
            </p>
          </div>
          <div className="ml-auto flex w-[220px] flex-col gap-[7px]">
            <div className="flex justify-between text-[12.5px] font-semibold">
              <span>{ratedIds.size} rated</span>
              <span className="text-text-3">{progressPercent}%</span>
            </div>
            <div className="h-[6px] bg-[rgba(12,35,52,.16)]">
              <div className="h-full bg-ink" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>
        </div>

        {batch.length === 0 ? (
          <p className="mb-6 text-[14.5px] text-text-2">
            You&apos;ve rated everything we have cached so far — hit continue below.
          </p>
        ) : (
          <div className="mb-8 grid grid-cols-2 gap-[18px] sm:grid-cols-3">
            {batch.map((title) => (
              <form
                key={title.id}
                action={rateTitleAction}
                className="flex flex-col gap-[11px] bg-card p-3 shadow-card"
              >
                <input type="hidden" name="titleId" value={title.id} />
                <div className="relative aspect-[2/3] w-full overflow-hidden bg-[rgba(12,35,52,.08)]">
                  {title.poster_path && (
                    <Image
                      src={`${TMDB_POSTER_BASE_URL}${title.poster_path}`}
                      alt={title.title}
                      fill
                      sizes="(max-width: 640px) 45vw, 220px"
                      className="object-cover"
                    />
                  )}
                </div>
                <p className="line-clamp-2 text-[13.5px] font-semibold">{title.title}</p>
                <div className="flex gap-[6px]">
                  <button
                    name="status"
                    value="liked"
                    className="flex-1 bg-ink py-[9px] text-[11px] font-bold tracking-[.06em] text-white"
                  >
                    LIKE
                  </button>
                  <button
                    name="status"
                    value="disliked"
                    className="flex-1 border border-[rgba(12,35,52,.28)] py-[9px] text-[11px] font-bold tracking-[.06em]"
                  >
                    PASS
                  </button>
                  <button
                    name="status"
                    value="watched"
                    className="flex-1 border border-[rgba(12,35,52,.28)] py-[9px] text-[10px] font-bold tracking-[.02em]"
                  >
                    SEEN
                  </button>
                </div>
              </form>
            ))}
          </div>
        )}

        <form action={finishQuizAction}>
          <button
            type="submit"
            className="bg-ink px-8 py-[15px] text-[13.5px] font-bold tracking-[.14em] text-white"
          >
            CONTINUE TO YOUR RECOMMENDATIONS
          </button>
        </form>
      </div>
    </main>
  );
}
