import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CgPlatformPickerForm } from "@/components/settings/cg-platform-picker-form";
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
    <div className="cg-screen relative min-h-screen bg-[var(--cg-ground-alt)] font-sans text-[var(--cg-text-1)]">
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(6,11,20,.78)_0%,rgba(6,11,20,.96)_26%,#070D18_46%)]" />
      <div className="relative mx-auto flex min-h-screen max-w-[720px] flex-col items-center justify-center gap-6 p-[22px] pb-16">
        <span className="font-wordmark text-[20px] tracking-[-.03em] text-[var(--cg-text-1)]">WWN</span>
        <div className="cg-pane w-full p-[30px] sm:p-[38px]">
          <h1 className="mb-1 font-heading text-[22px] font-semibold tracking-[.2em]">
            WHICH SERVICES DO YOU HAVE?
          </h1>
          <p className="mb-6 text-[14px] text-[var(--cg-text-2)]">
            We&apos;ll only ever recommend something you can actually watch. Don&apos;t see yours, or don&apos;t
            have one? Pick &quot;Other&quot; and we&apos;ll show you everything instead.
          </p>
          <CgPlatformPickerForm
            action={savePlatformsAction}
            selected={selected}
            submitLabel="CONTINUE"
            pendingLabel="SAVING…"
          />
        </div>
      </div>
    </div>
  );
}
