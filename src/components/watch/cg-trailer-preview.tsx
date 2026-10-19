"use client";

import { useEffect, useState } from "react";

const EMBED_BASE = "https://www.youtube-nocookie.com/embed/";

const DESKTOP_QUERY = "(min-width: 1024px)";

/** Opens the full trailer (sound and controls on) in a modal over the page.
 * `variant="tile"`: a small muted, looping preview to click — the video
 * only loads on desktop-width screens, so phones don't autoplay video on
 * mobile data. `variant="button"`: a compact "Trailer" button, for phones. */
export function CgTrailerPreview({
  youtubeKey,
  title,
  variant,
  className = "",
}: {
  youtubeKey: string;
  title: string;
  variant: "tile" | "button";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [showPreviewVideo, setShowPreviewVideo] = useState(false);

  useEffect(() => {
    if (variant !== "tile") return;
    const query = window.matchMedia(DESKTOP_QUERY);
    const update = () => setShowPreviewVideo(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, [variant]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  // loop needs playlist=<same key> to actually repeat a single video.
  const previewSrc = `${EMBED_BASE}${youtubeKey}?autoplay=1&mute=1&loop=1&playlist=${youtubeKey}&controls=0&playsinline=1&modestbranding=1&rel=0`;
  const fullSrc = `${EMBED_BASE}${youtubeKey}?autoplay=1&playsinline=1&modestbranding=1&rel=0`;

  return (
    <>
      {variant === "button" ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={`rounded-full border border-white/22 bg-white/11 px-[26px] py-[16px] text-[13.5px] font-bold tracking-[.08em] text-[var(--cg-text-1)] transition-transform active:scale-95 ${className}`}
        >
          ▶ TRAILER
        </button>
      ) : (
        <div
          className={`group relative aspect-video overflow-hidden rounded-[18px] border border-white/15 bg-black shadow-[0_24px_60px_rgba(2,6,14,.7)] ${className}`}
        >
          {/* YouTube's still frame shows until (or instead of) the preview
              video. Both are decorative — the button below is the control. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`https://i.ytimg.com/vi/${youtubeKey}/hqdefault.jpg`} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover" />
          {showPreviewVideo && (
            <iframe
              src={previewSrc}
              title={`${title} trailer preview`}
              aria-hidden
              tabIndex={-1}
              loading="lazy"
              allow="autoplay; encrypted-media"
              className="pointer-events-none absolute inset-0 h-full w-full scale-[1.02]"
            />
          )}
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label={`Play the ${title} trailer`}
            className="absolute inset-0 flex items-end justify-start bg-[linear-gradient(180deg,transparent_45%,rgba(2,6,14,.75)_100%)] p-3 text-left transition-colors hover:bg-black/20"
          >
            <span className="flex items-center gap-2 rounded-full bg-white/90 px-3 py-[6px] text-[11.5px] font-bold tracking-[.08em] text-[#060B14] transition-transform group-active:scale-95">
              ▶ WATCH TRAILER
            </span>
          </button>
        </div>
      )}

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${title} trailer`}
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(2,6,14,.88)] p-4 backdrop-blur-[6px] sm:p-10"
        >
          <div onClick={(e) => e.stopPropagation()} className="relative w-full max-w-[1100px]">
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close trailer"
              autoFocus
              className="absolute -top-12 right-0 flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/10 text-[16px] text-white transition-transform active:scale-90"
            >
              ✕
            </button>
            <div className="aspect-video overflow-hidden rounded-[18px] bg-black shadow-[0_40px_100px_rgba(0,0,0,.8)]">
              <iframe
                src={fullSrc}
                title={`${title} trailer`}
                allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
                allowFullScreen
                className="h-full w-full"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
