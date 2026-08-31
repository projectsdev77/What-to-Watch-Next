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
    <main className="flex flex-1 flex-col items-center justify-center gap-3 px-4 py-16 text-center">
      <h1 className="text-xl font-semibold">Something went wrong</h1>
      <p className="max-w-md text-sm text-zinc-500">
        We hit an error loading this page — probably temporary. Give it another try.
      </p>
      <div className="mt-2 flex gap-3">
        <button onClick={() => retry()} className="rounded bg-foreground px-4 py-2 text-sm text-background">
          Try again
        </button>
        <Link href="/" className="rounded border border-black/10 px-4 py-2 text-sm dark:border-white/15">
          Go home
        </Link>
      </div>
    </main>
  );
}
