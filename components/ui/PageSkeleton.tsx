// NFR-US-04
import { cn } from "@/lib/utils";

function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      aria-hidden="true"
    />
  );
}

export default function PageSkeleton() {
  return (
    <div
      className="px-4 sm:px-6 py-6 space-y-6"
      aria-label="Loading…"
      role="status"
    >
      <SkeletonBlock className="h-7 w-48" />
      <SkeletonBlock className="h-4 w-64" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonBlock key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <SkeletonBlock className="h-5 w-32 mt-4" />
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonBlock key={i} className="h-14 rounded-lg" />
        ))}
      </div>
    </div>
  );
}
