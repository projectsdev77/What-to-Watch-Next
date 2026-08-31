import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client. Bypasses Row Level Security entirely.
 *
 * Only ever import this from trusted server-side code (seed scripts,
 * background sync jobs) — never from a Route Handler that acts on
 * behalf of a signed-in user, and never from anything that can be
 * imported into a Client Component.
 *
 * NOTE: deliberately not using the `server-only` package here — it
 * throws unconditionally outside of Next's own bundler, which breaks
 * this module's other legitimate caller, scripts/seed-titles.ts (run
 * directly via tsx/Node, not through Next). The service-role key is
 * also not NEXT_PUBLIC_-prefixed, so even an accidental client-bundle
 * import would fail closed (undefined env var) rather than leak it.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set to use the admin client."
    );
  }

  return createSupabaseClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
