// Skeletons keep the real card geometry — poster block, title bar,
// platform bar — no spinners anywhere in the product.
export default function BrowseLoading() {
  return (
    <div className="cg-screen relative min-h-screen bg-[var(--cg-ground-alt)] font-sans text-[var(--cg-text-1)]">
      <div className="mx-auto flex max-w-[1280px] flex-col gap-6 p-[22px] pb-16">
        <div className="cg-nav h-[54px]" />
        <div className="flex items-center gap-[14px]">
          <div className="h-[38px] w-[170px] animate-pulse rounded-full bg-white/6" />
          <div className="ml-auto h-[38px] w-[320px] animate-pulse rounded-full bg-white/6" />
        </div>
        <div className="grid grid-cols-2 gap-[18px] sm:grid-cols-3 md:grid-cols-6">
          {Array.from({ length: 12 }, (_, i) => (
            <div key={i} className="flex flex-col gap-[11px]">
              <div className="aspect-[2/3] w-full animate-pulse rounded-[22px] bg-white/6" />
              <div className="h-[11px] animate-pulse rounded-full bg-white/8" />
              <div className="h-[9px] w-[55%] animate-pulse rounded-full bg-white/5" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
