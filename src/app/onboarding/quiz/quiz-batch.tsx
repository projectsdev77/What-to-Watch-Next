"use client";

import { useState } from "react";
import Image from "next/image";
import { TMDB_POSTER_BASE_URL } from "@/lib/tmdb";
import { rateTitleAction } from "./actions";

interface QuizTitle {
  id: number;
  title: string;
  poster_path: string | null;
}

/**
 * "Didn't Watch" never calls the server at all — per design, it has zero
 * effect (no taste-profile change, not excluded, stays eligible to be
 * recommended again later), so there's nothing to persist. It just hides
 * the card from *this* rendered batch via local state. Liked/Disliked
 * still submit to rateTitleAction as real server actions — those are
 * genuine judgments that need to be saved.
 *
 * Cards are keyed by title id, so when a rated title's server action
 * revalidates the page and a fresh title backfills its spot, React only
 * mounts the new card (the rest keep their existing DOM nodes) — that's
 * what makes the fade-in below play just for the arrival, not the whole
 * grid re-rendering.
 */
export function QuizBatch({ batch }: { batch: QuizTitle[] }) {
  const [dismissedIds, setDismissedIds] = useState<Set<number>>(new Set());
  const visible = batch.filter((t) => !dismissedIds.has(t.id));

  if (visible.length === 0) {
    return (
      <p className="mb-8 text-[14.5px] text-[var(--cg-text-2)]">
        That&apos;s everything in this batch — hit the button below, or rate a few more once more
        titles are available.
      </p>
    );
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
                <button className="flex w-full items-center justify-center gap-[5px] rounded-[var(--cg-r-input)] bg-[var(--cg-primary)] py-[10px] text-[11.5px] font-bold tracking-[.05em] text-[var(--cg-on-primary)] transition-opacity hover:opacity-90">
                  <span aria-hidden>✓</span> LIKED
                </button>
              </form>
              <form action={rateTitleAction} className="flex-1">
                <input type="hidden" name="titleId" value={title.id} />
                <input type="hidden" name="status" value="disliked" />
                <button className="flex w-full items-center justify-center gap-[5px] rounded-[var(--cg-r-input)] border border-white/18 bg-white/8 py-[10px] text-[11.5px] font-bold tracking-[.05em] text-[var(--cg-text-2)] transition-colors hover:border-white/35 hover:text-[var(--cg-text-1)]">
                  <span aria-hidden>✕</span> DISLIKED
                </button>
              </form>
            </div>
            <button
              type="button"
              onClick={() => setDismissedIds((prev) => new Set(prev).add(title.id))}
              className="py-[3px] text-center text-[11.5px] font-medium text-[var(--cg-text-3)] underline decoration-white/30 underline-offset-2 transition-colors hover:text-[var(--cg-text-2)] hover:decoration-current"
            >
              Haven&apos;t watched it
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
