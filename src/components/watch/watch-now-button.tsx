"use client";

import { useState } from "react";

const BUTTON_CLASS =
  "rounded-full bg-ink px-8 py-[14px] text-[13.5px] font-bold tracking-[.1em] text-white shadow-[0_12px_28px_rgba(12,35,52,.35)]";

/**
 * TMDB's free API has no true per-platform deep link for a title (see
 * README's "Watch Now" section) — there's no "open this exact title on
 * Hulu" URL without a paid feed, so every destination here is the same
 * TMDB/JustWatch "where to watch" page regardless of which platform is
 * picked. With two or more of the user's own platforms available, this
 * still asks which one first — mainly a confirmation step, since TMDB's
 * own page lists every provider as a clickable option once you land
 * there. With zero or one match, it skips straight to that page.
 */
export function WatchNowButton({
  matchingPlatforms,
  fallbackUrl,
}: {
  matchingPlatforms: string[];
  fallbackUrl: string;
}) {
  const [open, setOpen] = useState(false);

  if (matchingPlatforms.length < 2) {
    return (
      <a href={fallbackUrl} target="_blank" rel="noopener noreferrer" className={BUTTON_CLASS}>
        WATCH NOW
      </a>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={BUTTON_CLASS}
      >
        WATCH NOW
      </button>
      {open && (
        <>
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-10 cursor-default"
          />
          <div className="absolute left-0 top-full z-20 mt-2 min-w-[200px] bg-card shadow-card">
            <p className="px-4 pt-3 pb-1 text-[11px] font-semibold tracking-[.14em] text-text-3">
              CHOOSE A PLATFORM
            </p>
            {matchingPlatforms.map((platform) => (
              <a
                key={platform}
                href={fallbackUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setOpen(false)}
                className="block px-4 py-[11px] text-[14px] text-text-1 hover:bg-mist"
              >
                {platform}
              </a>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
