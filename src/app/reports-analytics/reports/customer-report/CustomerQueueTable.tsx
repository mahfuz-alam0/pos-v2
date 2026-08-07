"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";

import { useShop } from "@/context/shop-context";
import { fetchQueuedCustomers } from "@/services/reporting/queuedCustomers";
import { fetchSingleShop } from "@/services/shops/getSingle";

import { Button } from "@/components/ui/button";
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
import { DateRangeSelector, type SelectedDateResult } from "@/components/ui/date-range-selector";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import PdfExportDrawer from "@/components/ui/pdf-export-drawer";
import ExcelExportDrawer from "@/components/ui/excel-export-drawer";

import {
  QUEUE_SECTIONS,
  QUEUE_EXCEL_COLUMN_CONFIG,
  getQueueSummary,
  buildQueueHtml,
  buildQueueExcelSheets,
  exportQueueToCsv,
} from "./exportConfig.queue";

const PAGE_SIZE = 20;

function todayStr() {
  return format(new Date(), "yyyy-MM-dd");
}

export default function CustomerQueueTable() {
  const { shopId } = useShop();

  const [selectedDate, setSelectedDate] = useState<SelectedDateResult>({
    startDate: todayStr(),
    endDate: todayStr(),
    timeEnabled: false,
  });
  const [isOrderPlaced, setIsOrderPlaced] = useState("");
  const [runReport, setRunReport] = useState(false);
  const [storeInfo, setStoreInfo] = useState<any>({});

  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, totalEntries: 0 });

  const [pdfOpen, setPdfOpen] = useState(false);
  const [excelOpen, setExcelOpen] = useState(false);

  useEffect(() => {
    if (!shopId) return;
    (async () => {
      const res = await fetchSingleShop(shopId);
      setStoreInfo(res?.data || {});
    })();
  }, [shopId]);

  const fetchData = useCallback(
    async (page = 1) => {
      setLoading(true);
      try {
        const res = await fetchQueuedCustomers({
          page,
          limit: PAGE_SIZE,
          shopId: shopId || "",
          startDate: selectedDate.startDate || "",
          endDate: selectedDate.endDate || "",
          ...(isOrderPlaced !== "" && { isOrderPlaced }),
        });
        setRows(res?.data ?? []);
        const pd = res?.paginationData;
        if (pd) {
          setPagination({ page: pd.currentPage || page, totalPages: pd.totalPages || 1, totalEntries: pd.totalEntries || 0 });
        }
      } catch (err: any) {
        toast.error(err?.message || "Failed to load customer queue");
      } finally {
        setLoading(false);
      }
    },
    [shopId, selectedDate, isOrderPlaced],
  );

  const handleRunReport = async () => {
    await fetchData(1);
    setRunReport(true);
  };

  useEffect(() => {
    if (!shopId) return;
    handleRunReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopId]);

  const handleExportCsv = () => {
    if (!rows.length) {
      toast.warning("No data to export");
      return;
    }
    exportQueueToCsv(rows, `customer_queue_${todayStr()}.csv`);
    toast.success("CSV downloaded");
  };

  const summary = getQueueSummary(rows, selectedDate);
  const totalCustomers = pagination.totalEntries || rows.length;
  const maxQueueTime = Math.max(...rows.map((r) => r.queuedInSeconds || 0), 0);
  const avgQueueTime = rows.length ? rows.reduce((sum, r) => sum + (r.queuedInSeconds || 0), 0) / rows.length : 0;

  const exportMetadata = {
    storeName: storeInfo?.name || storeInfo?.shopName || "Store",
    date: todayStr(),
    selectedDate,
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="w-52 text-sm">Date Range</div>
          <DateRangeSelector setSelectedDate={setSelectedDate} initialDate={selectedDate} showAllOption={false} className="w-62.5" />
        </div>

        <div className="flex items-center gap-3">
          <div className="w-52 text-sm">Order Placed</div>
          <Select
            items={[
              { value: "", label: "All" },
              { value: "true", label: "Yes" },
              { value: "false", label: "No" },
            ]}
            value={isOrderPlaced}
            onValueChange={setIsOrderPlaced}
          >
            <SelectTrigger className="w-62.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All</SelectItem>
              <SelectItem value="true">Yes</SelectItem>
              <SelectItem value="false">No</SelectItem>
            </SelectContent>
          </Select>
        </div>

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
                    <TableHead className="w-50">Customer</TableHead>
                    <TableHead className="w-50">Enqueued</TableHead>
                    <TableHead className="w-50">Dequeued</TableHead>
                    <TableHead className="w-45">Checked In By</TableHead>
                    <TableHead className="w-32 text-center">Order Placed</TableHead>
                    <TableHead className="w-37.5 text-right">Queued (Seconds)</TableHead>
                  </TableRow>
                  <TableRow className="border-b-0 bg-muted/40 font-semibold">
                    <TableHead className="text-center">TOTALS → ({summary["Total Customers"]} customers)</TableHead>
                    <TableHead className="text-center">-</TableHead>
                    <TableHead className="text-center">-</TableHead>
                    <TableHead className="text-center">-</TableHead>
                    <TableHead className="text-center">-</TableHead>
                    <TableHead className="text-right">
                      Avg: {avgQueueTime.toFixed(2)}s | Max: {maxQueueTime.toFixed(2)}s
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading && rows.length === 0 &&
                    Array.from({ length: 6 }).map((_, i) => (
                      <TableRow key={`s-${i}`} className="border-b-0">
                        {Array.from({ length: 6 }).map((__, j) => (
                          <TableCell key={j}>
                            <div className="h-4 w-full animate-pulse rounded bg-muted" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  {!loading && rows.length === 0 && (
                    <TableRow className="border-b-0">
                      <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                        No queue data found.
                      </TableCell>
                    </TableRow>
                  )}
                  {rows.map((row, i) => (
                    <TableRow key={row._id ?? i} className={`border-b-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] ${i % 2 === 1 ? "bg-table-zebra" : ""}`}>
                      <TableCell>{`${row.firstName || ""} ${row.lastName || ""}`.trim()}</TableCell>
                      <TableCell>{row.enqueued ? format(new Date(row.enqueued), "yyyy-MM-dd HH:mm:ss") : "N/A"}</TableCell>
                      <TableCell>{row.dequeued ? format(new Date(row.dequeued), "yyyy-MM-dd HH:mm:ss") : "N/A"}</TableCell>
                      <TableCell>{row.employeeName || "-"}</TableCell>
                      <TableCell className="text-center">
                        {row.isOrderPlaced === undefined || row.isOrderPlaced === null ? "N/A" : row.isOrderPlaced ? "Yes" : "No"}
                      </TableCell>
                      <TableCell className="text-right">{(row.queuedInSeconds || 0).toFixed(2)}</TableCell>
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
            pageSize={PAGE_SIZE}
            loading={loading}
            onPageChange={(p) => fetchData(p)}
          />
        </div>
      )}

      <PdfExportDrawer
        open={pdfOpen}
        onClose={() => setPdfOpen(false)}
        data={rows}
        metadata={exportMetadata}
        availableSections={QUEUE_SECTIONS}
        htmlGenerator={buildQueueHtml as any}
        columnConfig={QUEUE_EXCEL_COLUMN_CONFIG}
      />
      <ExcelExportDrawer
        open={excelOpen}
        onClose={() => setExcelOpen(false)}
        data={rows}
        metadata={exportMetadata}
        availableSections={QUEUE_SECTIONS}
        excelGenerator={buildQueueExcelSheets as any}
        columnConfig={QUEUE_EXCEL_COLUMN_CONFIG}
        filename={`Customer_Queue_${todayStr()}`}
      />
    </div>
  );
}
