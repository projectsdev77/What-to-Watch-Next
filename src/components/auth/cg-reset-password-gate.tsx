"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { CgResetPasswordForm } from "@/components/auth/cg-reset-password-form";

type Status = "checking" | "ready" | "invalid" | "not-recovery";

const LINK_BUTTON =
  "rounded-[var(--cg-r-input)] bg-[var(--cg-primary)] px-4 py-[15px] text-center text-[13.5px] font-bold tracking-[.14em] text-[var(--cg-on-primary)]";

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
 * session in the first place. See the original ResetPasswordGate for the
 * full rationale; this is the same logic under the Cinematic Glass button
 * styling.
 */
export function CgResetPasswordGate() {
  const [status, setStatus] = useState<Status>("checking");
  const router = useRouter();

  useEffect(() => {
    const isRecoveryAttempt = hasRecoveryParams();
    const supabase = createClient();

    if (!isRecoveryAttempt) {
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

  if (status === "ready") return <CgResetPasswordForm />;

  if (status === "checking") {
    return <p className="text-[14px] text-[var(--cg-text-2)]">Verifying your reset link…</p>;
  }

  if (status === "not-recovery") {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-[14px] leading-[1.65] text-[var(--cg-text-2)]">
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
      <p className="text-[14px] leading-[1.65] text-[var(--cg-text-2)]">
        This password reset link is invalid or has expired.
      </p>
      <Link href="/forgot-password" className={LINK_BUTTON}>
        REQUEST A NEW LINK
      </Link>
    </div>
  );
}
