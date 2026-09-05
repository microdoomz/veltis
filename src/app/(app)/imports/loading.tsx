import { Skeleton } from "@/components/ui/skeleton";

export default function ImportsLoading() {
  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <div className="space-y-2">
        <Skeleton className="h-8 w-44 rounded-lg" />
        <Skeleton className="h-4 w-72 rounded-md" />
      </div>

      <div className="p-8 border-2 border-dashed border-border rounded-2xl bg-card/50 flex flex-col items-center justify-center space-y-4">
        <Skeleton className="h-12 w-12 rounded-full" />
        <Skeleton className="h-5 w-48 rounded-md" />
        <Skeleton className="h-4 w-64 rounded-md" />
        <Skeleton className="h-10 w-36 rounded-lg" />
      </div>

      <div className="space-y-3">
        <Skeleton className="h-6 w-36 rounded-md" />
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <Skeleton className="h-12 w-full rounded-lg" />
          <Skeleton className="h-12 w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}
