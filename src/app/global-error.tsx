"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";
// global-error replaces the root layout entirely when active, so it
// doesn't inherit layout.tsx's styles automatically — import them here.
import "./globals.css";

export default function GlobalError({
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
    <html lang="en">
      <body className="flex min-h-screen flex-col items-center justify-center gap-3 px-4 text-center">
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <p className="max-w-md text-sm text-zinc-500">
          The app failed to load — probably temporary. Give it another try.
        </p>
        <button
          onClick={() => retry()}
          className="mt-2 rounded bg-foreground px-4 py-2 text-sm text-background"
        >
          Try again
        </button>
      </body>
    </html>
  );
}
