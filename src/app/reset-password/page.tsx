import { CgAuthHero } from "@/components/auth/cg-auth-hero";
import { CgResetPasswordGate } from "@/components/auth/cg-reset-password-gate";
import Link from "next/link";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const { success, error } = await searchParams;

  return (
    <CgAuthHero tagline="RESET YOUR PASSWORD">
      {success === "true" ? (
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <h1 className="font-heading text-[20px] font-semibold tracking-[.18em]">PASSWORD UPDATED</h1>
            <p className="text-[14px] leading-[1.65] text-[var(--cg-text-2)]">
              Your password has been successfully changed. You can now log in with your new password.
            </p>
          </div>
          <Link
            href="/login"
            className="rounded-[var(--cg-r-input)] bg-[var(--cg-primary)] px-4 py-[15px] text-center text-[13.5px] font-bold tracking-[.14em] text-[var(--cg-on-primary)]"
          >
            GO TO LOGIN
          </Link>
        </div>
      ) : error ? (
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <h1 className="font-heading text-[20px] font-semibold tracking-[.18em]">LINK EXPIRED</h1>
            <p className="text-[14px] leading-[1.65] text-[var(--cg-text-2)]">
              This password reset link is invalid or has expired. Please request a new one.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <Link
              href="/forgot-password"
              className="rounded-[var(--cg-r-input)] bg-[var(--cg-primary)] px-4 py-[15px] text-center text-[13.5px] font-bold tracking-[.14em] text-[var(--cg-on-primary)]"
            >
              REQUEST NEW LINK
            </Link>
            <Link
              href="/login"
              className="rounded-[var(--cg-r-input)] border border-white/18 bg-white/9 px-4 py-[15px] text-center text-[13.5px] font-bold tracking-[.1em] text-[var(--cg-text-1)]"
            >
              RETURN TO LOGIN
            </Link>
          </div>
        </div>
      ) : (
        <div className="mb-5 flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <h1 className="font-heading text-[20px] font-semibold tracking-[.18em]">SET NEW PASSWORD</h1>
            <p className="text-[14px] leading-[1.65] text-[var(--cg-text-2)]">
              Enter a new password for your account. Make sure it&apos;s strong and secure.
            </p>
          </div>
          <CgResetPasswordGate />
        </div>
      )}
    </CgAuthHero>
  );
}
