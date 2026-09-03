// Attribution required by JustWatch's terms for apps that display their
// streaming-availability data (see README's "Data sources" section) —
// same spot/weight as a standard site copyright line.
export function SiteFooter() {
  return (
    <footer className="px-4 py-5 text-center text-[11.5px] tracking-[.03em] text-text-3 sm:px-10">
      Streaming availability data provided by JustWatch. &copy; {new Date().getFullYear()} What To
      Watch Next.
    </footer>
  );
}
