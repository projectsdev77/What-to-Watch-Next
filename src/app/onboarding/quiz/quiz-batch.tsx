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
 */
export function QuizBatch({ batch }: { batch: QuizTitle[] }) {
  const [dismissedIds, setDismissedIds] = useState<Set<number>>(new Set());
  const visible = batch.filter((t) => !dismissedIds.has(t.id));

  if (visible.length === 0) {
    return (
      <p className="mb-6 text-[14.5px] text-text-2">
        That&apos;s everything in this batch — hit continue below, or rate a few more once more titles are available.
      </p>
    );
  }

  return (
    <div className="mb-8 grid grid-cols-2 gap-[18px] sm:grid-cols-3">
      {visible.map((title) => (
        <div key={title.id} className="flex flex-col gap-[11px] bg-card p-3 shadow-card">
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
            <form action={rateTitleAction} className="flex-1">
              <input type="hidden" name="titleId" value={title.id} />
              <input type="hidden" name="status" value="liked" />
              <button className="w-full bg-ink py-[9px] text-[11px] font-bold tracking-[.06em] text-white">
                LIKED
              </button>
            </form>
            <form action={rateTitleAction} className="flex-1">
              <input type="hidden" name="titleId" value={title.id} />
              <input type="hidden" name="status" value="disliked" />
              <button className="w-full border border-[rgba(12,35,52,.28)] py-[9px] text-[11px] font-bold tracking-[.06em]">
                DISLIKED
              </button>
            </form>
            <button
              type="button"
              onClick={() => setDismissedIds((prev) => new Set(prev).add(title.id))}
              className="flex-1 border border-[rgba(12,35,52,.28)] py-[9px] text-[9px] font-bold tracking-[.01em] text-text-2"
            >
              DIDN&apos;T WATCH
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
