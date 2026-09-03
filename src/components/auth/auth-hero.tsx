import type { ReactNode } from "react";

/**
 * Shared shell for the log-in / create-account screens: the diagonal
 * steel split + navy accent circle from the redesign mocks. The mocks'
 * left panel is a drop-in photo slot from the design tool — there's no
 * real photography asset pipeline for this app, so it's rendered here
 * as a gradient field instead of a placeholder image.
 */
export function AuthHero({
  tagline,
  slogan,
  children,
}: {
  tagline: string;
  slogan?: ReactNode;
  children: ReactNode;
}) {
  return (
    <main className="flex flex-1 items-center justify-center bg-sky p-4 py-10 sm:p-8">
      <div className="relative min-h-[560px] w-full max-w-[1280px] overflow-hidden bg-steel shadow-panel">
        {/* left "photo" panel — gradient field standing in for real artwork */}
        <div
          className="absolute inset-0 w-[54%]"
          style={{
            background:
              "radial-gradient(120% 140% at 20% 10%, rgba(199,231,247,.55), transparent 60%), radial-gradient(100% 120% at 80% 90%, rgba(12,35,52,.4), transparent 55%), linear-gradient(160deg, #5d8da8, #2f6382)",
          }}
        />
        <div className="absolute inset-0 w-[54%] bg-steel/52" />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(105deg, transparent 0%, transparent 42%, var(--steel) 42.2%)",
          }}
        />
        <div className="absolute -right-[100px] -bottom-[170px] h-[440px] w-[440px] rounded-full bg-ink" />

        <div className="absolute inset-x-0 top-[34px] flex flex-col items-center gap-2 px-4 text-center">
          <span className="font-wordmark text-[26px] tracking-[-.03em] text-white sm:text-[32px]">
            WHAT TO WATCH NEXT
          </span>
          <span className="text-[12px] font-semibold tracking-[.22em] text-white/90 sm:text-[13px]">
            {tagline}
          </span>
        </div>

        {/* items-start + a fixed top offset (rather than items-center)
            guarantees the card never grows up into the tagline above it,
            regardless of how tall the card's content gets (e.g. the
            signup form's password checklist). */}
        <div className="relative flex min-h-[560px] items-start justify-center px-4 pt-[128px] pb-16 sm:pt-[150px]">
          {children}
        </div>

        {slogan && (
          <span className="absolute right-6 bottom-8 hidden w-[250px] text-right text-[18px] leading-[1.5] tracking-[.1em] text-white/85 sm:right-12 sm:bottom-14 sm:block sm:text-[20px]">
            {slogan}
          </span>
        )}
      </div>
    </main>
  );
}
