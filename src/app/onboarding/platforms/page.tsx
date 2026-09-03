import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PlatformPickerForm } from "@/components/settings/platform-picker-form";
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
          We&apos;ll only ever recommend something you can actually watch. Don&apos;t see yours, or don&apos;t have
          one? Pick &quot;Other&quot; and we&apos;ll show you everything instead.
        </p>
        <PlatformPickerForm
          action={savePlatformsAction}
          selected={selected}
          submitLabel="CONTINUE"
          pendingLabel="SAVING…"
        />
      </div>
    </main>
  );
}
