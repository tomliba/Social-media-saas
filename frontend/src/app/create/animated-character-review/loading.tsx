import { SkeletonBlock } from "@/components/ui/Skeleton";

export default function AnimatedCharacterReviewLoading() {
  return (
    <main className="min-h-screen bg-surface pt-24 pb-48 px-6 max-w-4xl mx-auto">
      <SkeletonBlock className="h-9 w-72 mb-6" />
      <div className="space-y-4">
        <SkeletonBlock className="aspect-video w-full rounded-2xl" />
        <SkeletonBlock className="h-12 w-full rounded-xl" />
        <SkeletonBlock className="h-12 w-1/2 rounded-xl" />
      </div>
    </main>
  );
}
