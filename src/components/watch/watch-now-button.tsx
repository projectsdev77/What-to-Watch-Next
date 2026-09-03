"use client";

import { useState } from "react";
import { platformSearchUrl } from "@/lib/platforms";

const BUTTON_CLASS =
  "rounded-full bg-ink px-8 py-[14px] text-[13.5px] font-bold tracking-[.1em] text-white shadow-[0_12px_28px_rgba(12,35,52,.35)]";

/**
 * TMDB's free API has no true per-platform deep link for a title (see
 * README's "Watch Now" section) — when it's available on one of the
 * user's own platforms, this opens that platform's own search results
 * for the title's name, the closest honest approximation without a paid
 * data source. With two or more matching platforms, it asks which one
 * first. Falls back to the generic combined JustWatch/TMDB link when
 * there's no matching platform (e.g. the user only picked "Other").
 */
export function WatchNowButton({
  title,
  matchingPlatforms,
  fallbackUrl,
}: {
  title: string;
  matchingPlatforms: string[];
  fallbackUrl: string;
}) {
  const [open, setOpen] = useState(false);

  if (matchingPlatforms.length === 0) {
    return (
      <a href={fallbackUrl} target="_blank" rel="noopener noreferrer" className={BUTTON_CLASS}>
        WATCH NOW
      </a>
    );
  }

  if (matchingPlatforms.length === 1) {
    return (
      <a
        href={platformSearchUrl(matchingPlatforms[0], title) ?? fallbackUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={BUTTON_CLASS}
      >
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
                href={platformSearchUrl(platform, title) ?? fallbackUrl}
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
