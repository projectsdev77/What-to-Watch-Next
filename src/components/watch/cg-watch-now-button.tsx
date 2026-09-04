"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { recordWatchedAction } from "@/app/actions";

const BUTTON_CLASS =
  "rounded-full bg-[var(--cg-primary)] px-[38px] py-[16px] text-[13.5px] font-bold tracking-[.08em] text-[var(--cg-on-primary)] shadow-[0_18px_38px_rgba(2,6,14,.55)]";

/** Cinematic Glass version of WatchNowButton — same behavior (Watch Now
 * itself records a "watched" judgment, fire-and-forget), new look. Only
 * used on the redesigned Tonight's Pick screen; title detail keeps the
 * original WatchNowButton. */
export function CgWatchNowButton({
  titleId,
  redirectTo,
  matchingPlatforms,
  fallbackUrl,
}: {
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

  if (matchingPlatforms.length < 2) {
    return (
      <a href={fallbackUrl} target="_blank" rel="noopener noreferrer" onClick={recordWatch} className={BUTTON_CLASS}>
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
            {matchingPlatforms.map((platform) => (
              <a
                key={platform}
                href={fallbackUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  setOpen(false);
                  recordWatch();
                }}
                className="block rounded-[var(--cg-r-input)] px-3 py-[11px] text-[14px] text-[var(--cg-text-1)] hover:bg-white/8"
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
