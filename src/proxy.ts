import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Keeps Supabase auth cookies fresh on every request. Required so a
// session doesn't silently expire between Server Component renders —
// see https://supabase.com/docs/guides/auth/server-side/nextjs.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    }
  );

  // Required: touching the session is what triggers a refresh when needed.
  // This runs on every request, so a transient Supabase outage here must
  // not take the whole site down with a raw framework error — fail open
  // (treat as unauthenticated) and let each page's own auth check handle
  // it, rather than crashing before any page even gets a chance to
  // render its own error boundary.
  try {
    await supabase.auth.getUser();
  } catch (error) {
    console.error("Proxy: failed to refresh session:", error);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
