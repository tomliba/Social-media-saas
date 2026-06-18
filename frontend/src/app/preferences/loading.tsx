import { SkeletonBlock } from "@/components/ui/Skeleton";

// Shown instantly on navigation to /preferences while the server loads the
// user's saved defaults (and the voice/character option lists).
export default function PreferencesLoading() {
  return (
    <div className="max-w-4xl mx-auto pt-4 pb-32">
      <div className="mb-8">
        <SkeletonBlock className="h-8 w-48 mb-2" />
        <SkeletonBlock className="h-4 w-72" />
      </div>
      <div className="space-y-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonBlock key={i} className="h-44 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
