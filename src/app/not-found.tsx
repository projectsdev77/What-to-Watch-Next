import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-sky px-4 py-16">
      <div className="flex w-full max-w-[520px] flex-col items-start gap-4 bg-card p-9 shadow-card">
        <h1 className="font-heading text-[20px] font-semibold tracking-[.18em]">PAGE NOT FOUND</h1>
        <p className="max-w-[48ch] text-[15px] leading-[1.7] text-text-2">
          That title or page doesn&apos;t exist, or isn&apos;t in the catalog yet.
        </p>
        <Link href="/" className="bg-ink px-[26px] py-[13px] text-[12.5px] font-bold tracking-[.1em] text-white">
          GO TO TONIGHT&apos;S PICK
        </Link>
      </div>
    </main>
  );
}
