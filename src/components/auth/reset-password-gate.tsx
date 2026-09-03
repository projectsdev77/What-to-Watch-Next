"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

type Status = "checking" | "ready" | "invalid" | "not-recovery";

const LINK_BUTTON =
  "bg-ink px-4 py-[15px] text-center text-[13.5px] font-bold tracking-[.14em] text-white";

/**
 * Decides what to show on /reset-password's default (no success/error
 * query param) state — and, for the actual recovery flow, establishes the
 * session in the first place.
 *
 * Supabase's password-recovery email links carry the session tokens in
 * the URL *hash* fragment (#access_token=...&type=recovery). A server
 * render never sees that — browsers never send the hash to the server —
 * so a Server Component checking auth.getSession() on first load always
 * finds nothing, even for a link that just arrived. Establishing the
 * session has to happen here, client-side: the Supabase browser client
 * auto-detects and consumes the hash on creation and fires a
 * PASSWORD_RECOVERY auth event once the session lands, persisting it to
 * cookies so the follow-up form submit (a Server Function) can see it too.
 */
export function ResetPasswordGate() {
  const [status, setStatus] = useState<Status>("checking");
  const router = useRouter();

  useEffect(() => {
    const hasRecoveryMarker =
      window.location.hash.includes("type=recovery") ||
      new URLSearchParams(window.location.search).get("type") === "recovery";

    const supabase = createClient();

    if (!hasRecoveryMarker) {
      // No recovery markers in the URL at all: either someone already
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
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" && session) setStatus("ready");
    });

    const timeout = setTimeout(() => {
      setStatus((current) => (current === "checking" ? "invalid" : current));
    }, 4000);

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
