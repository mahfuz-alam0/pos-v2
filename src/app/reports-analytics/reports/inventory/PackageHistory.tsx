"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";

import { useShop } from "@/context/shop-context";
import { useSettings } from "@/context/settings-context";
import { fetchInventoryPackageHistory } from "@/services/reporting/inventoryPackageHistory";
import { listMinimalPackages } from "@/services/packages/listMinimal";
import { fetchSingleShop } from "@/services/shops/getSingle";

import { Button } from "@/components/ui/button";
import { ApiSelect } from "@/components/ui/api-select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import PdfExportDrawer from "@/components/ui/pdf-export-drawer";
import ExcelExportDrawer from "@/components/ui/excel-export-drawer";

import PackageHistoryTable from "./PackageHistoryTable";
import {
  PACKAGE_HISTORY_SECTIONS,
  PACKAGE_HISTORY_COLUMN_CONFIG,
  buildPackageHistoryHtml,
  buildPackageHistoryExcelSheets,
  exportPackageHistoryToCsv,
} from "./exportConfig";
import type { PackageHistoryRow, InventoryPagination } from "./types";

const PAGE_SIZE = 20;
const EXPORT_BATCH_SIZE = 100;

function todayStr() {
  return format(new Date(), "yyyy-MM-dd");
}

function emptyPagination(size = PAGE_SIZE): InventoryPagination {
  return { page: 1, pageSize: size, totalEntries: 0, totalPages: 1 };
}

export default function PackageHistory() {
  const { shopId } = useShop();
  const { defaultPageSize } = useSettings();

  const [runReport, setRunReport] = useState(false);
  const [storeInfo, setStoreInfo] = useState<any>({});
  const [packageId, setPackageId] = useState<string | number | null>(null);

  const [rows, setRows] = useState<PackageHistoryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [pagination, setPagination] = useState(() => emptyPagination(defaultPageSize));

  const [pdfOpen, setPdfOpen] = useState(false);
  const [excelOpen, setExcelOpen] = useState(false);
  const [exportRows, setExportRows] = useState<PackageHistoryRow[]>([]);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!shopId) return;
    (async () => {
      const res = await fetchSingleShop(shopId);
      setStoreInfo(res?.data || {});
    })();
  }, [shopId]);

  const fetchPackagePage = useCallback(
    async (page: number, search: string) => {
      const res = await listMinimalPackages(shopId, undefined, { page, limit: 20, search });
      const packages = res?.data?.data?.packages || [];
      return {
        items: packages.map((p: any) => ({
          id: p.id,
          name: p.advertisedId ? `${p.advertisedId} - ${p.name}` : p.name,
        })),
        totalPages: res?.data?.data?.paginationData?.totalPages ?? 1,
      };
    },
    [shopId],
  );

  const fetchDetail = useCallback(
    async (page = 1, size = pageSize) => {
      if (!packageId) return;
      setLoading(true);
      try {
        const res = await fetchInventoryPackageHistory({ packageId, page, limit: size });
        setRows(res?.data?.data || []);
        const pd = res?.data?.paginationData;
        if (pd) {
          setPagination({ page: pd.currentPage || page, pageSize: size, totalEntries: pd.totalEntries || 0, totalPages: pd.totalPages || 1 });
        }
      } catch (err: any) {
        toast.error(err?.message || "Failed to load package history");
      } finally {
        setLoading(false);
      }
    },
    [packageId, pageSize],
  );

  const handleRunReport = async () => {
    if (!packageId) {
      toast.warning("Select a package first");
      return;
    }
    await fetchDetail(1);
    setRunReport(true);
  };

  const fetchAllForExport = async () => {
    const total = pagination.totalEntries || 0;
    const totalBatches = total > 0 ? Math.ceil(total / EXPORT_BATCH_SIZE) : 1;
    setExporting(true);
    const toastId = toast.loading(`Loading 0 / ${total} records...`);
    try {
      let fetched = 0;
      const all: PackageHistoryRow[] = [];
      for (let i = 0; i < totalBatches; i += 5) {
        const batchEnd = Math.min(i + 5, totalBatches);
        const pages = Array.from({ length: batchEnd - i }, (_, k) => i + k + 1);
        const results = await Promise.all(
          pages.map((page) => fetchInventoryPackageHistory({ packageId, page, limit: EXPORT_BATCH_SIZE })),
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
    exportPackageHistoryToCsv(all, `package_history_${todayStr()}.csv`);
  };

  const exportMetadata = { storeName: storeInfo?.name || "Store", dateRange: "" };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="w-52 text-sm">Package Id*</div>
          <ApiSelect placeholder="Select a package" value={packageId} onChange={setPackageId} fetchPage={fetchPackagePage} triggerClassName="w-75" />
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
        <PackageHistoryTable
          data={rows}
          loading={loading}
          pagination={pagination}
          onPageChange={(p) => fetchDetail(p)}
          onPageSizeChange={(s) => {
            setPageSize(s);
            fetchDetail(1, s);
          }}
        />
      )}

      <PdfExportDrawer
        open={pdfOpen}
        onClose={() => setPdfOpen(false)}
        data={exportRows}
        metadata={exportMetadata}
        availableSections={PACKAGE_HISTORY_SECTIONS}
        htmlGenerator={buildPackageHistoryHtml as any}
        columnConfig={PACKAGE_HISTORY_COLUMN_CONFIG}
      />
      <ExcelExportDrawer
        open={excelOpen}
        onClose={() => setExcelOpen(false)}
        data={exportRows}
        metadata={exportMetadata}
        availableSections={PACKAGE_HISTORY_SECTIONS}
        excelGenerator={buildPackageHistoryExcelSheets as any}
        columnConfig={PACKAGE_HISTORY_COLUMN_CONFIG}
        filename={`Package_History_${todayStr()}`}
      />
    </div>
  );
}
