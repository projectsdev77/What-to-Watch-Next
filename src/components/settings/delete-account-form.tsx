"use client";

import { useState } from "react";
import { useActionState } from "react";
import { deleteAccountAction, type DeleteAccountState } from "@/app/settings/actions";
import { DELETE_CONFIRMATION_TEXT } from "@/lib/account";

export function DeleteAccountForm() {
  const [state, formAction, pending] = useActionState<DeleteAccountState | undefined, FormData>(
    deleteAccountAction,
    undefined
  );
  const [confirmText, setConfirmText] = useState("");
  const canDelete = confirmText === DELETE_CONFIRMATION_TEXT;

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <label htmlFor="delete-confirm" className="text-[13px] text-text-2">
        Type <span className="font-bold text-danger">{DELETE_CONFIRMATION_TEXT}</span> to confirm.
      </label>
      <input
        id="delete-confirm"
        name="confirm"
        value={confirmText}
        onChange={(e) => setConfirmText(e.target.value)}
        autoComplete="off"
        className="w-full max-w-[220px] border border-[rgba(12,35,52,.30)] px-4 py-[11px] text-[14px] text-text-1 focus:border-2 focus:border-danger focus:outline-none"
      />
      {state?.error && <p className="text-[13px] font-medium text-danger-ink">{state.error}</p>}
      <button
        type="submit"
        disabled={!canDelete || pending}
        className="self-start bg-danger px-6 py-[13px] text-[12.5px] font-bold tracking-[.1em] text-white disabled:cursor-not-allowed disabled:opacity-40"
      >
        {pending ? "DELETING…" : "DELETE MY ACCOUNT"}
      </button>
    </form>
  );
}
