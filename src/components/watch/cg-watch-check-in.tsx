import Image from "next/image";
import { clearPendingWatchAction, submitWatchedFeedbackAction } from "@/app/actions";
import { CgSubmitButton } from "@/components/watch/cg-submit-button";
import { TMDB_POSTER_BASE_URL } from "@/lib/tmdb";

/** Shown on Tonight's Pick in place of a new pick while a Watch Now click
 * is still waiting for the user's opinion. Liked / Didn't like record it
 * (and move their taste profile); Haven't watched it clears the pending
 * mark so the pick comes back. */
export function CgWatchCheckIn({
  titleId,
  title,
  posterPath,
  redirectTo,
}: {
  titleId: number;
  title: string;
  posterPath: string | null;
  redirectTo: string;
}) {
  const primary =
    "rounded-full bg-[var(--cg-primary)] px-[26px] py-[13px] text-[12.5px] font-bold tracking-[.1em] text-[var(--cg-on-primary)]";
  const secondary =
    "rounded-full border border-white/18 bg-white/9 px-[26px] py-[13px] text-[12.5px] font-semibold tracking-[.1em] text-[var(--cg-text-1)]";

  return (
    <div className="cg-pane mx-auto flex w-full max-w-[560px] flex-col items-center gap-5 p-9 text-center">
      {posterPath && (
        <div className="relative aspect-[2/3] w-[140px] overflow-hidden rounded-[var(--cg-r-poster)] shadow-[0_20px_44px_rgba(2,6,14,.6)]">
          <Image src={`${TMDB_POSTER_BASE_URL}${posterPath}`} alt={title} fill sizes="140px" className="object-cover" />
        </div>
      )}
      <span className="text-[11.5px] font-bold tracking-[.2em] text-[var(--cg-accent)]">HOW WAS IT?</span>
      <h1 className="font-heading text-[28px] leading-[1.1] font-bold tracking-[-.03em] text-balance">{title}</h1>
      <p className="max-w-[40ch] text-[14.5px] leading-[1.6] text-[var(--cg-text-2)]">
        Let us know what you thought and we&apos;ll use it to pick your next one.
      </p>
      <div className="flex flex-wrap justify-center gap-[10px] pt-1">
        <form action={submitWatchedFeedbackAction}>
          <input type="hidden" name="titleId" value={titleId} />
          <input type="hidden" name="status" value="liked" />
          <input type="hidden" name="redirectTo" value={redirectTo} />
          <CgSubmitButton className={primary} pendingLabel="…">
            LIKED IT
          </CgSubmitButton>
        </form>
        <form action={submitWatchedFeedbackAction}>
          <input type="hidden" name="titleId" value={titleId} />
          <input type="hidden" name="status" value="disliked" />
          <input type="hidden" name="redirectTo" value={redirectTo} />
          <CgSubmitButton className={secondary} pendingLabel="…">
            DIDN&apos;T LIKE IT
          </CgSubmitButton>
        </form>
      </div>
      <form action={clearPendingWatchAction}>
        <input type="hidden" name="titleId" value={titleId} />
        <input type="hidden" name="redirectTo" value={redirectTo} />
        <CgSubmitButton
          className="bg-transparent text-[13px] font-medium text-[var(--cg-text-3)] underline decoration-white/30 underline-offset-2 hover:text-[var(--cg-text-2)]"
          pendingLabel="…"
        >
          Haven&apos;t watched it yet
        </CgSubmitButton>
      </form>
    </div>
  );
}
