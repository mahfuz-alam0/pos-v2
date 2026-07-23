import { Skeleton } from "@/components/ui/skeleton";

// Ports old skeltonLoader.js — a single full-width pulsing bar. The styled
// -components + hand-rolled @keyframes pulse are replaced by the shadcn
// Skeleton primitive (tailwind animate-pulse). Optional `rows` renders more
// than one bar for list placeholders.
export default function SkeletonLoader({ rows = 1, className }) {
  return (
    <div className="w-full">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className={className ?? "my-2.5 h-5 w-full"} />
      ))}
    </div>
  );
}
