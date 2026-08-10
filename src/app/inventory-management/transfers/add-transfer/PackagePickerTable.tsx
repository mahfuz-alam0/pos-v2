"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableLoadingOverlay, TablePagination } from "@/components/ui/table-pagination";

export interface PackagePickerRow {
  id: string;
  advertisedId?: string;
  name?: string;
  createdAt?: string;
  originalCategory?: string;
  originalBrand?: string;
  originalQuantity?: number;
  quantityLeft?: number;
  uoMShortForm?: string;
  isActive?: boolean;
  storageLocationBreakdown?: Record<string, number>;
  displayQuantityToShift?: number;
}

function fmtDate(value?: string) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "2-digit" });
}

export default function PackagePickerTable({
  rows,
  loading,
  selectedIds,
  onToggle,
  onToggleAll,
  showQtyColumn,
  sourceLocationId,
  onQtyChange,
  page,
  totalPages,
  totalEntries,
  pageSize,
  onPageChange,
  pageSizeOptions,
  onPageSizeChange,
}: {
  rows: PackagePickerRow[];
  loading: boolean;
  selectedIds: string[];
  onToggle: (row: PackagePickerRow, checked: boolean) => void;
  onToggleAll?: (checked: boolean) => void;
  showQtyColumn?: boolean;
  sourceLocationId?: string | null;
  onQtyChange?: (id: string, value: number) => void;
  page: number;
  totalPages: number;
  totalEntries: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  pageSizeOptions?: number[];
  onPageSizeChange?: (size: number) => void;
}) {
  const allSelected = rows.length > 0 && rows.every((r) => selectedIds.includes(r.id));

  return (
    <div className="flex flex-col gap-3">
      <div className="relative overflow-hidden rounded-t-lg">
        <TableLoadingOverlay show={loading && rows.length > 0} />
        <Table className="table-fixed">
          <TableHeader>
            <TableRow className="border-b border-border bg-muted/50 hover:bg-muted/50">
              <TableHead className="w-10">
                {onToggleAll && <Checkbox checked={allSelected} onCheckedChange={(c) => onToggleAll(!!c)} />}
              </TableHead>
              <TableHead className="w-36 font-medium text-muted-foreground">Package ID</TableHead>
              <TableHead className="w-24 font-medium text-muted-foreground">Date</TableHead>
              <TableHead className="w-50 font-medium text-muted-foreground">Package Name</TableHead>
              <TableHead className="w-32 font-medium text-muted-foreground">Orig. Category</TableHead>
              <TableHead className="w-32 font-medium text-muted-foreground">Orig. Brand</TableHead>
              <TableHead className="w-24 text-center font-medium text-muted-foreground">Orig. Qty</TableHead>
              <TableHead className="w-24 text-center font-medium text-muted-foreground">Qty Left</TableHead>
              <TableHead className="w-24 text-center font-medium text-muted-foreground">Status</TableHead>
              {showQtyColumn && <TableHead className="w-32 text-center font-medium text-muted-foreground">Qty to Shift</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody className="[&_td]:py-4.5">
            {loading && rows.length === 0 &&
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={`sk-${i}`} className="border-b border-border">
                  {Array.from({ length: showQtyColumn ? 10 : 9 }).map((__, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))}
            {!loading && rows.length === 0 && (
              <TableRow className="border-b border-border">
                <TableCell colSpan={showQtyColumn ? 10 : 9} className="py-10 text-center text-muted-foreground">
                  No packages found.
                </TableCell>
              </TableRow>
            )}
            {rows.map((row) => {
              const checked = selectedIds.includes(row.id);
              const locationQty = sourceLocationId ? row.storageLocationBreakdown?.[sourceLocationId] : undefined;
              const maxQty = locationQty ?? row.quantityLeft;
              return (
                <TableRow key={row.id} className="border-b border-border">
                  <TableCell>
                    <Checkbox checked={checked} onCheckedChange={(c) => onToggle(row, !!c)} />
                  </TableCell>
                  <TableCell className="font-medium text-primary">{row.advertisedId}</TableCell>
                  <TableCell className="text-muted-foreground">{fmtDate(row.createdAt)}</TableCell>
                  <TableCell className="max-w-50 truncate" title={row.name}>{row.name}</TableCell>
                  <TableCell className="text-muted-foreground">{row.originalCategory || "-"}</TableCell>
                  <TableCell className="text-muted-foreground">{row.originalBrand || "-"}</TableCell>
                  <TableCell className="text-center">{row.originalQuantity}</TableCell>
                  <TableCell className="text-center">{row.quantityLeft}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={row.isActive ? "default" : "destructive"}>{row.isActive ? "Active" : "Inactive"}</Badge>
                  </TableCell>
                  {showQtyColumn && (
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Input
                          type="number"
                          min={0}
                          max={maxQty}
                          disabled={!checked || (!sourceLocationId && showQtyColumn)}
                          value={row.displayQuantityToShift ?? 1}
                          onChange={(e) => onQtyChange?.(row.id, parseFloat(e.target.value) || 0)}
                          className="w-20"
                        />
                        {maxQty != null && <span className="whitespace-nowrap text-xs text-muted-foreground">/ {maxQty}</span>}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <div className="px-4 pb-4">
        <TablePagination
          page={page}
          totalPages={totalPages}
          totalEntries={totalEntries}
          pageSize={pageSize}
          loading={loading}
          onPageChange={onPageChange}
          pageSizeOptions={pageSizeOptions}
          onPageSizeChange={onPageSizeChange}
        />
      </div>
    </div>
  );
}
