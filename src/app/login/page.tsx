import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CgAuthForm } from "@/components/auth/cg-auth-form";
import { CgAuthHero } from "@/components/auth/cg-auth-hero";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; accountDeleted?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/");

  const { mode, accountDeleted } = await searchParams;
  const isSignup = mode === "signup";

  return (
    <CgAuthHero tagline={isSignup ? "TAKE THE TASTE QUIZ AFTER SIGN UP" : "LOG IN TO SEE TONIGHT'S PICK"}>
      {accountDeleted === "true" && (
        <p className="mb-5 text-[13px] font-medium text-[var(--cg-accent)]">
          Your account has been permanently deleted.
        </p>
      )}
      <div className="mb-5 flex flex-col gap-5">
        <CgAuthForm mode={isSignup ? "signup" : "login"} />
      </div>
      <p className="text-center text-[13px] text-[var(--cg-text-2)]">
        {isSignup ? (
          <>
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-[var(--cg-accent)]">
              Log in
            </Link>
          </>
        ) : (
          <>
            New here?{" "}
            <Link href="/login?mode=signup" className="font-medium text-[var(--cg-accent)]">
              Create an account
            </Link>
          </>
        )}
      </p>
    </CgAuthHero>
  );
}
