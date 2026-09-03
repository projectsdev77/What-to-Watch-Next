import { AuthHero } from "@/components/auth/auth-hero";
import { ResetPasswordGate } from "@/components/auth/reset-password-gate";
import Link from "next/link";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const { success, error } = await searchParams;

  return (
    <AuthHero
      tagline="RESET YOUR PASSWORD"
      slogan={
        <>
          SECURE YOUR
          <br />
          ACCOUNT
        </>
      }
    >
      <div className="w-full max-w-[420px] bg-card px-8 py-9 shadow-panel">
        {success === "true" ? (
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <h1 className="font-heading text-[20px] font-semibold tracking-[.18em]">PASSWORD UPDATED</h1>
              <p className="text-[14px] leading-[1.65] text-text-2">
                Your password has been successfully changed. You can now log in with your new password.
              </p>
            </div>
            <Link
              href="/login"
              className="bg-ink px-4 py-[15px] text-center text-[13.5px] font-bold tracking-[.14em] text-white"
            >
              GO TO LOGIN
            </Link>
          </div>
        ) : error ? (
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <h1 className="font-heading text-[20px] font-semibold tracking-[.18em]">LINK EXPIRED</h1>
              <p className="text-[14px] leading-[1.65] text-text-2">
                This password reset link is invalid or has expired. Please request a new one.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <Link
                href="/forgot-password"
                className="bg-ink px-4 py-[15px] text-center text-[13.5px] font-bold tracking-[.14em] text-white"
              >
                REQUEST NEW LINK
              </Link>
              <Link
                href="/login"
                className="border border-[rgba(12,35,52,.28)] px-4 py-[15px] text-center text-[13.5px] font-bold tracking-[.1em]"
              >
                RETURN TO LOGIN
              </Link>
            </div>
          </div>
        ) : (
          <div className="mb-5 flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <h1 className="font-heading text-[20px] font-semibold tracking-[.18em]">SET NEW PASSWORD</h1>
              <p className="text-[14px] leading-[1.65] text-text-2">
                Enter a new password for your account. Make sure it&apos;s strong and secure.
              </p>
            </div>
            <ResetPasswordGate />
          </div>
        )}
      </div>
    </AuthHero>
  );
}
