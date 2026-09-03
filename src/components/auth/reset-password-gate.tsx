"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

type Status = "checking" | "ready" | "invalid" | "not-recovery";

const LINK_BUTTON =
  "bg-ink px-4 py-[15px] text-center text-[13.5px] font-bold tracking-[.14em] text-white";

/** True if the URL carries any marker of a Supabase auth redirect —
 * the exact shape varies by flow: the older implicit flow puts
 * access_token/type=recovery in the hash fragment, PKCE puts a code (and
 * usually type) in the query string. Check broadly rather than betting on
 * one specific shape. */
function hasRecoveryParams() {
  const hash = window.location.hash;
  const search = window.location.search;
  return (
    hash.includes("type=recovery") ||
    hash.includes("access_token") ||
    search.includes("code=") ||
    search.includes("token_hash=") ||
    new URLSearchParams(search).get("type") === "recovery"
  );
}

/**
 * Decides what to show on /reset-password's default (no success/error
 * query param) state — and, for the actual recovery flow, establishes the
 * session in the first place.
 *
 * Supabase's password-recovery email links carry session tokens in the
 * URL — in the hash fragment for the older implicit flow, or a query
 * `code`/`token_hash` for PKCE. Either way, a server render never sees
 * it (browsers don't send the hash to the server, and query-based codes
 * still need exchanging), so establishing the session has to happen
 * here, client-side: the Supabase browser client consumes it as soon as
 * it's created and fires an auth state change once the session lands,
 * persisting it to cookies so the follow-up form submit (a Server
 * Function) can see it too. Which specific event fires can vary by flow
 * (PASSWORD_RECOVERY vs a plain SIGNED_IN from a PKCE code exchange), so
 * any session appearing while we know we arrived via a reset link is
 * treated as the recovery session — otherwise a PKCE project would
 * silently log the user in without ever showing the reset form.
 */
export function ResetPasswordGate() {
  const [status, setStatus] = useState<Status>("checking");
  const router = useRouter();

  useEffect(() => {
    const isRecoveryAttempt = hasRecoveryParams();
    const supabase = createClient();

    if (!isRecoveryAttempt) {
      // No reset-link markers in the URL at all: either someone already
      // logged in browsed here directly (send them to Settings, where the
      // real "email me a reset link" flow lives), or there's genuinely
      // nothing to do here.
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) router.replace("/settings");
        else setStatus("not-recovery");
      });
      return;
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) setStatus("ready");
    });

    // Covers the case where the exchange already finished by the time
    // this effect runs (e.g. a fast PKCE code exchange completing before
    // the listener above attached).
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setStatus("ready");
    });

    const timeout = setTimeout(() => {
      setStatus((current) => (current === "checking" ? "invalid" : current));
    }, 6000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [router]);

  if (status === "ready") return <ResetPasswordForm />;

  if (status === "checking") {
    return <p className="text-[14px] text-text-2">Verifying your reset link…</p>;
  }

  if (status === "not-recovery") {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-[14px] leading-[1.65] text-text-2">
          This page is only reachable from a password reset email.
        </p>
        <Link href="/forgot-password" className={LINK_BUTTON}>
          REQUEST A RESET LINK
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[14px] leading-[1.65] text-text-2">
        This password reset link is invalid or has expired.
      </p>
      <Link href="/forgot-password" className={LINK_BUTTON}>
        REQUEST A NEW LINK
      </Link>
    </div>
  );
}
