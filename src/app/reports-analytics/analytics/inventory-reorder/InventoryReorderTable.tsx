"use client";

import { useEffect, useState, useCallback } from "react";
import { format } from "date-fns";
import { AlertTriangle, ShieldCheck, Info } from "lucide-react";

import { useShop } from "@/context/shop-context";
import { fetchInventoryReorder } from "@/services/reporting/inventoryReorder";
import { fetchCategoriesList } from "@/services/categories/list";
import { fetchSuppliersList } from "@/services/suppliers/list";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ApiSelect } from "@/components/ui/api-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TablePagination, TableLoadingOverlay } from "@/components/ui/table-pagination";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import PdfExportDrawer from "@/components/ui/pdf-export-drawer";
import ExcelExportDrawer from "@/components/ui/excel-export-drawer";
import { toast } from "sonner";

import {
  SECTIONS,
  EXCEL_COLUMN_CONFIG,
  buildInventoryReorderHtml,
  buildInventoryReorderExcelSheets,
  exportInventoryReorderToCsv,
} from "./exportConfig";

const PAGE_SIZE = 50;
const DAY_OPTIONS = [7, 14, 30, 60, 90];
const MARGIN_OPTIONS = [5, 10, 15, 20, 25, 30];

function daysRemainingBadge(value: any) {
  if (value === 0 || value === "0") {
    return (
      <Badge variant="destructive">
        <AlertTriangle /> Out of Stock
      </Badge>
    );
  }
  const variant = value <= 3 ? "destructive" : value <= 7 ? "outline" : "secondary";
  return (
    <Badge variant={variant}>
      {value <= 7 ? <AlertTriangle /> : <ShieldCheck />}
      {value != null ? `${Number(value).toFixed(2)} Days` : "-"}
    </Badge>
  );
}

export default function InventoryReorderTable() {
  const { shopId } = useShop();

  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, totalEntries: 0 });

  const [selectedDays, setSelectedDays] = useState(7);
  const [categoryId, setCategoryId] = useState<string | number | null>(null);
  const [supplierId, setSupplierId] = useState<string | number | null>(null);
  const [safetyMargin, setSafetyMargin] = useState(10);

  const [pdfOpen, setPdfOpen] = useState(false);
  const [excelOpen, setExcelOpen] = useState(false);

  const filterInfo = `Replenish ${selectedDays} days · Safety margin ${safetyMargin}% · Generated ${format(new Date(), "MMM dd, yyyy")}`;

  const fetchData = useCallback(
    async (page = 1) => {
      if (!shopId) return;
      setLoading(true);
      try {
        const params: Record<string, any> = {
          page,
          limit: PAGE_SIZE,
          replenishDays: selectedDays,
          safetyMargin,
        };
        if (categoryId) params.categoryId = categoryId;
        if (supplierId) params.supplierId = supplierId;

        const res = await fetchInventoryReorder(shopId, params);
        setRows(res?.tableData ?? []);
        if (res?.paginationData) {
          setPagination({
            page: res.paginationData.currentPage || page,
            totalPages: res.paginationData.totalPages || 1,
            totalEntries: res.paginationData.totalEntries || 0,
          });
        }
      } catch (err: any) {
        toast.error(err?.message || "Failed to load reorder data");
      } finally {
        setLoading(false);
      }
    },
    [shopId, selectedDays, safetyMargin, categoryId, supplierId],
  );

  useEffect(() => {
    fetchData(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopId]);

  const fetchCategoryPage = useCallback(async (page: number, search: string) => {
    const res = await fetchCategoriesList({ page, limit: 20, search });
    return {
      items: (res?.data ?? []).map((c: any) => ({ id: c.id, name: c.name })),
      totalPages: res?.paginationData?.totalPages ?? 1,
    };
  }, []);

  const fetchSupplierPage = useCallback(async (page: number, search: string) => {
    const res = await fetchSuppliersList({ page, limit: 20, search });
    return {
      items: (res?.data ?? []).map((s: any) => ({ id: s.id, name: s.name })),
      totalPages: res?.paginationData?.totalPages ?? 1,
    };
  }, []);

  const handleExportCsv = () => {
    if (!rows.length) {
      toast.warning("No data to export");
      return;
    }
    exportInventoryReorderToCsv(rows, filterInfo, `inventory_reorder_${format(new Date(), "yyyy-MM-dd")}.csv`);
    toast.success("CSV downloaded");
  };

  const exportData = { tableData: rows };
  const exportMetadata = { filterInfo };

  return (
    <div className="flex flex-col gap-4 p-6">
      <Card className="gap-1 p-4 shadow-sm ring-0">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-lg font-semibold">Supply Tracker</h1>
            <p className="text-sm text-muted-foreground">
              Calculate how much inventory you need to re-order based on sales velocity and current stock levels.
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="outline">Export</Button>} />
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setPdfOpen(true)}>Export to PDF</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setExcelOpen(true)}>Export to Excel</DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportCsv}>Export to CSV</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </Card>

      <Card className="gap-2 border-blue-200 bg-blue-50 p-4 text-sm dark:border-blue-900 dark:bg-blue-950/20">
        <div className="flex items-start gap-2">
          <Info className="mt-0.5 size-4 shrink-0 text-blue-600 dark:text-blue-400" />
          <div className="space-y-2">
            <p>
              Optimize your inventory levels using 90-day historical sales data. This tool calculates precise reorder
              needs by balancing sales velocity with current stock.
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <strong>PAR Level Formula:</strong> (Avg Daily Sales + Safety Margin) × Reorder Days.
              </li>
              <li>
                <strong>Reorder Qty:</strong> PAR Level - Current On-Hand Stock.
              </li>
            </ul>
            <p className="text-xs text-muted-foreground italic">
              Note: Average daily sales calculations exclude out-of-stock days to ensure metric accuracy.
            </p>
          </div>
        </div>
      </Card>

      <Card className="gap-0 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm">Replenish</span>
          <Select value={String(selectedDays)} onValueChange={(v) => setSelectedDays(Number(v))}>
            <SelectTrigger className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DAY_OPTIONS.map((d) => (
                <SelectItem key={d} value={String(d)}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-sm">days of inventory in</span>
          <ApiSelect placeholder="All Categories" value={categoryId} onChange={setCategoryId} fetchPage={fetchCategoryPage} />
          <span className="text-sm">from</span>
          <ApiSelect placeholder="All Suppliers" value={supplierId} onChange={setSupplierId} fetchPage={fetchSupplierPage} />
          <span className="text-sm">with a</span>
          <Select value={String(safetyMargin)} onValueChange={(v) => setSafetyMargin(Number(v))}>
            <SelectTrigger className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MARGIN_OPTIONS.map((m) => (
                <SelectItem key={m} value={String(m)}>
                  {m}%
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-sm">safety margin.</span>
          <Button onClick={() => fetchData(1)} disabled={loading}>
            Search
          </Button>
        </div>
      </Card>

      <Card className="gap-3 p-4">
        <div className="relative overflow-hidden rounded-xl ring-1 ring-foreground/10">
          <TableLoadingOverlay show={loading && rows.length > 0} />
          <div className="h-[calc(100vh-500px)] min-h-100 overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-muted [&_tr]:border-b-0">
                <TableRow className="bg-muted/60">
                  <TableHead className="w-87.5">Product Details</TableHead>
                  <TableHead className="w-50">Stock Health</TableHead>
                  <TableHead className="w-30 text-center">Avg Sales / Day</TableHead>
                  <TableHead className="w-37.5 text-center">Days Remaining</TableHead>
                  <TableHead className="w-30 text-center">Reorder Qty</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && rows.length === 0 &&
                  Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={`s-${i}`} className="border-b-0">
                      {Array.from({ length: 5 }).map((__, j) => (
                        <TableCell key={j}>
                          <div className="h-4 w-full animate-pulse rounded bg-muted" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}

                {!loading && rows.length === 0 && (
                  <TableRow className="border-b-0">
                    <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                      No inventory found.
                    </TableCell>
                  </TableRow>
                )}

                {rows.map((row, i) => {
                  const onHand = row.qtyOnHand || 0;
                  const par = row.parValue || 1;
                  const percent = Math.min((onHand / par) * 100, 100);
                  const color = percent <= 25 ? "#ff4d4f" : percent <= 50 ? "#faad14" : percent >= 100 ? "#52c41a" : "#1890ff";

                  return (
                    <TableRow key={row.key ?? i} className={`border-b-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] ${i % 2 === 1 ? "bg-table-zebra" : ""}`}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex size-10 shrink-0 items-center justify-center rounded-md border border-blue-200 bg-blue-50 font-medium text-blue-600 dark:border-blue-900 dark:bg-blue-950/40">
                            {i + 1}
                          </div>
                          <div className="flex min-w-0 flex-col">
                            <span className="truncate text-sm font-semibold">{row.productName}</span>
                            <div className="mt-1 flex items-center gap-2">
                              <Badge variant="secondary">{row.categoryName}</Badge>
                              <span className="truncate text-xs text-muted-foreground">{row.supplierName}</span>
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>
                              On Hand: <strong className="text-foreground">{Number(onHand).toFixed(2)}</strong>
                            </span>
                            <span>PAR: {Number(par).toFixed(2)}</span>
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                            <div className="h-full transition-all" style={{ width: `${percent}%`, backgroundColor: color }} />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center">
                          <span className="font-medium">
                            {row.avgSalesPerDay != null ? Number(row.avgSalesPerDay).toFixed(2) : "-"}
                          </span>
                          <span className="text-[10px] text-muted-foreground">units/day</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">{daysRemainingBadge(row.daysRemaining)}</TableCell>
                      <TableCell className="text-center">
                        {row.qtyNeeded > 0 ? (
                          <span className="inline-block rounded-lg border border-blue-100 bg-blue-50 px-3 py-1 font-bold text-blue-600 dark:border-blue-900 dark:bg-blue-950/40">
                            {Number(row.qtyNeeded).toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
        <TablePagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          totalEntries={pagination.totalEntries}
          pageSize={PAGE_SIZE}
          loading={loading}
          onPageChange={(p) => fetchData(p)}
        />
      </Card>

      <PdfExportDrawer
        open={pdfOpen}
        onClose={() => setPdfOpen(false)}
        data={exportData}
        metadata={exportMetadata}
        availableSections={SECTIONS}
        htmlGenerator={buildInventoryReorderHtml as any}
        columnConfig={EXCEL_COLUMN_CONFIG}
      />
      <ExcelExportDrawer
        open={excelOpen}
        onClose={() => setExcelOpen(false)}
        data={exportData}
        metadata={exportMetadata}
        availableSections={SECTIONS}
        excelGenerator={buildInventoryReorderExcelSheets as any}
        columnConfig={EXCEL_COLUMN_CONFIG}
        filename={`inventory_reorder_${format(new Date(), "yyyy-MM-dd")}`}
      />
    </div>
  );
}
