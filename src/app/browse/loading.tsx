// Skeletons keep the real card geometry — poster block, title bar,
// platform bar — no spinners anywhere in the product.
export default function BrowseLoading() {
  return (
    <div className="flex flex-1 flex-col bg-sky">
      <div className="h-[52px] bg-steel sm:h-[54px]" />
      <div className="h-[52px] bg-steel-dark sm:h-[54px]" />
      <main className="mx-auto w-full max-w-[1280px] flex-1 px-4 py-9 sm:px-10">
        <div className="grid grid-cols-2 gap-[18px] sm:grid-cols-3 md:grid-cols-6">
          {Array.from({ length: 12 }, (_, i) => (
            <div key={i} className="flex flex-col gap-[10px] bg-card p-[11px] shadow-card">
              <div className="aspect-[2/3] w-full animate-pulse bg-[rgba(12,35,52,.1)]" />
              <div className="h-[11px] animate-pulse bg-[rgba(12,35,52,.12)]" />
              <div className="h-[9px] w-[55%] animate-pulse bg-[rgba(12,35,52,.08)]" />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
