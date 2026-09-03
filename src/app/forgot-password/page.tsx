import { AuthHero } from "@/components/auth/auth-hero";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/");

  const { sent } = await searchParams;

  return (
    <AuthHero
      tagline="RECOVER YOUR ACCOUNT"
      slogan={
        <>
          NEVER MISS
          <br />
          TONIGHT&apos;S PICK
        </>
      }
    >
      <div className="w-full max-w-[420px] bg-card px-8 py-9 shadow-panel">
        {sent === "true" ? (
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <h1 className="font-heading text-[20px] font-semibold tracking-[.18em]">CHECK YOUR EMAIL</h1>
              <p className="text-[14px] leading-[1.65] text-text-2">
                If an account exists with this email, you&apos;ll receive a password reset link shortly.
              </p>
              <p className="text-[14px] leading-[1.65] text-text-2">
                Check your inbox and follow the instructions to reset your password.
              </p>
            </div>
            <Link
              href="/login"
              className="bg-steel px-4 py-[15px] text-center text-[13.5px] font-bold tracking-[.14em] text-white"
            >
              RETURN TO LOGIN
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-5 flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <h1 className="font-heading text-[20px] font-semibold tracking-[.18em]">FORGOT YOUR PASSWORD?</h1>
                <p className="text-[14px] leading-[1.65] text-text-2">
                  Enter the email address associated with your account and we&apos;ll send you a password reset link.
                </p>
              </div>
              <ForgotPasswordForm />
            </div>
            <p className="text-center text-[13px] text-text-2">
              Remember your password?{" "}
              <Link href="/login" className="font-medium text-steel-dark">
                Log in
              </Link>
            </p>
          </>
        )}
      </div>
    </AuthHero>
  );
}
