import { createClient } from "@/lib/supabase/server";
import { CgNavPillClient, type NavHref } from "@/components/chrome/cg-nav-pill-client";

/** The Cinematic Glass nav pill, used on every screen. Server Component
 * so it can look up the signed-in user directly; the actual markup
 * (including the mobile hamburger toggle) lives in the client half,
 * since that needs interactive state a Server Component can't hold. */
export async function CgNavPill({ active }: { active?: NavHref }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return <CgNavPillClient active={active} userEmail={user?.email ?? null} />;
}
