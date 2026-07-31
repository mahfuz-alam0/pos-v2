"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";

import { useShop } from "@/context/shop-context";
import { fetchInventorySnapshot } from "@/services/reporting/inventorySnapshot";
import { fetchSingleShop } from "@/services/shops/getSingle";

import { Button } from "@/components/ui/button";
import { DateRangeSelector, type SelectedDateResult } from "@/components/ui/date-range-selector";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import PdfExportDrawer from "@/components/ui/pdf-export-drawer";
import ExcelExportDrawer from "@/components/ui/excel-export-drawer";

import InventorySnapshotTable from "./InventorySnapshotTable";
import {
  SNAPSHOT_SECTIONS,
  SNAPSHOT_COLUMN_CONFIG,
  buildSnapshotHtml,
  buildSnapshotExcelSheets,
  exportSnapshotToCsv,
} from "./exportConfig";
import type { InventorySnapshotRow } from "./types";

const PAGE_SIZE = 50;
const EXPORT_BATCH_SIZE = 100;

function todayStr() {
  return format(new Date(), "yyyy-MM-dd");
}

export default function InventorySnapshot() {
  const { shopId } = useShop();

  const [selectedDate, setSelectedDate] = useState<SelectedDateResult>({
    startDate: todayStr(),
    endDate: todayStr(),
    timeEnabled: false,
  });

  const [runReport, setRunReport] = useState(false);
  const [storeInfo, setStoreInfo] = useState<any>({});
  const [rows, setRows] = useState<InventorySnapshotRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [totalEntries, setTotalEntries] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const [pdfOpen, setPdfOpen] = useState(false);
  const [excelOpen, setExcelOpen] = useState(false);
  const [exportRows, setExportRows] = useState<InventorySnapshotRow[]>([]);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!shopId) return;
    (async () => {
      const res = await fetchSingleShop(shopId);
      setStoreInfo(res?.data || {});
    })();
  }, [shopId]);

  const startDate = selectedDate.startDate ?? todayStr();
  const endDate = selectedDate.endDate ?? startDate;
  const dateRangeLabel = `${format(new Date(startDate), "MMM dd, yyyy")} – ${format(new Date(endDate), "MMM dd, yyyy")}`;

  const runFetch = useCallback(
    async (targetPage: number, append: boolean) => {
      if (!shopId) return;
      if (append) setLoadingMore(true);
      else setLoading(true);
      try {
        const res = await fetchInventorySnapshot({ shopId, startDate, endDate, page: targetPage, limit: PAGE_SIZE });
        const items: InventorySnapshotRow[] = res?.data?.data || [];
        const total = res?.data?.total || 0;
        const currentPage = res?.data?.page || targetPage;
        setRows((prev) => (append ? [...prev, ...items] : items));
        setTotalEntries(total);
        setPage(currentPage);
        setHasMore(currentPage * PAGE_SIZE < total);
        setRunReport(true);
      } catch (err: any) {
        toast.error(err?.message || "Failed to load inventory snapshot");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [shopId, startDate, endDate],
  );

  useEffect(() => {
    if (!shopId) return;
    runFetch(1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopId]);

  const handleRunReport = () => runFetch(1, false);
  const handleLoadMore = () => {
    if (!loadingMore && hasMore) runFetch(page + 1, true);
  };

  const fetchAllForExport = async () => {
    const total = totalEntries || 0;
    const totalBatches = total > 0 ? Math.ceil(total / EXPORT_BATCH_SIZE) : 1;
    setExporting(true);
    const toastId = toast.loading(`Loading 0 / ${total} records...`);
    try {
      let fetched = 0;
      const all: InventorySnapshotRow[] = [];
      for (let i = 0; i < totalBatches; i += 5) {
        const batchEnd = Math.min(i + 5, totalBatches);
        const pages = Array.from({ length: batchEnd - i }, (_, k) => i + k + 1);
        const results = await Promise.all(
          pages.map((p) => fetchInventorySnapshot({ shopId, startDate, endDate, page: p, limit: EXPORT_BATCH_SIZE })),
        );
        results.forEach((res) => {
          const pageData = res?.data?.data || [];
          all.push(...pageData);
          fetched += pageData.length;
        });
        toast.loading(`Loading ${fetched} / ${total} records...`, { id: toastId });
      }
      toast.success(`Loaded ${all.length} records for export.`, { id: toastId });
      return all;
    } catch (err) {
      toast.error("Failed to fetch all data, using current page only.", { id: toastId });
      return rows;
    } finally {
      setExporting(false);
    }
  };

  const openPdf = async () => {
    setExportRows(await fetchAllForExport());
    setPdfOpen(true);
  };
  const openExcel = async () => {
    setExportRows(await fetchAllForExport());
    setExcelOpen(true);
  };
  const handleExportCsv = async () => {
    const all = await fetchAllForExport();
    exportSnapshotToCsv(all, dateRangeLabel, `inventory_snapshot_${todayStr()}.csv`);
  };

  const exportMetadata = { storeName: storeInfo?.name || "Store", dateRange: dateRangeLabel };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="w-52 text-sm">Date Range</div>
          <DateRangeSelector
            setSelectedDate={setSelectedDate}
            initialDate={{ startDate: selectedDate.startDate, endDate: selectedDate.endDate }}
            showAllOption={false}
            singleDateMode
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="w-52 shrink-0" aria-hidden="true" />
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="outline" disabled={!runReport || exporting}>Export</Button>} />
            <DropdownMenuContent>
              <DropdownMenuItem onClick={openPdf}>Export to PDF</DropdownMenuItem>
              <DropdownMenuItem onClick={openExcel}>Export to Excel</DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportCsv}>Export to CSV</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={handleRunReport} disabled={loading}>
            Run Report
          </Button>
        </div>
      </div>

      {runReport && (
        <InventorySnapshotTable
          data={rows}
          loading={loading}
          loadingMore={loadingMore}
          hasMore={hasMore}
          totalEntries={totalEntries}
          onLoadMore={handleLoadMore}
        />
      )}

      <PdfExportDrawer
        open={pdfOpen}
        onClose={() => setPdfOpen(false)}
        data={exportRows}
        metadata={exportMetadata}
        availableSections={SNAPSHOT_SECTIONS}
        htmlGenerator={buildSnapshotHtml as any}
        columnConfig={SNAPSHOT_COLUMN_CONFIG}
      />
      <ExcelExportDrawer
        open={excelOpen}
        onClose={() => setExcelOpen(false)}
        data={exportRows}
        metadata={exportMetadata}
        availableSections={SNAPSHOT_SECTIONS}
        excelGenerator={buildSnapshotExcelSheets as any}
        columnConfig={SNAPSHOT_COLUMN_CONFIG}
        filename={`Inventory_Snapshot_${todayStr()}`}
      />
    </div>
  );
}
