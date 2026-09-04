"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

// The Cinematic Glass screens — exact pathnames for the 4 that have
// none, plus title detail (/title/[id], a dynamic segment matched by
// prefix below).
const DARK_ROUTES = ["/", "/browse", "/watchlist", "/settings"];
const DARK_PREFIXES = ["/title/"];

/** Keeps <body>'s own painted background in sync with whichever design
 * system the current route uses. Next.js has only one root <body> (a
 * nested layout can't redeclare it), but body's background is what the
 * browser reveals during rubber-band/overscroll bounce past the top or
 * bottom of the page — without this, that bounce always shows the
 * light theme's sky blue, even on the screens that redesigned dark.
 * Renders nothing; just toggles a class post-mount. */
export function ThemeBodyBackground() {
  const pathname = usePathname();

  useEffect(() => {
    const isDark = DARK_ROUTES.includes(pathname) || DARK_PREFIXES.some((p) => pathname.startsWith(p));
    document.body.classList.toggle("cg-body-dark", isDark);
  }, [pathname]);

  return null;
}
