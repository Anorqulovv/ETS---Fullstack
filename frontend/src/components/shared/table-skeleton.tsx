import { Skeleton } from "@/components/ui/skeleton";

export function TableSkeleton({ rows = 8, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-2 p-4">
      <div className="grid" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={`h-${i}`} className="mx-2 h-4" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div
          key={`r-${r}`}
          className="grid gap-2 py-2"
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton
              key={`c-${r}-${c}`}
              className="mx-2 h-4"
              style={{ animationDelay: `${(r + c) * 40}ms` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
