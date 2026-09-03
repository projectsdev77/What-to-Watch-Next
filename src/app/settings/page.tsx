import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { STREAMING_PLATFORMS } from "@/lib/platforms";
import { PlatformPickerForm } from "@/components/settings/platform-picker-form";
import { AppHeader } from "@/components/chrome/app-header";
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
    <div className="flex flex-1 flex-col bg-sky">
      <AppHeader active="/settings" />
      <main className="mx-auto grid w-full max-w-[1280px] flex-1 items-start gap-[22px] px-4 py-9 sm:px-10 lg:grid-cols-[1fr_380px]">
        <div className="flex flex-col gap-6 bg-card p-8 shadow-card">
          <div className="flex flex-col gap-1">
            <h1 className="font-heading text-[22px] font-semibold tracking-[.2em]">SETTINGS</h1>
            <p className="text-[13.5px] text-text-2">Signed in as {user.email}</p>
          </div>
          <div className="h-px bg-[rgba(12,35,52,.14)]" />
          <div className="flex flex-col gap-[14px]">
            <span className="text-[12.5px] font-bold tracking-[.16em] text-text-3">STREAMING PLATFORMS</span>
            <PlatformPickerForm
              action={updatePlatformsAction}
              selected={selected}
              submitLabel="SAVE"
              pendingLabel="SAVING…"
              footer={
                <span className="text-[13px] text-text-3">
                  {selected.size} of {STREAMING_PLATFORMS.length} selected
                </span>
              }
            />
          </div>
        </div>

        <div className="flex flex-col gap-[13px] border-t-4 border-danger bg-card p-7 shadow-card">
          <span className="text-[12.5px] font-bold tracking-[.16em] text-danger">TASTE PROFILE</span>
          <p className="text-[14px] leading-[1.65] text-text-2">
            This clears every rating and watchlist entry and sends you back through the taste quiz. Can&apos;t be
            undone.
          </p>
          <form action={resetTasteProfileAction}>
            <button
              type="submit"
              className="self-start border border-danger px-6 py-[13px] text-[12.5px] font-bold tracking-[.1em] text-danger"
            >
              RESET TASTE PROFILE
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
