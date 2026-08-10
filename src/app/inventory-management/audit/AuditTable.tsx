"use client";

import { useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AuditPackageRow, PendingAdjustment } from "./types";

function rowKeyOf(record: AuditPackageRow) {
  return record.rowLocationId ? `${record.id}-${record.rowLocationId}` : String(record.id);
}

interface AuditTableProps {
  data: AuditPackageRow[];
  loading: boolean;
  locationMap: Record<string, string>;
  locationFilter?: string | null;
  countingMode: "manual" | "scan";
  scanCounts: Record<string, number>;
  flashingRows: Record<string, boolean>;
  pendingAdjustments: Record<string, PendingAdjustment>;
  onQtyChange: (value: string, record: AuditPackageRow, locId: string | null) => void;
  selectable?: boolean;
  selectedRowKeys?: (string | number)[];
  onSelectionChange?: (keys: (string | number)[], rows: AuditPackageRow[]) => void;
  hasMore?: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => void;
}

export default function AuditTable({
  data,
  loading,
  locationMap,
  locationFilter,
  countingMode,
  scanCounts,
  flashingRows,
  pendingAdjustments,
  onQtyChange,
  selectable = false,
  selectedRowKeys = [],
  onSelectionChange,
  hasMore = false,
  loadingMore = false,
  onLoadMore,
}: AuditTableProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLTableRowElement>(null);

  // Infinite scroll — the sentinel row sits right after the last data row;
  // once it's within 300px of the scroll container's bottom edge, load the
  // next 200-row page and append (guarded on loadingMore so a fast
  // re-intersection during an in-flight fetch doesn't double-request).
  useEffect(() => {
    if (!onLoadMore || !hasMore || loadingMore) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) onLoadMore();
      },
      { root: scrollRef.current, rootMargin: "300px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [onLoadMore, hasMore, loadingMore]);

  const allSelected = data.length > 0 && data.every((r) => selectedRowKeys.includes(rowKeyOf(r)));

  const toggleAll = (checked: boolean) => {
    if (!onSelectionChange) return;
    if (!checked) return onSelectionChange([], []);
    onSelectionChange(data.map(rowKeyOf), data);
  };

  const toggleOne = (record: AuditPackageRow, checked: boolean) => {
    if (!onSelectionChange) return;
    const key = rowKeyOf(record);
    if (checked) {
      onSelectionChange([...selectedRowKeys, key], [...data.filter((r) => selectedRowKeys.includes(rowKeyOf(r))), record]);
    } else {
      const nextKeys = selectedRowKeys.filter((k) => k !== key);
      onSelectionChange(nextKeys, data.filter((r) => nextKeys.includes(rowKeyOf(r))));
    }
  };

  return (
    <div
      ref={scrollRef}
      className="overflow-auto *:data-[slot=table-container]:overflow-visible"
      style={{ maxHeight: "calc(100vh - 280px)" }}>
      <Table className="text-[13px]">
        <TableHeader className="sticky top-0 z-10 bg-muted [&_tr]:border-b-0">
          <TableRow className="hover:bg-transparent">
            {selectable && (
              <TableHead className="w-8 px-4">
                <Checkbox checked={allSelected} onCheckedChange={(c) => toggleAll(!!c)} />
              </TableHead>
            )}
            <TableHead className="min-w-[220px] px-4 font-semibold text-muted-foreground">Product</TableHead>
            <TableHead className="min-w-[130px] px-4 font-semibold text-muted-foreground">Package ID</TableHead>
            <TableHead className="min-w-30 px-4 font-semibold text-muted-foreground">Metrc Tag</TableHead>
            <TableHead className="min-w-[130px] px-4 font-semibold text-muted-foreground">Brand</TableHead>
            <TableHead className="min-w-[130px] px-4 font-semibold text-muted-foreground">Category</TableHead>
            <TableHead className="min-w-[130px] px-4 font-semibold text-muted-foreground">Supplier</TableHead>
            <TableHead className="min-w-[110px] px-4 text-center font-semibold text-muted-foreground">Total Pkg Qty</TableHead>
            <TableHead className="min-w-[100px] px-4 text-center font-semibold text-muted-foreground">Metrc Qty</TableHead>
            <TableHead className="min-w-[100px] px-4 font-semibold text-muted-foreground">Location</TableHead>
            <TableHead className="min-w-[110px] px-4 text-center font-semibold text-muted-foreground">Location Qty</TableHead>
            <TableHead className="sticky right-0 z-20 w-45 min-w-45 bg-muted px-4 text-center font-semibold text-muted-foreground shadow-[inset_8px_0_8px_-8px_rgba(0,0,0,0.15)]">
              {countingMode === "scan" ? "Scan Count" : "Qty On Hand"}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="text-muted-foreground">
          {loading &&
            Array.from({ length: 8 }).map((_, i) => (
              <TableRow key={`skeleton-${i}`} className="border-b-0">
                {Array.from({ length: selectable ? 12 : 11 }).map((__, j) => (
                  <TableCell key={j} className="h-17 px-4">
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                ))}
              </TableRow>
            ))}

          {!loading && data.length === 0 && (
            <TableRow>
              <TableCell colSpan={selectable ? 12 : 11} className="py-10 text-center text-muted-foreground">
                No packages found.
              </TableCell>
            </TableRow>
          )}

          {!loading &&
            data.map((record, i) => {
              const key = rowKeyOf(record);
              const flashing = flashingRows[key];
              const metrcQty = record.metrQuantity;
              const isMatch = metrcQty == null ? true : record.quantityLeft === metrcQty;

              let locId: string | null = record.rowLocationId ?? locationFilter ?? null;
              const locIds = Object.keys(record.storageLocationBreakdown || {});
              if (!locId && locIds.length === 1) locId = locIds[0];

              const adjKey = locId ? `${record.id}-${locId}` : String(record.id);
              const scanCount = scanCounts[record.advertisedId || ""] || 0;
              const manualVal = pendingAdjustments[adjKey]?.inputValue ?? "";
              const rowBg = i % 2 === 1 ? "bg-table-zebra" : "bg-background";

              return (
                <TableRow
                  key={key}
                  className={`border-b-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] ${flashing ? "animate-[scanRowFlash_1.4s_ease-out]" : rowBg}`}
                >
                  {selectable && (
                    <TableCell className="h-17 px-4">
                      <Checkbox
                        checked={selectedRowKeys.includes(key)}
                        onCheckedChange={(c) => toggleOne(record, !!c)}
                      />
                    </TableCell>
                  )}
                  <TableCell className="h-17 max-w-[250px] truncate whitespace-normal px-4" title={record.name}>
                    <div className="line-clamp-2 text-sm">{record.name ?? "-"}</div>
                  </TableCell>
                  <TableCell
                    className="h-17 max-w-[140px] cursor-pointer truncate px-4 text-sm transition-colors hover:text-primary"
                    title={record.advertisedId ? `${record.advertisedId} (Click to copy)` : ""}
                    onClick={() => {
                      if (record.advertisedId) navigator.clipboard.writeText(record.advertisedId);
                    }}
                  >
                    {record.advertisedId || "-"}
                  </TableCell>
                  <TableCell className="h-17 px-4 text-sm">{record.metrcTag || "-"}</TableCell>
                  <TableCell
                    className="h-17 max-w-[150px] cursor-pointer truncate px-4 text-sm transition-colors hover:text-primary"
                    onClick={() => {
                      const brandName = typeof record.productBrand === "object" ? record.productBrand?.name : record.productBrand;
                      if (brandName) navigator.clipboard.writeText(brandName);
                    }}
                  >
                    {typeof record.productBrand === "object" ? record.productBrand?.name : record.productBrand || "-"}
                  </TableCell>
                  <TableCell className="h-17 max-w-[150px] truncate px-4 text-sm">
                    {typeof record.productCategory === "object" ? record.productCategory?.name : record.productCategory || "-"}
                  </TableCell>
                  <TableCell className="h-17 max-w-[150px] truncate px-4 text-sm">{record.supplierName || "-"}</TableCell>
                  <TableCell className="px-4 text-center">
                    <div className="flex flex-col items-center">
                      <div className="font-medium">
                        {record.quantityLeft || 0} {record.uoMShortForm}
                      </div>
                      {record.projectedQtyConversionRate && Number(record.projectedQtyConversionRate) !== 0 && (
                        <div className="flex flex-col items-center text-xs">
                          <div className="text-muted-foreground">↓</div>
                          <div className="font-medium text-blue-600">
                            {((record.quantityLeft || 0) / Number(record.projectedQtyConversionRate)).toFixed(2)}{" "}
                            {record.uoMShortForm}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            (Rate: {record.projectedQtyConversionRate})
                          </div>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="px-4 text-center">
                    {metrcQty == null ? (
                      <span className="text-muted-foreground">-</span>
                    ) : (
                      <span className={`font-semibold ${isMatch ? "" : "text-destructive"}`}>
                        {metrcQty} {record.uoMShortForm}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="max-w-[150px] truncate px-4 text-sm">
                    {record.rowLocationId
                      ? locationMap[record.rowLocationId] || record.rowLocationId
                      : locationFilter && locationMap[locationFilter]
                        ? locationMap[locationFilter]
                        : locIds.length === 0
                          ? "-"
                          : locIds.length === 1
                            ? locationMap[locIds[0]] || locIds[0]
                            : (
                                <div className="flex flex-col gap-1">
                                  {locIds.map((id) => (
                                    <div key={id} className="truncate text-xs">
                                      {locationMap[id] || id}
                                    </div>
                                  ))}
                                </div>
                              )}
                  </TableCell>
                  <TableCell className="px-4 text-center">
                    {record.rowLocationId ? (
                      `${record.rowLocationQty ?? 0} ${record.uoMShortForm}`
                    ) : locationFilter ? (
                      `${record.storageLocationBreakdown?.[locationFilter] || 0} ${record.uoMShortForm}`
                    ) : Object.keys(record.storageLocationBreakdown || {}).length === 0 ? (
                      "-"
                    ) : (
                      <div className="flex flex-col gap-1">
                        {Object.entries(record.storageLocationBreakdown || {}).map(([locId2, qty]) => (
                          <div key={locId2}>
                            {qty} {record.uoMShortForm}
                          </div>
                        ))}
                      </div>
                    )}
                  </TableCell>
                  <TableCell
                    className={`sticky right-0 z-10 w-45 min-w-45 px-4 text-center shadow-[inset_8px_0_8px_-8px_rgba(0,0,0,0.15)] ${flashing ? "animate-[scanRowFlash_1.4s_ease-out]" : ""} ${i % 2 === 1 ? "bg-table-zebra" : "bg-background"}`}
                  >
                    {countingMode === "scan" ? (
                      scanCount > 0 ? (
                        <span className="inline-flex min-w-13 items-center justify-center gap-1 rounded-full bg-green-100 px-3.5 py-0.5 text-sm font-bold text-green-600 dark:bg-green-950 dark:text-green-400">
                          ×{scanCount}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )
                    ) : (
                      <div className="flex items-center gap-1">
                        <Input
                          value={manualVal}
                          onChange={(e) => onQtyChange(e.target.value, record, locId)}
                          placeholder="0"
                          className="w-full"
                        />
                        <span className="text-xs text-muted-foreground">{record.uoMShortForm}</span>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}

          {!loading && hasMore && (
            <TableRow ref={sentinelRef} className="border-b-0 hover:bg-transparent">
              <TableCell colSpan={selectable ? 12 : 11} className="py-4 text-center">
                {loadingMore && (
                  <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" /> Loading more…
                  </span>
                )}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
