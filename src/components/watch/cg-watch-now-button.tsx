"use client";

import { useRouter } from "next/navigation";
import { recordWatchedAction } from "@/app/actions";
import { platformDeepLink } from "@/lib/platform-links";

const BUTTON_CLASS =
  "rounded-full bg-[var(--cg-primary)] px-[30px] py-[16px] text-[13.5px] font-bold tracking-[.08em] text-[var(--cg-on-primary)] shadow-[0_18px_38px_rgba(2,6,14,.55)] transition-transform active:scale-95";

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
 * (unrestricted mode, or "Other"). */
export function CgWatchNowButton({
  title,
  titleId,
  redirectTo,
  matchingPlatforms,
  platformLinks,
  fallbackUrl,
}: {
  title: string;
  titleId: number;
  redirectTo: string;
  matchingPlatforms: string[];
  platformLinks?: Record<string, string | null>;
  fallbackUrl: string;
}) {
  const router = useRouter();

  function recordWatch() {
    recordWatchedAction(titleId, redirectTo).then(() => router.refresh());
  }

  const deepLinks = matchingPlatforms
    .map((platform) => ({ platform, url: platformLinks?.[platform] || platformDeepLink(platform, title) }))
    .filter((entry): entry is { platform: string; url: string } => entry.url !== null);

  if (deepLinks.length === 0) {
    return (
      <a href={fallbackUrl} target="_blank" rel="noopener noreferrer" onClick={recordWatch} className={BUTTON_CLASS}>
        ▶ WATCH NOW
      </a>
    );
  }

  return (
    <>
      {deepLinks.map(({ platform, url }) => (
        <a
          key={platform}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={recordWatch}
          aria-label={`Watch ${title} on ${platform}`}
          className={BUTTON_CLASS}
        >
          ▶ {platform.toUpperCase()}
        </a>
      ))}
    </>
  );
}
