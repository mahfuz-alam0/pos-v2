"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";

import { useShop } from "@/context/shop-context";
import { useSettings } from "@/context/settings-context";
import { fetchInventoryTransactions } from "@/services/reporting/inventoryTransactions";
import { fetchCategoriesList } from "@/services/categories/list";
import { fetchProductsList } from "@/services/products/list";
import { fetchStorageLocations } from "@/services/storageLocations/list";
import { fetchSingleShop } from "@/services/shops/getSingle";

import { Button } from "@/components/ui/button";
import { ApiSelect } from "@/components/ui/api-select";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateRangeSelector, type SelectedDateResult } from "@/components/ui/date-range-selector";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import PdfExportDrawer from "@/components/ui/pdf-export-drawer";
import ExcelExportDrawer from "@/components/ui/excel-export-drawer";

import InventoryTransactionsTable from "./InventoryTransactionsTable";
import {
  TRANSACTIONS_SECTIONS,
  TRANSACTIONS_COLUMN_CONFIG,
  buildTransactionsHtml,
  buildTransactionsExcelSheets,
  exportTransactionsToCsv,
} from "./exportConfig";
import type { InventoryTransactionRow, InventoryPagination } from "./types";

const PAGE_SIZE = 20;
const EXPORT_BATCH_SIZE = 100;

const TRANSACTION_TYPES = [
  { value: "SALE", label: "Sale" },
  { value: "PACKAGE_RECONCILED", label: "Package Reconciled" },
  { value: "PACKAGE_CONVERTED", label: "Package Converted" },
];

function todayStr() {
  return format(new Date(), "yyyy-MM-dd");
}

function emptyPagination(size = PAGE_SIZE): InventoryPagination {
  return { page: 1, pageSize: size, totalEntries: 0, totalPages: 1 };
}

export default function InventoryTransactions() {
  const { shopId } = useShop();
  const { defaultPageSize } = useSettings();

  const [selectedDate, setSelectedDate] = useState<SelectedDateResult>({
    startDate: todayStr(),
    endDate: todayStr(),
    timeEnabled: false,
  });

  const [runReport, setRunReport] = useState(false);
  const [storeInfo, setStoreInfo] = useState<any>({});
  const [categoryId, setCategoryId] = useState<string | number | null>(null);
  const [productId, setProductId] = useState<string | number | null>(null);
  const [roomId, setRoomId] = useState("");
  const [rooms, setRooms] = useState<{ id: string; name: string }[]>([]);
  const [transactionType, setTransactionType] = useState("SALE");

  const [rows, setRows] = useState<InventoryTransactionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [pagination, setPagination] = useState(() => emptyPagination(defaultPageSize));

  const [pdfOpen, setPdfOpen] = useState(false);
  const [excelOpen, setExcelOpen] = useState(false);
  const [exportRows, setExportRows] = useState<InventoryTransactionRow[]>([]);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!shopId) return;
    (async () => {
      const res = await fetchSingleShop(shopId);
      setStoreInfo(res?.data || {});
    })();
  }, [shopId]);

  useEffect(() => {
    if (!shopId) return;
    (async () => {
      const res = await fetchStorageLocations(shopId);
      setRooms(res?.data?.data?.locations || []);
    })();
  }, [shopId]);

  const startDate = selectedDate.startDate ?? todayStr();
  const endDate = selectedDate.endDate ?? startDate;
  const dateRangeLabel = `${format(new Date(startDate), "MMM dd, yyyy")} – ${format(new Date(endDate), "MMM dd, yyyy")}`;

  const filters = {
    startDate,
    endDate,
    shopId: shopId || "",
    categoryId: categoryId || "",
    productId: productId || "",
    roomId: roomId || "",
    transactionType: transactionType || "",
  };

  const fetchDetail = useCallback(
    async (page = 1, size = pageSize) => {
      if (!shopId) return;
      setLoading(true);
      try {
        const res = await fetchInventoryTransactions({ ...filters, page, limit: size });
        setRows(res?.data?.data || []);
        const pd = res?.data?.paginationData;
        if (pd) {
          setPagination({ page: pd.currentPage || page, pageSize: size, totalEntries: pd.totalEntries || 0, totalPages: pd.totalPages || 1 });
        }
      } catch (err: any) {
        toast.error(err?.message || "Failed to load inventory transactions");
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [shopId, startDate, endDate, categoryId, productId, roomId, transactionType, pageSize],
  );

  const handleRunReport = async () => {
    await fetchDetail(1);
    setRunReport(true);
  };

  const fetchCategoryPage = useCallback(async (page: number, search: string) => {
    const res = await fetchCategoriesList({ page, limit: 20, search });
    return {
      items: (res?.data ?? []).map((c: any) => ({ id: c.id, name: c.name || c.classification?.name || "Unnamed" })),
      totalPages: res?.paginationData?.totalPages ?? 1,
    };
  }, []);

  const fetchProductPage = useCallback(async (page: number, search: string) => {
    const res = await fetchProductsList({ page, limit: 20, search });
    return {
      items: (res?.data ?? []).map((p: any) => ({ id: p.id, name: p.name })),
      totalPages: res?.paginationData?.totalPages ?? 1,
    };
  }, []);

  const fetchAllForExport = async () => {
    const total = pagination.totalEntries || 0;
    const totalBatches = total > 0 ? Math.ceil(total / EXPORT_BATCH_SIZE) : 1;
    setExporting(true);
    const toastId = toast.loading(`Loading 0 / ${total} records...`);
    try {
      let fetched = 0;
      const all: InventoryTransactionRow[] = [];
      for (let i = 0; i < totalBatches; i += 5) {
        const batchEnd = Math.min(i + 5, totalBatches);
        const pages = Array.from({ length: batchEnd - i }, (_, k) => i + k + 1);
        const results = await Promise.all(
          pages.map((page) => fetchInventoryTransactions({ ...filters, page, limit: EXPORT_BATCH_SIZE })),
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
    exportTransactionsToCsv(all, dateRangeLabel, `inventory_transactions_${todayStr()}.csv`);
  };

  const exportMetadata = { storeName: storeInfo?.name || "Store", dateRange: dateRangeLabel };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="w-52 text-sm">Date Range</div>
          <DateRangeSelector setSelectedDate={setSelectedDate} initialDate={{ startDate: selectedDate.startDate, endDate: selectedDate.endDate }} showAllOption={false} />
        </div>

        <div className="flex items-center gap-3">
          <div className="w-52 text-sm">Classifications</div>
          <ApiSelect placeholder="All Classifications" value={categoryId} onChange={setCategoryId} fetchPage={fetchCategoryPage} />
        </div>

        <div className="flex items-center gap-3">
          <div className="w-52 text-sm">Products</div>
          <ApiSelect placeholder="All Products" value={productId} onChange={setProductId} fetchPage={fetchProductPage} />
        </div>

        <div className="flex items-center gap-3">
          <div className="w-52 text-sm">Rooms</div>
          <Select items={[{ value: "", label: "All Rooms" }, ...rooms.map((r) => ({ value: r.id, label: r.name }))]} value={roomId} onValueChange={setRoomId}>
            <SelectTrigger className="w-62.5">
              <SelectValue placeholder="All Rooms" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Rooms</SelectItem>
              {rooms.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-52 text-sm">Transaction Type</div>
          <Select items={TRANSACTION_TYPES} value={transactionType} onValueChange={setTransactionType}>
            <SelectTrigger className="w-62.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TRANSACTION_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
        <InventoryTransactionsTable
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
        availableSections={TRANSACTIONS_SECTIONS}
        htmlGenerator={buildTransactionsHtml as any}
        columnConfig={TRANSACTIONS_COLUMN_CONFIG}
      />
      <ExcelExportDrawer
        open={excelOpen}
        onClose={() => setExcelOpen(false)}
        data={exportRows}
        metadata={exportMetadata}
        availableSections={TRANSACTIONS_SECTIONS}
        excelGenerator={buildTransactionsExcelSheets as any}
        columnConfig={TRANSACTIONS_COLUMN_CONFIG}
        filename={`Inventory_Transactions_${todayStr()}`}
      />
    </div>
  );
}
