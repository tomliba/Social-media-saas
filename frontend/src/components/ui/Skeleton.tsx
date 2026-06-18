// Lightweight skeleton primitives for route-level loading.tsx files. Server
// components — no client JS — so they paint the instant a navigation starts.

export function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-zinc-200/70 ${className}`} />;
}

export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-2xl shadow-sm border border-zinc-100 overflow-hidden"
        >
          <SkeletonBlock className="aspect-video rounded-none" />
          <div className="p-4 space-y-3">
            <SkeletonBlock className="h-4 w-3/4" />
            <SkeletonBlock className="h-3 w-1/2" />
            <div className="pt-3 border-t border-zinc-100">
              <SkeletonBlock className="h-7 w-24" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
