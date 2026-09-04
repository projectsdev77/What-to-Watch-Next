import { CgAuthHero } from "@/components/auth/cg-auth-hero";
import { CgForgotPasswordForm } from "@/components/auth/cg-forgot-password-form";
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
    <CgAuthHero tagline="RECOVER YOUR ACCOUNT">
      {sent === "true" ? (
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <h1 className="font-heading text-[20px] font-semibold tracking-[.18em]">CHECK YOUR EMAIL</h1>
            <p className="text-[14px] leading-[1.65] text-[var(--cg-text-2)]">
              If an account exists with this email, you&apos;ll receive a password reset link shortly.
            </p>
          </div>
          <Link
            href="/login"
            className="rounded-[var(--cg-r-input)] bg-[var(--cg-primary)] px-4 py-[15px] text-center text-[13.5px] font-bold tracking-[.14em] text-[var(--cg-on-primary)]"
          >
            RETURN TO LOGIN
          </Link>
        </div>
      ) : (
        <>
          <div className="mb-5 flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <h1 className="font-heading text-[20px] font-semibold tracking-[.18em]">FORGOT YOUR PASSWORD?</h1>
              <p className="text-[14px] leading-[1.65] text-[var(--cg-text-2)]">
                Enter the email address associated with your account and we&apos;ll send you a password reset link.
              </p>
            </div>
            <CgForgotPasswordForm />
          </div>
          <p className="text-center text-[13px] text-[var(--cg-text-2)]">
            Remember your password?{" "}
            <Link href="/login" className="font-medium text-[var(--cg-accent)]">
              Log in
            </Link>
          </p>
        </>
      )}
    </CgAuthHero>
  );
}
