import type { ReactNode } from "react";

/** Cinematic Glass shell for the log-in / create-account / password-recovery
 * screens: same dark ground + gradient treatment as the other screens, with
 * a centered cg-pane card in place of the diagonal steel split. No CgNavPill
 * here — these routes are reached signed out, so there's nothing to nav to
 * yet. */
export function CgAuthHero({ tagline, children }: { tagline: string; children: ReactNode }) {
  return (
    <div className="cg-screen relative flex min-h-screen flex-col bg-[var(--cg-ground-alt)] font-sans text-[var(--cg-text-1)]">
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 100% at 50% -10%, rgba(159,212,236,.14), transparent 60%), linear-gradient(180deg, #0a1220 0%, #060b14 100%)",
        }}
      />
      <div className="relative flex flex-1 flex-col items-center justify-center gap-8 p-4 py-10 sm:p-8">
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="font-wordmark text-[26px] tracking-[-.03em] text-[var(--cg-text-1)] sm:text-[32px]">
            WHAT TO WATCH NEXT
          </span>
          <span className="text-[12px] font-semibold tracking-[.22em] text-[var(--cg-text-3)] sm:text-[13px]">
            {tagline}
          </span>
        </div>
        <div className="cg-pane w-full max-w-[420px] px-8 py-9">{children}</div>
        <span className="px-1 text-[12px] text-[var(--cg-text-legal)]">
          © 2026 What To Watch Next.
        </span>
      </div>
    </div>
  );
}
