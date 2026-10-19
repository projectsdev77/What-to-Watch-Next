"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const EMBED_ORIGIN = "https://www.youtube-nocookie.com";
const EMBED_BASE = `${EMBED_ORIGIN}/embed/`;

const DESKTOP_QUERY = "(min-width: 1024px)";
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
const AUTOPLAY_DELAY_MS = 1500;

function formatDuration(seconds: number) {
  const s = Math.round(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** Tonight's Pick trailer card: a 16:9 still with a "Watch trailer" bar.
 * On desktop it starts a muted, looping preview after 1.5s on the page (or
 * sooner on hover), with a progress bar and a pause button. Phones and
 * reduced-motion users only get the still, so nothing autoplays on mobile
 * data. Clicking anywhere opens the full trailer (sound and controls on) in
 * a modal over the page; closing it leaves the pick exactly as it was. */
export function CgTrailerPreview({
  youtubeKey,
  title,
  className = "",
}: {
  youtubeKey: string;
  title: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [canAutoplay, setCanAutoplay] = useState(false);
  const [started, setStarted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState<{ current: number; duration: number } | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const desktop = window.matchMedia(DESKTOP_QUERY);
    const reduced = window.matchMedia(REDUCED_MOTION_QUERY);
    const update = () => setCanAutoplay(desktop.matches && !reduced.matches);
    update();
    desktop.addEventListener("change", update);
    reduced.addEventListener("change", update);
    return () => {
      desktop.removeEventListener("change", update);
      reduced.removeEventListener("change", update);
    };
  }, []);

  useEffect(() => {
    if (!canAutoplay || started) return;
    const timer = setTimeout(() => setStarted(true), AUTOPLAY_DELAY_MS);
    return () => clearTimeout(timer);
  }, [canAutoplay, started]);

  // The embed reports its playback time over postMessage once we say we're
  // listening — enough for the progress bar and duration, without loading
  // YouTube's full IFrame API script.
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.origin !== EMBED_ORIGIN || e.source !== iframeRef.current?.contentWindow) return;
      try {
        const data = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
        const info = data?.info;
        if (info && typeof info.currentTime === "number") {
          setProgress((prev) => ({
            current: info.currentTime,
            duration: typeof info.duration === "number" && info.duration > 0 ? info.duration : (prev?.duration ?? 0),
          }));
        }
      } catch {
        // Not a message we understand — ignore it.
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  const startListening = useCallback(() => {
    iframeRef.current?.contentWindow?.postMessage(JSON.stringify({ event: "listening", id: "wwn-trailer" }), EMBED_ORIGIN);
  }, []);

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

  const playing = canAutoplay && started && !paused && !open;
  // loop needs playlist=<same key> to actually repeat a single video.
  const previewSrc = `${EMBED_BASE}${youtubeKey}?autoplay=1&mute=1&loop=1&playlist=${youtubeKey}&controls=0&playsinline=1&modestbranding=1&rel=0&enablejsapi=1`;
  const fullSrc = `${EMBED_BASE}${youtubeKey}?autoplay=1&playsinline=1&modestbranding=1&rel=0`;
  const durationLabel = progress?.duration ? ` · ${formatDuration(progress.duration)}` : "";
  const percent = progress?.duration ? Math.min(100, (progress.current / progress.duration) * 100) : 0;

  return (
    <>
      <div
        onMouseEnter={() => canAutoplay && setStarted(true)}
        className={`relative aspect-video overflow-hidden rounded-[24px] border border-white/22 bg-[rgba(6,11,20,.5)] shadow-[0_30px_60px_rgba(0,0,0,.55)] ${className}`}
      >
        {/* The still and the preview are decorative — the full-card button
            below is the control. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`https://i.ytimg.com/vi/${youtubeKey}/hqdefault.jpg`}
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full object-cover"
        />
        {playing && (
          <iframe
            ref={iframeRef}
            src={previewSrc}
            title={`${title} trailer preview`}
            aria-hidden
            tabIndex={-1}
            allow="autoplay; encrypted-media"
            onLoad={startListening}
            className="pointer-events-none absolute inset-0 h-full w-full scale-[1.02]"
          />
        )}
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={`Play the ${title} trailer`}
          className="absolute inset-0 transition-colors hover:bg-black/10"
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center gap-[12px] bg-[linear-gradient(0deg,rgba(6,11,20,.85),rgba(6,11,20,0))] px-[16px] pt-[22px] pb-[14px]">
          <span
            aria-hidden
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--cg-primary)] text-[13px] text-[var(--cg-on-primary)]"
          >
            ▶
          </span>
          <div className="flex min-w-0 flex-col gap-[2px]">
            <span className="text-[13px] font-bold tracking-[.1em]">WATCH TRAILER</span>
            <span className="text-[12px] text-[rgba(234,242,250,.75)]">Official trailer{durationLabel}</span>
          </div>
          {canAutoplay && started && (
            <div className="pointer-events-auto relative z-10 ml-auto flex items-center gap-[6px]">
              {!paused && (
                <span className="rounded-full border border-white/22 bg-[rgba(6,11,20,.55)] px-[10px] py-[6px] text-[11px] font-semibold">
                  Muted
                </span>
              )}
              <button
                type="button"
                onClick={() => setPaused((p) => !p)}
                aria-label={paused ? "Play the preview" : "Pause the preview"}
                className="flex h-[28px] w-[28px] items-center justify-center rounded-full border border-white/22 bg-[rgba(6,11,20,.55)] text-[10px] transition-transform active:scale-90"
              >
                {paused ? "▶" : "❚❚"}
              </button>
            </div>
          )}
        </div>
        {playing && (
          <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-[3px] bg-white/18">
            <div className="h-full bg-[var(--cg-accent)] transition-[width] duration-300" style={{ width: `${percent}%` }} />
          </div>
        )}
      </div>

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
