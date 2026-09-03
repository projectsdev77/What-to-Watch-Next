import { AuthHero } from "@/components/auth/auth-hero";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string; type?: string }>;
}) {
  const supabase = await createClient();
  const { success, error, type } = await searchParams;

  // If not showing success or error states, validate access
  if (!success && !error) {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    // No session = accessed page directly without any authentication
    if (!session) {
      redirect("/reset-password?error=invalid");
    }

    // If we have a session, check if it's a recovery session
    // Supabase password recovery emails redirect with type=recovery in the URL
    // If there's no type=recovery, this is someone logged in normally trying to access directly
    if (session && type !== "recovery") {
      // They're logged in normally - send them to settings to request password reset properly
      redirect("/settings");
    }
  }

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
          <>
            <div className="mb-5 flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <h1 className="font-heading text-[20px] font-semibold tracking-[.18em]">SET NEW PASSWORD</h1>
                <p className="text-[14px] leading-[1.65] text-text-2">
                  Enter a new password for your account. Make sure it&apos;s strong and secure.
                </p>
              </div>
              <ResetPasswordForm />
            </div>
          </>
        )}
      </div>
    </AuthHero>
  );
}
