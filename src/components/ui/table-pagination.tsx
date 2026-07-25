"use client";

import { Button } from "@/components/ui/button";

interface TablePaginationProps {
  page: number;
  totalPages: number;
  totalEntries?: number;
  pageSize?: number;
  loading?: boolean;
  onPageChange: (page: number) => void;
}

function getPageList(page: number, totalPages: number): (number | "ellipsis")[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);

  const pages = new Set<number>([1, totalPages, page, page - 1, page + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);

  const result: (number | "ellipsis")[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) result.push("ellipsis");
    result.push(p);
  });
  return result;
}

export function TablePagination({
  page,
  totalPages,
  totalEntries,
  pageSize,
  loading,
  onPageChange,
}: TablePaginationProps) {
  const rangeLabel =
    totalEntries != null && pageSize != null
      ? totalEntries === 0
        ? "0 results"
        : `${(page - 1) * pageSize + 1}-${Math.min(page * pageSize, totalEntries)} of ${totalEntries}`
      : null;

  if (totalPages <= 1 && !rangeLabel) return null;

  return (
    <div className="flex items-center justify-between text-sm text-muted-foreground">
      <span>{rangeLabel}</span>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="sm" disabled={page <= 1 || loading} onClick={() => onPageChange(page - 1)}>
          Previous
        </Button>
        {getPageList(page, totalPages).map((p, i) =>
          p === "ellipsis" ? (
            <span key={`ellipsis-${i}`} className="px-1.5 text-muted-foreground">
              …
            </span>
          ) : (
            <Button
              key={p}
              variant={p === page ? "default" : "outline"}
              size="sm"
              disabled={loading}
              className="w-8 px-0"
              onClick={() => onPageChange(p)}
            >
              {p}
            </Button>
          )
        )}
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages || loading}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
