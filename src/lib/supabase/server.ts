import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// For use in Server Components, Route Handlers, and Server Functions only.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Called from a Server Component that can't set cookies.
            // Safe to ignore when session refresh is handled elsewhere
            // (e.g. in a proxy/middleware), which we'll add once auth lands.
          }
        },
      },
    }
  );
}
