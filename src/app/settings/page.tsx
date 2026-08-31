import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { STREAMING_PLATFORMS } from "@/lib/platforms";
import { updatePlatformsAction, resetTasteProfileAction } from "./actions";

export default async function SettingsPage() {
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
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-10 px-4 py-12">
      <section>
        <h1 className="mb-1 text-2xl font-semibold">Settings</h1>
        <p className="mb-6 text-sm text-zinc-500">Signed in as {user.email}</p>

        <h2 className="mb-2 text-sm font-medium text-zinc-400">Streaming platforms</h2>
        <form action={updatePlatformsAction} className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            {STREAMING_PLATFORMS.map((name) => (
              <label
                key={name}
                className="flex items-center gap-2 rounded border border-black/10 px-3 py-2 dark:border-white/15"
              >
                <input type="checkbox" name="platforms" value={name} defaultChecked={selected.has(name)} />
                {name}
              </label>
            ))}
          </div>
          <button type="submit" className="mt-1 self-start rounded bg-foreground px-4 py-2 text-sm text-background">
            Save
          </button>
        </form>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-medium text-zinc-400">Taste profile</h2>
        <p className="mb-3 text-sm text-zinc-500">
          This clears every rating and watchlist entry and sends you back through the taste quiz. Can&apos;t be
          undone.
        </p>
        <form action={resetTasteProfileAction}>
          <button type="submit" className="rounded border border-red-500/40 px-4 py-2 text-sm text-red-500">
            Reset taste profile
          </button>
        </form>
      </section>
    </main>
  );
}
