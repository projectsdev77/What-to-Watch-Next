"use client";

import { useState } from "react";
import Image from "next/image";
import { TMDB_POSTER_BASE_URL } from "@/lib/tmdb";
import { rateTitleAction } from "./actions";
import { pickVisible, withDismissed } from "./quiz-pool";
import { CgSubmitButton } from "@/components/watch/cg-submit-button";

interface QuizTitle {
  id: number;
  title: string;
  poster_path: string | null;
}

const VISIBLE_COUNT = 9;

/**
 * Shows the next VISIBLE_COUNT titles from the user's whole unrated pool,
 * so every rating or "Haven't watched it" immediately pulls the next one
 * in — the grid stays full and the user never sees the pool run out.
 *
 * "Haven't watched it" never calls the server — it has zero effect (no
 * taste-profile change, not excluded from recommendations), so it only
 * hides the card via local state. Liked/Disliked submit to
 * rateTitleAction; the revalidated page then sends a pool without that
 * title. Once fewer than VISIBLE_COUNT undismissed titles remain, the
 * longest-ago-dismissed ones are quietly cycled back in, since they were
 * only skipped, never judged.
 *
 * Cards are keyed by title id, so a backfilled title is the only newly
 * mounted card — that's what makes the fade-in play just for the arrival.
 */
export function QuizBatch({ titles }: { titles: QuizTitle[] }) {
  // Insertion order = dismissal order (oldest first), which is what
  // decides which skipped titles get recycled first.
  const [dismissedIds, setDismissedIds] = useState<Set<number>>(new Set());

  const visible = pickVisible(titles, dismissedIds, VISIBLE_COUNT);

  function dismiss(id: number) {
    setDismissedIds((prev) => withDismissed(prev, id));
  }

  return (
    <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
      {visible.map((title) => (
        <div
          key={title.id}
          className="cg-pane animate-[quiz-card-in_0.4s_ease-out] flex flex-col gap-[10px] p-3"
        >
          <div className="relative aspect-[2/3] w-full overflow-hidden rounded-[var(--cg-r-poster)] bg-white/5">
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
          <p className="line-clamp-2 min-h-[2.6em] text-[13.5px] leading-[1.3] font-semibold text-[var(--cg-text-1)]">
            {title.title}
          </p>
          <div className="flex flex-col gap-[6px]">
            <div className="flex gap-[6px]">
              <form action={rateTitleAction} className="flex-1">
                <input type="hidden" name="titleId" value={title.id} />
                <input type="hidden" name="status" value="liked" />
                <CgSubmitButton
                  className="flex w-full items-center justify-center gap-[5px] rounded-[var(--cg-r-input)] bg-[var(--cg-primary)] py-[10px] text-[11.5px] font-bold tracking-[.05em] text-[var(--cg-on-primary)] hover:opacity-90"
                  pendingLabel="…"
                >
                  <span aria-hidden>✓</span> LIKED
                </CgSubmitButton>
              </form>
              <form action={rateTitleAction} className="flex-1">
                <input type="hidden" name="titleId" value={title.id} />
                <input type="hidden" name="status" value="disliked" />
                <CgSubmitButton
                  className="flex w-full items-center justify-center gap-[5px] rounded-[var(--cg-r-input)] border border-white/18 bg-white/8 py-[10px] text-[11.5px] font-bold tracking-[.05em] text-[var(--cg-text-2)] hover:border-white/35 hover:text-[var(--cg-text-1)]"
                  pendingLabel="…"
                >
                  <span aria-hidden>✕</span> DISLIKED
                </CgSubmitButton>
              </form>
            </div>
            <button
              type="button"
              onClick={() => dismiss(title.id)}
              className="py-[3px] text-center text-[11.5px] font-medium text-[var(--cg-text-3)] underline decoration-white/30 underline-offset-2 transition-[color,transform] duration-100 active:scale-95 hover:text-[var(--cg-text-2)] hover:decoration-current"
            >
              Haven&apos;t watched it
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
