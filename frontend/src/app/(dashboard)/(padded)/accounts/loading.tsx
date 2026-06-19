import { SkeletonBlock } from "@/components/ui/Skeleton";

// Shown instantly on navigation to /accounts while the server loads the user's
// plan, subscription status, and credit balance.
export default function AccountsLoading() {
  return (
    <div className="max-w-4xl mx-auto pt-4">
      <div className="mb-10">
        <SkeletonBlock className="h-8 w-40 mb-2" />
        <SkeletonBlock className="h-4 w-64" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Array.from({ length: 2 }).map((_, i) => (
          <SkeletonBlock key={i} className="h-64 rounded-xl" />
        ))}
      </div>
      <SkeletonBlock className="h-48 rounded-xl mt-6" />
    </div>
  );
}
