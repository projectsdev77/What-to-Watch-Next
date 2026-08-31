import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { createClient } from "@/lib/supabase/server";
import { signOutAction } from "@/app/login/actions";

const NAV_LINKS = [
  { href: "/", label: "Tonight's Pick" },
  { href: "/browse", label: "Browse" },
  { href: "/watchlist", label: "Watchlist" },
  { href: "/settings", label: "Settings" },
] as const;

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "What To Watch Next",
  description: "One confident recommendation, instead of an endless scroll.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-black/10 px-4 py-3 dark:border-white/15">
          <div className="flex flex-wrap items-center gap-5">
            <span className="font-semibold">What To Watch Next</span>
            {user && (
              <nav className="flex gap-4 text-sm text-zinc-500">
                {NAV_LINKS.map((link) => (
                  <Link key={link.href} href={link.href} className="hover:text-foreground">
                    {link.label}
                  </Link>
                ))}
              </nav>
            )}
          </div>
          {user && (
            <form action={signOutAction} className="flex items-center gap-3">
              <span className="text-sm text-zinc-500">{user.email}</span>
              <button type="submit" className="text-sm underline">
                Log out
              </button>
            </form>
          )}
        </header>
        {children}
      </body>
    </html>
  );
}
