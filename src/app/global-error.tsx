"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";
import { Archivo, Archivo_Black, Instrument_Sans } from "next/font/google";
// global-error replaces the root layout entirely when active, so it
// doesn't inherit layout.tsx's fonts or styles automatically — both are
// redeclared here.
import "./globals.css";

const archivo = Archivo({ variable: "--font-archivo", weight: ["600"], subsets: ["latin"] });
const archivoBlack = Archivo_Black({ variable: "--font-archivo-black", weight: "400", subsets: ["latin"] });
const instrumentSans = Instrument_Sans({ variable: "--font-instrument-sans", weight: ["400", "600"], subsets: ["latin"] });

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
    <html lang="en" className={`${archivo.variable} ${archivoBlack.variable} ${instrumentSans.variable}`}>
      <body className="flex min-h-screen flex-col items-center justify-center bg-sky px-4">
        <div className="flex w-full max-w-[520px] flex-col items-start gap-4 bg-card p-9 shadow-card">
          <h1 className="font-heading text-[20px] font-semibold tracking-[.18em]">SOMETHING WENT WRONG</h1>
          <p className="max-w-[48ch] text-[15px] leading-[1.7] text-text-2">
            The app failed to load — probably temporary. Give it another try.
          </p>
          <button
            onClick={() => retry()}
            className="bg-ink px-[26px] py-[13px] text-[12.5px] font-bold tracking-[.1em] text-white"
          >
            TRY AGAIN
          </button>
        </div>
      </body>
    </html>
  );
}
