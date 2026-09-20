"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { recordWatchedAction } from "@/app/actions";
import { platformDeepLink } from "@/lib/platform-links";

const BUTTON_CLASS =
  "rounded-full bg-[var(--cg-primary)] px-[38px] py-[16px] text-[13.5px] font-bold tracking-[.08em] text-[var(--cg-on-primary)] shadow-[0_18px_38px_rgba(2,6,14,.55)] transition-transform active:scale-95";

/** Cinematic Glass version of WatchNowButton — same behavior (Watch Now
 * itself records a "watched" judgment, fire-and-forget), new look.
 *
 * Deep-links straight to the user's own matching platform (see
 * platform-links.ts — a search results page where we have a confirmed
 * URL for it, that platform's homepage otherwise) instead of TMDB's
 * combined "where to watch" page, so there's no second platform choice.
 * Falls back to the generic fallbackUrl only when there's no platform
 * to link to at all (unrestricted mode, or "Other"). */
export function CgWatchNowButton({
  title,
  titleId,
  redirectTo,
  matchingPlatforms,
  fallbackUrl,
}: {
  title: string;
  titleId: number;
  redirectTo: string;
  matchingPlatforms: string[];
  fallbackUrl: string;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  function recordWatch() {
    recordWatchedAction(titleId, redirectTo).then(() => router.refresh());
  }

  const deepLinks = matchingPlatforms
    .map((platform) => ({ platform, url: platformDeepLink(platform, title) }))
    .filter((entry): entry is { platform: string; url: string } => entry.url !== null);

  if (deepLinks.length < 2) {
    const href = deepLinks[0]?.url ?? fallbackUrl;
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" onClick={recordWatch} className={BUTTON_CLASS}>
        ▶ WATCH NOW
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
        ▶ WATCH NOW
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
          <div className="cg-pane absolute top-full left-0 z-20 mt-2 min-w-[200px] overflow-hidden p-2">
            <p className="px-3 pt-1 pb-2 text-[11px] font-semibold tracking-[.14em] text-[var(--cg-text-3)]">
              CHOOSE A PLATFORM
            </p>
            {deepLinks.map(({ platform, url }) => (
              <a
                key={platform}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  setOpen(false);
                  recordWatch();
                }}
                className="block rounded-[var(--cg-r-input)] px-3 py-[11px] text-[14px] text-[var(--cg-text-1)] transition-colors hover:bg-white/8 active:bg-white/14"
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
