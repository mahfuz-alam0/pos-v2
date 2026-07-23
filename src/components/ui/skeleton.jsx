import { cn } from "@/lib/utils";

// Minimal shadcn-style Skeleton primitive (was not installed).
function Skeleton({ className, ...props }) {
  return (
    <div
      data-slot="skeleton"
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  );
}

export { Skeleton };
