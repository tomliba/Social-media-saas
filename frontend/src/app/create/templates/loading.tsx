import { SkeletonBlock } from "@/components/ui/Skeleton";

export default function TemplatesLoading() {
  return (
    <main className="pt-24 pb-32 px-6 md:px-12 lg:px-16 max-w-screen-xl mx-auto">
      <div className="mb-8 max-w-xl">
        <SkeletonBlock className="h-9 w-72 mb-3" />
        <SkeletonBlock className="h-4 w-full max-w-md" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonBlock key={i} className="aspect-[4/5] rounded-2xl" />
        ))}
      </div>
    </main>
  );
}
