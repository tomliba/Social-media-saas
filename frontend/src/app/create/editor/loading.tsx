import { SkeletonBlock } from "@/components/ui/Skeleton";

export default function EditorLoading() {
  return (
    <main className="pt-24 pb-72 px-6 max-w-4xl mx-auto">
      <SkeletonBlock className="h-9 w-72 mb-6" />
      <div className="space-y-4">
        <SkeletonBlock className="h-64 w-full rounded-2xl" />
        <SkeletonBlock className="h-12 w-full rounded-xl" />
        <SkeletonBlock className="h-12 w-2/3 rounded-xl" />
      </div>
    </main>
  );
}
