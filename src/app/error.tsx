"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="cg-screen relative flex min-h-screen flex-col items-center justify-center bg-[var(--cg-ground-alt)] px-4 py-16 font-sans text-[var(--cg-text-1)]">
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(6,11,20,.78)_0%,rgba(6,11,20,.96)_26%,#070D18_46%)]" />
      <div className="cg-pane relative flex w-full max-w-[520px] flex-col items-start gap-4 p-9">
        <h1 className="font-heading text-[20px] font-semibold tracking-[.18em]">SOMETHING WENT WRONG</h1>
        <p className="max-w-[48ch] text-[15px] leading-[1.7] text-[var(--cg-text-2)]">
          We hit an error loading this page — probably temporary. Give it another try.
        </p>
        <div className="flex gap-[10px] pt-1">
          <button
            onClick={() => retry()}
            className="rounded-[var(--cg-r-input)] bg-[var(--cg-primary)] px-[26px] py-[13px] text-[12.5px] font-bold tracking-[.1em] text-[var(--cg-on-primary)]"
          >
            TRY AGAIN
          </button>
          <Link
            href="/"
            className="rounded-[var(--cg-r-input)] border border-white/18 bg-white/8 px-6 py-[13px] text-[12.5px] font-bold tracking-[.1em] text-[var(--cg-text-1)]"
          >
            GO HOME
          </Link>
        </div>
      </div>
    </div>
  );
}
