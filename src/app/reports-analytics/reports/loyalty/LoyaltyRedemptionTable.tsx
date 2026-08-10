"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";

import { fetchLoyaltyPointsDiscount } from "@/services/reporting/loyaltyPointsDiscount";
import { fetchSingleShop } from "@/services/shops/getSingle";
import { useShop } from "@/context/shop-context";
import { useSettings } from "@/context/settings-context";

import { Button } from "@/components/ui/button";
import { DateRangeSelector, type SelectedDateResult } from "@/components/ui/date-range-selector";
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

import {
  REDEMPTION_SECTIONS,
  REDEMPTION_EXCEL_COLUMN_CONFIG,
  getRedemptionSummary,
  buildRedemptionHtml,
  buildRedemptionExcelSheets,
  exportRedemptionToCsv,
} from "./exportConfig";
import type { LoyaltyRedemptionRow } from "./types";

const PAGE_SIZE = 20;

function money(v: any) {
  const n = Number(v);
  return `$${Number.isFinite(n) ? n.toFixed(2) : "0.00"}`;
}

export default function LoyaltyRedemptionTable() {
  const { shopId } = useShop();
  const { defaultPageSize } = useSettings();

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const [selectedDate, setSelectedDate] = useState<SelectedDateResult>({
    startDate: todayStr,
    endDate: todayStr,
    timeEnabled: false,
  });

  const [runReport, setRunReport] = useState(false);
  const [storeInfo, setStoreInfo] = useState<any>({});
  const [rows, setRows] = useState<LoyaltyRedemptionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [pagination, setPagination] = useState({ page: 1, pageSize: defaultPageSize, totalPages: 1, totalEntries: 0 });

  const [pdfOpen, setPdfOpen] = useState(false);
  const [excelOpen, setExcelOpen] = useState(false);

  const startDate = selectedDate.startDate ?? todayStr;
  const endDate = selectedDate.endDate ?? startDate;

  const fetchData = useCallback(
    async (page = 1, size = pageSize) => {
      setLoading(true);
      try {
        const [res, shopRes] = await Promise.all([
          fetchLoyaltyPointsDiscount({ page, limit: size, startDate, endDate, shopId: shopId || "" }),
          shopId ? fetchSingleShop(shopId) : Promise.resolve(null),
        ]);
        setRows(res?.data?.data ?? []);
        if (shopRes) setStoreInfo(shopRes.data || {});
        const pd = res?.data?.paginationData;
        if (pd) {
          setPagination({
            page: pd.currentPage || page,
            pageSize: size,
            totalPages: pd.totalPages || 1,
            totalEntries: pd.totalEntries || 0,
          });
        }
      } catch (err: any) {
        toast.error(err?.message || "Failed to load loyalty redemption values");
      } finally {
        setLoading(false);
      }
    },
    [startDate, endDate, shopId, pageSize],
  );

  const handleRunReport = async () => {
    await fetchData(1);
    setRunReport(true);
  };

  useEffect(() => {
    handleRunReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleExportCsv = () => {
    if (!rows.length) {
      toast.warning("No data to export");
      return;
    }
    exportRedemptionToCsv(rows, `loyalty_redemption_${format(new Date(), "yyyy-MM-dd")}.csv`);
    toast.success("CSV downloaded");
  };

  const summary = getRedemptionSummary(rows);
  const dateRangeLabel = `${format(new Date(startDate), "MMM dd, yyyy")} – ${format(new Date(endDate), "MMM dd, yyyy")}`;
  const exportMetadata = {
    storeName: storeInfo?.name || storeInfo?.shopName || "Store",
    dateRange: dateRangeLabel,
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <DateRangeSelector setSelectedDate={setSelectedDate} initialDate={{ startDate: selectedDate.startDate, endDate: selectedDate.endDate }} />
        <div className="flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="outline" disabled={!runReport}>Export</Button>} />
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setPdfOpen(true)}>Export to PDF</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setExcelOpen(true)}>Export to Excel</DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportCsv}>Export to CSV</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={handleRunReport} disabled={loading}>
            Run Report
          </Button>
        </div>
      </div>

      {runReport && (
        <div className="flex flex-col gap-3">
          <div className="relative overflow-hidden rounded-xl ring-1 ring-foreground/10">
            <TableLoadingOverlay show={loading && rows.length > 0} />
            <div className="overflow-auto *:data-[slot=table-container]:overflow-visible" style={{ maxHeight: "calc(100vh - 420px)" }}>
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-muted [&_tr]:border-b-0">
                  <TableRow className="bg-muted/60">
                    <TableHead className="w-32">Day</TableHead>
                    <TableHead className="w-40">Location</TableHead>
                    <TableHead className="w-37.5 text-right">Discount Amount</TableHead>
                    <TableHead className="w-45">Discount Rate Type</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                  {rows.length > 0 && (
                    <TableRow className="border-b-0 bg-muted/40 font-semibold">
                      <TableHead colSpan={2}>Total</TableHead>
                      <TableHead className="text-right">{summary["Total Discount Amount"]}</TableHead>
                      <TableHead colSpan={2}>-</TableHead>
                    </TableRow>
                  )}
                </TableHeader>
                <TableBody>
                  {loading && rows.length === 0 &&
                    Array.from({ length: 6 }).map((_, i) => (
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
                        No loyalty redemption values found.
                      </TableCell>
                    </TableRow>
                  )}

                  {rows.map((row, i) => (
                    <TableRow key={row._id ?? i} className={`border-b-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] ${i % 2 === 1 ? "bg-table-zebra" : ""}`}>
                      <TableCell>{row.createdAt ? format(new Date(row.createdAt), "yyyy-MM-dd") : "N/A"}</TableCell>
                      <TableCell>{(typeof row.shopId === "object" ? row.shopId?.name : row.shopId) || "N/A"}</TableCell>
                      <TableCell className="text-right">{money(row.discountAmount)}</TableCell>
                      <TableCell>{row.discountRateType || "N/A"}</TableCell>
                      <TableCell>{row.notes || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
          <TablePagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            totalEntries={pagination.totalEntries}
            pageSize={pageSize}
            loading={loading}
            onPageChange={(p) => fetchData(p, pageSize)}
            pageSizeOptions={[30, 50, 100, 200]}
            onPageSizeChange={(s) => {
              setPageSize(s);
              fetchData(1, s);
            }}
          />
        </div>
      )}

      <PdfExportDrawer
        open={pdfOpen}
        onClose={() => setPdfOpen(false)}
        data={rows}
        metadata={exportMetadata}
        availableSections={REDEMPTION_SECTIONS}
        htmlGenerator={buildRedemptionHtml as any}
        columnConfig={REDEMPTION_EXCEL_COLUMN_CONFIG}
      />
      <ExcelExportDrawer
        open={excelOpen}
        onClose={() => setExcelOpen(false)}
        data={rows}
        metadata={exportMetadata}
        availableSections={REDEMPTION_SECTIONS}
        excelGenerator={buildRedemptionExcelSheets as any}
        columnConfig={REDEMPTION_EXCEL_COLUMN_CONFIG}
        filename={`Loyalty_Redemption_${format(new Date(), "yyyy-MM-dd")}`}
      />
    </div>
  );
}
