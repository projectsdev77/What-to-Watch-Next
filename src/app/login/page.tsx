import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AuthForm } from "@/components/auth/auth-form";

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
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-16">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 text-2xl font-semibold">What To Watch Next</h1>
        <p className="mb-6 text-sm text-zinc-500">
          {isSignup ? "Create an account to get started." : "Log in to see tonight's pick."}
        </p>
        <AuthForm mode={isSignup ? "signup" : "login"} />
        <p className="mt-4 text-sm text-zinc-500">
          {isSignup ? (
            <>
              Already have an account? <Link href="/login" className="underline">Log in</Link>
            </>
          ) : (
            <>
              New here? <Link href="/login?mode=signup" className="underline">Create an account</Link>
            </>
          )}
        </p>
      </div>
    </main>
  );
}
