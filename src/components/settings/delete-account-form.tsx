"use client";

import { useState } from "react";
import { useActionState } from "react";
import { deleteAccountAction, type DeleteAccountState } from "@/app/settings/actions";
import { DELETE_CONFIRMATION_TEXT } from "@/lib/account";

const LINK_STYLE = "self-start text-[13.5px] font-medium text-[var(--cg-danger)] underline decoration-[rgba(240,164,140,.4)] underline-offset-2 hover:decoration-[var(--cg-danger)]";

/** Deliberately understated — a plain text link, not a button, so it
 * doesn't read as a call to action next to the app's real CTAs. Starts
 * collapsed; the confirm-DELETE form only appears once someone opens it.
 * Cinematic Glass styling — this component is settings-only, so no other
 * screen is affected. */
export function DeleteAccountForm() {
  const [state, formAction, pending] = useActionState<DeleteAccountState | undefined, FormData>(
    deleteAccountAction,
    undefined
  );
  const [expanded, setExpanded] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const canDelete = confirmText === DELETE_CONFIRMATION_TEXT;

  if (!expanded) {
    return (
      <button type="button" onClick={() => setExpanded(true)} className={LINK_STYLE}>
        Delete my account
      </button>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <p className="text-[13px] leading-[1.6] text-[var(--cg-text-2)]">
        This permanently deletes your account and all data — can&apos;t be undone. Type{" "}
        <span className="font-bold text-[var(--cg-danger)]">{DELETE_CONFIRMATION_TEXT}</span> to confirm.
      </p>
      <input
        id="delete-confirm"
        name="confirm"
        value={confirmText}
        onChange={(e) => setConfirmText(e.target.value)}
        autoComplete="off"
        className="w-full max-w-[200px] rounded-[var(--cg-r-input)] border border-white/16 bg-white/6 px-3 py-[9px] text-[13.5px] text-[var(--cg-text-1)] focus:border-[var(--cg-danger)] focus:outline-none"
      />
      {state?.error && <p className="text-[13px] font-medium text-[var(--cg-danger)]">{state.error}</p>}
      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={!canDelete || pending}
          className={LINK_STYLE + " disabled:cursor-not-allowed disabled:text-[var(--cg-text-3)] disabled:no-underline"}
        >
          {pending ? "Deleting…" : "Confirm delete"}
        </button>
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="text-[12.5px] text-[var(--cg-text-3)] hover:text-[var(--cg-text-2)]"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
