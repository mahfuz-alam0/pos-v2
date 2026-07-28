"use client";

import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

export function TableLoadingOverlay({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60 backdrop-blur-[1px]">
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
    </div>
  );
}

interface TablePaginationProps {
  page: number;
  totalPages: number;
  totalEntries?: number;
  pageSize?: number;
  loading?: boolean;
  onPageChange: (page: number) => void;
}

const SIBLING_COUNT = 4;

function getPageList(page: number, totalPages: number): (number | "ellipsis")[] {
  if (totalPages <= SIBLING_COUNT * 2 + 3) return Array.from({ length: totalPages }, (_, i) => i + 1);

  const pages = new Set<number>([1, totalPages, page]);
  for (let i = 1; i <= SIBLING_COUNT; i++) {
    pages.add(page - i);
    pages.add(page + i);
  }
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
