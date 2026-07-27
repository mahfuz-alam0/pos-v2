"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TablePagination } from "@/components/ui/table-pagination";

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
}) {
  const allSelected = rows.length > 0 && rows.every((r) => selectedIds.includes(r.id));

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
        <Table>
          <TableHeader className="[&_tr]:border-b-0">
            <TableRow className="bg-muted/60">
              <TableHead className="w-10">
                {onToggleAll && <Checkbox checked={allSelected} onCheckedChange={(c) => onToggleAll(!!c)} />}
              </TableHead>
              <TableHead>Package ID</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Package Name</TableHead>
              <TableHead>Orig. Category</TableHead>
              <TableHead>Orig. Brand</TableHead>
              <TableHead className="text-center">Orig. Qty</TableHead>
              <TableHead className="text-center">Qty Left</TableHead>
              <TableHead className="text-center">Status</TableHead>
              {showQtyColumn && <TableHead className="text-center">Qty to Shift</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && rows.length === 0 &&
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={`sk-${i}`} className="border-b-0">
                  {Array.from({ length: showQtyColumn ? 10 : 9 }).map((__, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))}
            {!loading && rows.length === 0 && (
              <TableRow className="border-b-0">
                <TableCell colSpan={showQtyColumn ? 10 : 9} className="py-10 text-center text-muted-foreground">
                  No packages found.
                </TableCell>
              </TableRow>
            )}
            {rows.map((row, i) => {
              const checked = selectedIds.includes(row.id);
              const locationQty = sourceLocationId ? row.storageLocationBreakdown?.[sourceLocationId] : undefined;
              const maxQty = locationQty ?? row.quantityLeft;
              return (
                <TableRow
                  key={row.id}
                  className={`border-b-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] ${i % 2 === 1 ? "bg-stone-100 dark:bg-stone-800" : ""}`}
                >
                  <TableCell>
                    <Checkbox checked={checked} onCheckedChange={(c) => onToggle(row, !!c)} />
                  </TableCell>
                  <TableCell className="font-medium">{row.advertisedId}</TableCell>
                  <TableCell>{fmtDate(row.createdAt)}</TableCell>
                  <TableCell className="max-w-50 truncate" title={row.name}>{row.name}</TableCell>
                  <TableCell>{row.originalCategory || "-"}</TableCell>
                  <TableCell>{row.originalBrand || "-"}</TableCell>
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
      <TablePagination page={page} totalPages={totalPages} totalEntries={totalEntries} pageSize={pageSize} loading={loading} onPageChange={onPageChange} />
    </div>
  );
}
