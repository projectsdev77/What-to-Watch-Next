"use client";

import { useRouter } from "next/navigation";
import { recordWatchedAction } from "@/app/actions";
import { platformDeepLink } from "@/lib/platform-links";

const BUTTON_CLASS =
  "rounded-full bg-[var(--cg-primary)] px-[30px] py-[16px] text-[13.5px] font-bold tracking-[.08em] text-[var(--cg-on-primary)] shadow-[0_18px_38px_rgba(2,6,14,.55)] transition-transform active:scale-95";

// Tonight's Pick hero: one white primary pill, outline pills for the rest.
// Full width and stacked on phones.
const HERO_BASE =
  "w-full rounded-full py-[19px] text-center text-[14px] font-bold tracking-[.12em] transition-transform active:scale-95 sm:w-auto";
const HERO_PRIMARY_CLASS = `${HERO_BASE} bg-[var(--cg-primary)] px-[40px] text-[var(--cg-on-primary)] shadow-[0_18px_38px_rgba(2,6,14,.55)]`;
const HERO_SECONDARY_CLASS = `${HERO_BASE} border-[1.5px] border-[rgba(234,242,250,.7)] bg-[rgba(6,11,20,.35)] px-[30px] text-[var(--cg-text-1)] backdrop-blur-[20px]`;

/** One "watch" button per matching platform (e.g. "▶ NETFLIX" and
 * "▶ PARAMOUNT+" side by side), each linking straight to the title on
 * that service. Clicking marks the title "watched" (opinion pending,
 * fire-and-forget) and refreshes the page, which then shows the "How was
 * it?" check-in (CgWatchCheckIn).
 *
 * Links are plain https URLs on the provider's own domain on purpose:
 * iOS (universal links) and Android (app links) open those in the
 * provider's native app when it's installed, and in the browser when it
 * isn't — custom schemes like nflx:// fail outright without the app.
 * Prefers the real title-page link from `platformLinks` (Streaming
 * Availability API, cached at ingest — see streaming-availability.ts),
 * falling back to platform-links.ts's search/homepage link, and to
 * fallbackUrl only when there's no matching platform at all
 * (unrestricted mode, or "Other").
 *
 * `variant="hero"`: the first platform (in the user's own order) is the
 * one white "▶ WATCH ON NETFLIX" button; the others are outline pills. */
export function CgWatchNowButton({
  title,
  titleId,
  redirectTo,
  matchingPlatforms,
  platformLinks,
  fallbackUrl,
  variant = "default",
}: {
  title: string;
  titleId: number;
  redirectTo: string;
  matchingPlatforms: string[];
  platformLinks?: Record<string, string | null>;
  fallbackUrl: string;
  variant?: "default" | "hero";
}) {
  const hero = variant === "hero";
  const router = useRouter();

  function recordWatch() {
    recordWatchedAction(titleId, redirectTo).then(() => router.refresh());
  }

  const deepLinks = matchingPlatforms
    .map((platform) => ({ platform, url: platformLinks?.[platform] || platformDeepLink(platform, title) }))
    .filter((entry): entry is { platform: string; url: string } => entry.url !== null);

  if (deepLinks.length === 0) {
    return (
      <a href={fallbackUrl} target="_blank" rel="noopener noreferrer" onClick={recordWatch} className={hero ? HERO_PRIMARY_CLASS : BUTTON_CLASS}>
        ▶ WATCH NOW
      </a>
    );
  }

  return (
    <>
      {deepLinks.map(({ platform, url }, i) => (
        <a
          key={platform}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={recordWatch}
          aria-label={`Watch ${title} on ${platform}`}
          className={hero ? (i === 0 ? HERO_PRIMARY_CLASS : HERO_SECONDARY_CLASS) : BUTTON_CLASS}
        >
          ▶ {hero && i === 0 ? `WATCH ON ${platform.toUpperCase()}` : platform.toUpperCase()}
        </a>
      ))}
    </>
  );
}
