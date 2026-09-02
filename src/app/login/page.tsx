import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthHero } from "@/components/auth/auth-hero";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/");

  const { mode } = await searchParams;
  const isSignup = mode === "signup";

  return (
    <AuthHero
      tagline={isSignup ? "TAKE THE TASTE QUIZ AFTER SIGN UP" : "LOG IN TO SEE TONIGHT'S PICK"}
      slogan={
        isSignup ? undefined : (
          <>
            STOP SCROLLING
            <br />
            START WATCHING
          </>
        )
      }
    >
      <div className="w-full max-w-[380px] bg-card px-8 py-9 shadow-panel">
        <div className="mb-5 flex flex-col gap-5">
          <AuthForm mode={isSignup ? "signup" : "login"} />
        </div>
        <p className="text-center text-[13px] text-text-2">
          {isSignup ? (
            <>
              Already have an account?{" "}
              <Link href="/login" className="font-medium text-steel-dark">
                Log in
              </Link>
            </>
          ) : (
            <>
              New here?{" "}
              <Link href="/login?mode=signup" className="font-medium text-steel-dark">
                Create an account
              </Link>
            </>
          )}
        </p>
      </div>
    </AuthHero>
  );
}
