import type { ReactNode, SVGProps } from "react";
import { AppHeader } from "@/components/chrome/app-header";
import { DeleteAccountForm } from "@/components/settings/delete-account-form";
import { PasswordResetSection } from "@/components/settings/password-reset-section";
import { PlatformPickerForm } from "@/components/settings/platform-picker-form";
import { STREAMING_PLATFORMS } from "@/lib/platforms";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { resetTasteProfileAction, updatePlatformsAction } from "./actions";

function Icon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    />
  );
}

function AccountIcon() {
  return (
    <Icon>
      <circle cx="12" cy="8.2" r="3.4" />
      <path d="M5 20c1.2-4 4-6 7-6s5.8 2 7 6" />
    </Icon>
  );
}

function PlatformsIcon() {
  return (
    <Icon>
      <rect x="3.5" y="5" width="17" height="12" rx="1.6" />
      <path d="M9 20h6M12 17v3" />
      <path d="M10.3 8.4v5.2l4.3-2.6-4.3-2.6Z" fill="currentColor" stroke="none" />
    </Icon>
  );
}

function PasswordIcon() {
  return (
    <Icon>
      <rect x="5" y="11" width="14" height="9" rx="1.6" />
      <path d="M8 11V7.5a4 4 0 0 1 8 0V11" />
    </Icon>
  );
}

function TasteProfileIcon() {
  return (
    <Icon>
      <path d="M20 7a8 8 0 1 0 1.6 6.4" />
      <path d="M20 3v5h-5" />
    </Icon>
  );
}

/** Icon badge + eyebrow label, shared across every section — the
 * accentClass carries both the badge's tint and its icon color (e.g.
 * "bg-steel/12 text-steel"), so each section gets a consistent color
 * cue running down the page. */
function SectionHeading({ icon, label, accentClass }: { icon: ReactNode; label: string; accentClass: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${accentClass}`}>{icon}</span>
      <span className="text-[12.5px] font-bold tracking-[.16em] text-text-3">{label}</span>
    </div>
  );
}

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
    <div className="flex flex-1 flex-col bg-sky">
      <AppHeader active="/settings" />
      <main className="mx-auto flex w-full max-w-[1000px] flex-1 flex-col gap-8 px-4 py-9 sm:px-10">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-[24px] font-semibold tracking-[.2em]">SETTINGS</h1>
          <p className="text-[14px] text-text-2">Manage your account, streaming platforms, and taste profile.</p>
        </div>

        <section className="flex flex-col gap-[20px] border-t-[3px] border-steel-dark bg-card p-8 shadow-card">
          <SectionHeading
            icon={<AccountIcon />}
            label="LOGGED IN AS"
            accentClass="bg-steel-dark/12 text-steel-dark"
          />
          <div className="flex items-center gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-steel-dark text-[18px] font-bold text-white">
              {initial}
            </span>
            <p className="text-[16px] font-semibold text-text-1">{user.email}</p>
          </div>
          <div className="h-px bg-[rgba(12,35,52,.14)]" />
          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-semibold tracking-[.14em] text-text-3">ACCOUNT</span>
            <DeleteAccountForm />
          </div>
        </section>

        <section className="flex flex-col gap-[20px] border-t-[3px] border-steel bg-card p-8 shadow-card">
          <SectionHeading icon={<PlatformsIcon />} label="STREAMING PLATFORMS" accentClass="bg-steel/12 text-steel" />
          <PlatformPickerForm
            action={updatePlatformsAction}
            selected={selected}
            submitLabel="SAVE"
            pendingLabel="SAVING…"
            requireChange
            footer={
              <span className="bg-mist px-2 py-[3px] text-[11px] font-bold text-ink">
                {selected.size} / {STREAMING_PLATFORMS.length}
              </span>
            }
          />
        </section>

        <section className="flex flex-col gap-[20px] border-t-[3px] border-ink bg-card p-8 shadow-card">
          <SectionHeading icon={<PasswordIcon />} label="PASSWORD" accentClass="bg-ink/10 text-ink" />
          <PasswordResetSection userEmail={user.email ?? ""} passwordResetSent={passwordResetSent === "true"} />
        </section>

        <section className="flex flex-col gap-[16px] border-t-[3px] border-danger bg-card p-8 shadow-card">
          <SectionHeading icon={<TasteProfileIcon />} label="TASTE PROFILE" accentClass="bg-danger/12 text-danger" />
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
