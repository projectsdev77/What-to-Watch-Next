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
    <main className="flex flex-1 flex-col items-center justify-center bg-sky px-4 py-16">
      <div className="flex w-full max-w-[520px] flex-col items-start gap-4 bg-card p-9 shadow-card">
        <h1 className="font-heading text-[20px] font-semibold tracking-[.18em]">SOMETHING WENT WRONG</h1>
        <p className="max-w-[48ch] text-[15px] leading-[1.7] text-text-2">
          We hit an error loading this page — probably temporary. Give it another try.
        </p>
        <div className="flex gap-[10px] pt-1">
          <button
            onClick={() => retry()}
            className="bg-ink px-[26px] py-[13px] text-[12.5px] font-bold tracking-[.1em] text-white"
          >
            TRY AGAIN
          </button>
          <Link
            href="/"
            className="border border-[rgba(12,35,52,.28)] px-6 py-[13px] text-[12.5px] font-bold tracking-[.1em]"
          >
            GO HOME
          </Link>
        </div>
      </div>
    </main>
  );
}
