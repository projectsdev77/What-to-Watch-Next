"use client";

import { useState } from "react";
import { useActionState } from "react";
import { deleteAccountAction, type DeleteAccountState } from "@/app/settings/actions";
import { DELETE_CONFIRMATION_TEXT } from "@/lib/account";

const LINK_STYLE =
  "self-start text-[12.5px] font-medium text-danger-ink underline decoration-danger-ink/40 underline-offset-2 hover:decoration-danger-ink";

/** Deliberately understated — a plain text link, not a button, so it
 * doesn't read as a call to action next to the app's real CTAs. Starts
 * collapsed; the confirm-DELETE form only appears once someone opens it. */
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
      <p className="text-[13px] leading-[1.6] text-text-2">
        This permanently deletes your account and all data — can&apos;t be undone. Type{" "}
        <span className="font-bold text-danger-ink">{DELETE_CONFIRMATION_TEXT}</span> to confirm.
      </p>
      <input
        id="delete-confirm"
        name="confirm"
        value={confirmText}
        onChange={(e) => setConfirmText(e.target.value)}
        autoComplete="off"
        className="w-full max-w-[200px] border border-[rgba(12,35,52,.30)] px-3 py-[9px] text-[13.5px] text-text-1 focus:border-2 focus:border-danger focus:outline-none"
      />
      {state?.error && <p className="text-[13px] font-medium text-danger-ink">{state.error}</p>}
      <div className="flex items-center gap-4">
        <button type="submit" disabled={!canDelete || pending} className={LINK_STYLE + " disabled:cursor-not-allowed disabled:text-text-3 disabled:no-underline"}>
          {pending ? "Deleting…" : "Confirm delete"}
        </button>
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="text-[12.5px] text-text-3 hover:text-text-2"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
