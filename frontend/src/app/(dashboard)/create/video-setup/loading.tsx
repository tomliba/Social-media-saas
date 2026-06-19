import { SkeletonBlock } from "@/components/ui/Skeleton";

export default function VideoSetupLoading() {
  return (
    <main className="min-h-screen bg-surface pt-24 pb-48 px-6 max-w-4xl mx-auto">
      <SkeletonBlock className="h-8 w-40 mb-8" />
      <div className="space-y-6">
        <SkeletonBlock className="h-9 w-80" />
        <SkeletonBlock className="h-40 w-full rounded-2xl" />
        <SkeletonBlock className="h-40 w-full rounded-2xl" />
        <SkeletonBlock className="h-12 w-48 rounded-xl" />
      </div>
    </main>
  );
}
