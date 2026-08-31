import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOnboardingStatus } from "@/lib/onboarding";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { hasPlatforms, hasTasteProfile } = await getOnboardingStatus(user.id);
  if (!hasPlatforms) redirect("/onboarding/platforms");
  if (!hasTasteProfile) redirect("/onboarding/quiz");

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <h1 className="mb-2 text-2xl font-semibold">Tonight&apos;s Pick</h1>
      <p className="max-w-md text-sm text-zinc-500">
        Signed in as {user.email}. Onboarding is done — the recommendation engine
        (Phase 3) isn&apos;t built yet, so this is a placeholder for where your one
        confident &quot;watch this tonight&quot; pick will show up.
      </p>
    </main>
  );
}
