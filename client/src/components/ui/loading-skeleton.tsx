import { cn } from "@/lib/utils";

interface LoadingSkeletonProps {
  variant?: "card" | "list" | "grid" | "text" | "stat";
  count?: number;
  className?: string;
  "data-testid"?: string;
}

function SkeletonLine({ className }: { className?: string }) {
  return (
    <div
      className={cn("h-4 bg-[var(--surface-muted)] rounded animate-pulse", className)}
    />
  );
}

function SkeletonCard() {
  return (
    <div className="card-surface space-y-4 animate-pulse">
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-2">
          <SkeletonLine className="w-3/4 h-6" />
          <SkeletonLine className="w-1/2" />
        </div>
        <div className="w-16 h-6 bg-[var(--surface-muted)] rounded" />
      </div>
      
      <div className="space-y-2">
        <SkeletonLine className="w-full h-2" />
        <SkeletonLine className="w-4/5" />
      </div>
      
      <div className="flex items-center justify-between">
        <SkeletonLine className="w-24" />
        <div className="flex -space-x-2">
          <div className="w-8 h-8 bg-[var(--surface-muted)] rounded-full" />
          <div className="w-8 h-8 bg-[var(--surface-muted)] rounded-full" />
        </div>
      </div>
    </div>
  );
}

function SkeletonListItem() {
  return (
    <div className="flex items-center gap-4 p-4 bg-white border border-border rounded-lg animate-pulse">
      <div className="w-5 h-5 bg-[var(--surface-muted)] rounded" />
      
      <div className="flex-1 space-y-2">
        <SkeletonLine className="w-2/3 h-5" />
        <SkeletonLine className="w-1/2" />
        <div className="flex items-center gap-3 mt-2">
          <SkeletonLine className="w-16" />
          <SkeletonLine className="w-20" />
        </div>
      </div>
      
      <div className="w-32 h-10 bg-[var(--surface-muted)] rounded-lg" />
    </div>
  );
}

function SkeletonStat() {
  return (
    <div className="card-surface space-y-3 animate-pulse">
      <div className="flex items-center justify-between">
        <SkeletonLine className="w-24" />
        <div className="w-5 h-5 bg-[var(--surface-muted)] rounded" />
      </div>
      <SkeletonLine className="w-20 h-10" />
      <SkeletonLine className="w-32" />
    </div>
  );
}

function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonLine
          key={i}
          className={i === lines - 1 ? "w-4/5" : "w-full"}
        />
      ))}
    </div>
  );
}

export function LoadingSkeleton({
  variant = "card",
  count = 1,
  className,
  "data-testid": testId,
}: LoadingSkeletonProps) {
  const skeletons = Array.from({ length: count });

  const renderSkeleton = () => {
    switch (variant) {
      case "card":
        return skeletons.map((_, i) => <SkeletonCard key={i} />);
      case "list":
        return skeletons.map((_, i) => <SkeletonListItem key={i} />);
      case "stat":
        return skeletons.map((_, i) => <SkeletonStat key={i} />);
      case "text":
        return <SkeletonText lines={count} />;
      case "grid":
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {skeletons.map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div
      data-testid={testId}
      className={cn(
        variant === "list" || variant === "card" ? "space-y-4" : "",
        className
      )}
      role="status"
      aria-label="Loading content"
    >
      {renderSkeleton()}
      <span className="sr-only">Loading...</span>
    </div>
  );
}
