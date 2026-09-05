import { Skeleton } from "@/components/ui/skeleton";

export default function AnalyticsLoading() {
  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Skeleton className="h-8 w-44 rounded-lg" />
          <Skeleton className="h-4 w-60 rounded-md mt-1" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24 rounded-lg" />
          <Skeleton className="h-9 w-24 rounded-lg" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-6 rounded-2xl border border-border bg-card space-y-3">
            <Skeleton className="h-4 w-32 rounded-md" />
            <Skeleton className="h-8 w-40 rounded-lg" />
          </div>
        ))}
      </div>

      <div className="p-6 rounded-xl border border-border bg-card space-y-4">
        <Skeleton className="h-6 w-48 rounded-md" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    </div>
  );
}
