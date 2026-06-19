import { SkeletonBlock, CardGridSkeleton } from "@/components/ui/Skeleton";

// Shown instantly on navigation to /library while the server fetches the
// user's content items. Mirrors the real page's max-w-6xl layout.
export default function LibraryLoading() {
  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <SkeletonBlock className="h-9 w-64 mb-2" />
        <SkeletonBlock className="h-4 w-48" />
      </div>
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <SkeletonBlock className="h-11 w-72" />
        <SkeletonBlock className="h-11 w-96" />
      </div>
      <CardGridSkeleton count={6} />
    </div>
  );
}
