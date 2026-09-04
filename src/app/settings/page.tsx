import { CgNavPill } from "@/components/chrome/cg-nav-pill";
import { CgPlatformPickerForm } from "@/components/settings/cg-platform-picker-form";
import { DeleteAccountForm } from "@/components/settings/delete-account-form";
import { PasswordResetSection } from "@/components/settings/password-reset-section";
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
  const initial = (user.email ?? "?").charAt(0).toUpperCase();

  return (
    <div className="cg-screen relative min-h-screen overflow-hidden bg-[var(--cg-ground-alt)] font-sans text-[var(--cg-text-1)]">
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(6,11,20,.78)_0%,rgba(6,11,20,.96)_26%,#070D18_46%)]" />

      <div className="relative mx-auto flex max-w-[1280px] flex-col gap-6 p-[22px] pb-16">
        <CgNavPill active="/settings" />

        <div className="flex flex-col gap-[6px] px-2 pt-1">
          <span className="font-heading text-[38px] font-bold tracking-[-.035em]">Settings</span>
          <span className="text-[14.5px] text-[var(--cg-text-2)]">
            Manage your account, streaming platforms, and taste profile.
          </span>
        </div>

        <div className="grid grid-cols-1 items-start gap-[18px] lg:grid-cols-[1fr_400px]">
          <div className="cg-pane flex flex-col gap-[22px] p-[30px]">
            <span className="text-[11.5px] font-bold tracking-[.2em] text-[var(--cg-text-3)]">
              STREAMING PLATFORMS
            </span>
            <CgPlatformPickerForm
              action={updatePlatformsAction}
              selected={selected}
              submitLabel="SAVE"
              pendingLabel="SAVING…"
              footer={
                <span className="rounded-full border border-white/16 bg-white/9 px-[14px] py-[7px] text-[12px] font-semibold">
                  {selected.size} / {STREAMING_PLATFORMS.length}
                </span>
              }
            />
          </div>

          <div className="flex flex-col gap-[18px]">
            <div className="cg-pane flex flex-col gap-[18px] p-[26px]">
              <span className="text-[11.5px] font-bold tracking-[.2em] text-[var(--cg-text-3)]">LOGGED IN AS</span>
              <div className="flex items-center gap-[14px]">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[rgba(159,212,236,.45)] bg-[rgba(159,212,236,.2)] font-heading text-[17px] font-semibold text-[var(--cg-text-1)]">
                  {initial}
                </span>
                <span className="text-[14.5px] font-semibold">{user.email}</span>
              </div>
              <div className="h-px bg-white/10" />
              <div className="flex flex-col gap-[9px]">
                <span className="text-[11.5px] font-bold tracking-[.2em] text-[var(--cg-text-3)]">ACCOUNT</span>
                <DeleteAccountForm />
              </div>
            </div>

            <div className="cg-pane flex flex-col gap-[14px] p-[26px]">
              <PasswordResetSection userEmail={user.email ?? ""} passwordResetSent={passwordResetSent === "true"} />
            </div>

            <div className="flex flex-col gap-[13px] rounded-[var(--cg-r-pane)] border border-[var(--cg-danger-br)] bg-[var(--cg-danger-bg)] p-[26px] shadow-[inset_0_1px_0_rgba(255,255,255,.12)] backdrop-blur-[30px]">
              <span className="text-[11.5px] font-bold tracking-[.2em] text-[var(--cg-danger)]">TASTE PROFILE</span>
              <p className="text-[13.5px] leading-[1.65] text-[var(--cg-text-2)]">
                This clears every rating and watchlist entry and sends you back through the taste quiz. Can&apos;t
                be undone.
              </p>
              <form action={resetTasteProfileAction}>
                <button
                  type="submit"
                  className="self-start rounded-full border border-[rgba(240,164,140,.55)] bg-white/8 px-6 py-[13px] text-[12px] font-bold tracking-[.09em] text-[var(--cg-danger)]"
                >
                  RESET TASTE PROFILE
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
