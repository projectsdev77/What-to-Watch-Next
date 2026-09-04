"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

// The 4 Cinematic Glass screens — exact pathnames, none of them have
// further dynamic segments.
const DARK_ROUTES = ["/", "/browse", "/watchlist", "/settings"];

/** Keeps <body>'s own painted background in sync with whichever design
 * system the current route uses. Next.js has only one root <body> (a
 * nested layout can't redeclare it), but body's background is what the
 * browser reveals during rubber-band/overscroll bounce past the top or
 * bottom of the page — without this, that bounce always shows the
 * light theme's sky blue, even on the 4 screens that redesigned dark.
 * Renders nothing; just toggles a class post-mount. */
export function ThemeBodyBackground() {
  const pathname = usePathname();

  useEffect(() => {
    document.body.classList.toggle("cg-body-dark", DARK_ROUTES.includes(pathname));
  }, [pathname]);

  return null;
}
