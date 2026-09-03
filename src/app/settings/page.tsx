import { AppHeader } from "@/components/chrome/app-header";
import { DeleteAccountForm } from "@/components/settings/delete-account-form";
import { PasswordResetSection } from "@/components/settings/password-reset-section";
import { PlatformPickerForm } from "@/components/settings/platform-picker-form";
import { STREAMING_PLATFORMS } from "@/lib/platforms";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { resetTasteProfileAction, updatePlatformsAction } from "./actions";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ passwordResetSent?: string }>;
}) {
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

  const { passwordResetSent } = await searchParams;

  return (
    <div className="flex flex-1 flex-col bg-sky">
      <AppHeader active="/settings" />
      <main className="mx-auto flex w-full max-w-[1000px] flex-1 flex-col gap-8 px-4 py-9 sm:px-10">
        <h1 className="font-heading text-[22px] font-semibold tracking-[.2em]">SETTINGS</h1>

        <section className="flex flex-col gap-[18px] bg-card p-8 shadow-card">
          <span className="text-[12.5px] font-bold tracking-[.16em] text-text-3">LOGGED IN AS</span>
          <p className="text-[16px] font-semibold text-text-1">{user.email}</p>
          <div className="h-px bg-[rgba(12,35,52,.14)]" />
          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-semibold tracking-[.14em] text-text-3">ACCOUNT</span>
            <DeleteAccountForm />
          </div>
        </section>

        <section className="flex flex-col gap-[18px] bg-card p-8 shadow-card">
          <span className="text-[12.5px] font-bold tracking-[.16em] text-text-3">STREAMING PLATFORMS</span>
          <PlatformPickerForm
            action={updatePlatformsAction}
            selected={selected}
            submitLabel="SAVE"
            pendingLabel="SAVING…"
            requireChange
            footer={
              <span className="text-[13px] text-text-3">
                {selected.size} of {STREAMING_PLATFORMS.length} selected
              </span>
            }
          />
        </section>

        <section className="bg-card p-8 shadow-card">
          <PasswordResetSection userEmail={user.email ?? ""} passwordResetSent={passwordResetSent === "true"} />
        </section>

        <section className="flex flex-col gap-[14px] border-t-4 border-danger bg-card p-8 shadow-card">
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
        </section>
      </main>
    </div>
  );
}
