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

  return (
    <main className="flex flex-1 flex-col items-center px-4 py-16">
      <div className="w-full max-w-3xl">
        <h1 className="mb-1 text-2xl font-semibold">Rate a few titles</h1>
        <p className="mb-6 text-sm text-zinc-500">
          {ratedIds.size} rated
          {ratedIds.size >= SUGGESTED_MINIMUM
            ? " — continue whenever you're ready."
            : ` — rate a few more to help us learn your taste (aim for ${SUGGESTED_MINIMUM}+).`}
        </p>

        {batch.length === 0 ? (
          <p className="mb-6 text-sm text-zinc-500">
            You&apos;ve rated everything we have cached so far — hit continue below.
          </p>
        ) : (
          <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
            {batch.map((title) => (
              <form
                key={title.id}
                action={rateTitleAction}
                className="flex flex-col gap-2 rounded border border-black/10 p-2 dark:border-white/15"
              >
                <input type="hidden" name="titleId" value={title.id} />
                <div className="relative aspect-[2/3] w-full overflow-hidden rounded bg-zinc-200 dark:bg-zinc-800">
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
                <p className="line-clamp-2 text-sm font-medium">{title.title}</p>
                <div className="flex gap-1 text-xs">
                  <button name="status" value="liked" className="flex-1 rounded bg-emerald-600 py-1 text-white">
                    👍 Like
                  </button>
                  <button name="status" value="disliked" className="flex-1 rounded bg-zinc-500 py-1 text-white">
                    👎 Pass
                  </button>
                  <button name="status" value="skipped" className="flex-1 rounded bg-zinc-500 py-1 text-white">
                    ⏭ Seen it
                  </button>
                </div>
              </form>
            ))}
          </div>
        )}

        <form action={finishQuizAction}>
          <button type="submit" className="rounded bg-foreground px-4 py-2 text-background">
            Continue to your recommendations
          </button>
        </form>
      </div>
    </main>
  );
}
