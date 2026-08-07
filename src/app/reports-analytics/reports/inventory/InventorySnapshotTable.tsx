"use client";

import { useRef } from "react";
import { Loader2 } from "lucide-react";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableLoadingOverlay } from "@/components/ui/table-pagination";
import type { InventorySnapshotRow } from "./types";

export default function InventorySnapshotTable({
  data,
  loading,
  loadingMore,
  hasMore,
  totalEntries,
  onLoadMore,
}: {
  data: InventorySnapshotRow[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  totalEntries: number;
  onLoadMore: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el || loadingMore || !hasMore) return;
    if (el.scrollHeight - (el.scrollTop + el.clientHeight) < 100) {
      onLoadMore();
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="relative overflow-hidden rounded-xl ring-1 ring-foreground/10">
        <TableLoadingOverlay show={loading && data.length === 0} />
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="overflow-auto *:data-[slot=table-container]:overflow-visible"
          style={{ maxHeight: "calc(100vh - 420px)" }}
        >
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-muted [&_tr]:border-b-0">
              <TableRow className="bg-muted/60">
                <TableHead className="w-62.5">Product</TableHead>
                <TableHead className="w-40">Category</TableHead>
                <TableHead className="w-25 text-center">Contains MJ</TableHead>
                <TableHead className="w-30 text-right">Current Qty</TableHead>
                <TableHead className="w-30 text-right">Unit Weight</TableHead>
                <TableHead className="w-30 text-right">Net Weight</TableHead>
                <TableHead className="w-32.5 text-right">Cost Per Item</TableHead>
                <TableHead className="w-37.5 text-right">COG (Qty * CPI)</TableHead>
                <TableHead className="w-30 text-right">Sales Price</TableHead>
                <TableHead className="w-37.5 text-right">Est. Retail Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && data.length === 0 &&
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={`s-${i}`} className="border-b-0">
                    {Array.from({ length: 10 }).map((__, j) => (
                      <TableCell key={j}>
                        <div className="h-4 w-full animate-pulse rounded bg-muted" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              {!loading && data.length === 0 && (
                <TableRow className="border-b-0">
                  <TableCell colSpan={10} className="py-10 text-center text-muted-foreground">
                    No inventory snapshot data found.
                  </TableCell>
                </TableRow>
              )}
              {data.map((row, i) => (
                <TableRow key={row._id || i} className={`border-b-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] ${i % 2 === 1 ? "bg-table-zebra" : ""}`}>
                  <TableCell>{row.productName || "-"}</TableCell>
                  <TableCell>{row.category || "-"}</TableCell>
                  <TableCell className="text-center">{row.containsMJ ? "Yes" : "No"}</TableCell>
                  <TableCell className="text-right">{(row.currentQty || 0).toFixed(2)}/ea</TableCell>
                  <TableCell className="text-right">{row.unitWeight ? `${row.unitWeight.toFixed(2)}g` : "N/A"}</TableCell>
                  <TableCell className="text-right">{row.netWeight ? `${row.netWeight.toFixed(2)}g` : "N/A"}</TableCell>
                  <TableCell className="text-right">${(row.costPerItem || 0).toFixed(2)}</TableCell>
                  <TableCell className="text-right">${(row.cog || 0).toFixed(2)}</TableCell>
                  <TableCell className="text-right">${(row.salesPrice || 0).toFixed(2)}</TableCell>
                  <TableCell className="text-right">${(row.retailValue || 0).toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {loadingMore && (
            <div className="flex items-center justify-center gap-2 py-3 text-sm text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" />
              Loading more...
            </div>
          )}
          {!hasMore && data.length > 0 && (
            <div className="py-3 text-center text-sm text-muted-foreground">
              No more records to load ({data.length} of {totalEntries} items loaded)
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
