import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { STREAMING_PLATFORMS } from "@/lib/platforms";
import { PlatformCheckbox } from "@/components/settings/platform-checkbox";
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
    <main className="flex flex-1 flex-col items-center bg-sky px-4 py-16">
      <div className="w-full max-w-md bg-card p-8 shadow-card">
        <h1 className="mb-1 font-heading text-[22px] font-semibold tracking-[.2em]">
          WHICH SERVICES DO YOU HAVE?
        </h1>
        <p className="mb-6 text-[14px] text-text-2">
          We&apos;ll only ever recommend something you can actually watch.
        </p>
        <form action={savePlatformsAction} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            {STREAMING_PLATFORMS.map((name) => (
              <PlatformCheckbox key={name} name={name} checked={selected.has(name)} />
            ))}
          </div>
          <button
            type="submit"
            className="mt-2 self-start bg-ink px-[34px] py-[14px] text-[12.5px] font-bold tracking-[.12em] text-white"
          >
            CONTINUE
          </button>
        </form>
      </div>
    </main>
  );
}
