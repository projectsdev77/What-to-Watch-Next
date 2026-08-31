import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { STREAMING_PLATFORMS } from "@/lib/platforms";
import { savePlatformsAction } from "./actions";

export default async function PlatformsOnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: existing } = await supabase
    .from("user_platforms")
    .select("platform_name")
    .eq("user_id", user.id);
  const selected = new Set((existing ?? []).map((p) => p.platform_name as string));

  return (
    <main className="flex flex-1 flex-col items-center px-4 py-16">
      <div className="w-full max-w-md">
        <h1 className="mb-1 text-2xl font-semibold">Which streaming services do you have?</h1>
        <p className="mb-6 text-sm text-zinc-500">
          We&apos;ll only ever recommend something you can actually watch.
        </p>
        <form action={savePlatformsAction} className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            {STREAMING_PLATFORMS.map((name) => (
              <label
                key={name}
                className="flex items-center gap-2 rounded border border-black/10 px-3 py-2 dark:border-white/15"
              >
                <input
                  type="checkbox"
                  name="platforms"
                  value={name}
                  defaultChecked={selected.has(name)}
                />
                {name}
              </label>
            ))}
          </div>
          <button type="submit" className="mt-3 rounded bg-foreground px-4 py-2 text-background">
            Continue
          </button>
        </form>
      </div>
    </main>
  );
}
