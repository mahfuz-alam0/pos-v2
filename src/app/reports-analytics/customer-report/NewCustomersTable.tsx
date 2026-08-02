"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";

import { useShop } from "@/context/shop-context";
import { fetchNewCustomers } from "@/services/reporting/newCustomers";
import { listCustomerGroups } from "@/services/customers/listCustomerGroups";
import { listCustomerTypes } from "@/services/customers/listCustomerTypes";
import { fetchSingleShop } from "@/services/shops/getSingle";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  NEW_CUSTOMERS_SECTIONS,
  NEW_CUSTOMERS_EXCEL_COLUMN_CONFIG,
  getNewCustomersSummary,
  buildNewCustomersHtml,
  buildNewCustomersExcelSheets,
  exportNewCustomersToCsv,
} from "./exportConfig.newCustomers";

const PAGE_SIZE = 20;

function todayStr() {
  return format(new Date(), "yyyy-MM-dd");
}

export default function NewCustomersTable() {
  const { shopId } = useShop();

  const [selectedDate, setSelectedDate] = useState<SelectedDateResult>({
    startDate: todayStr(),
    endDate: todayStr(),
    timeEnabled: false,
  });

  const [runReport, setRunReport] = useState(false);
  const [storeInfo, setStoreInfo] = useState<any>({});
  const [customerGroups, setCustomerGroups] = useState<{ id: string; name: string }[]>([]);
  const [customerTypes, setCustomerTypes] = useState<{ id: string; name: string }[]>([]);
  const [selectedGroup, setSelectedGroup] = useState("");
  const [selectedType, setSelectedType] = useState("");

  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, totalEntries: 0 });

  const [pdfOpen, setPdfOpen] = useState(false);
  const [excelOpen, setExcelOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const [groupsRes, typesRes] = await Promise.all([listCustomerGroups(), listCustomerTypes()]);
      setCustomerGroups(groupsRes?.data?.data?.customerGroups || []);
      setCustomerTypes(typesRes?.data?.data?.customerTypes || []);
    })();
  }, []);

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
        const res = await fetchNewCustomers({
          page,
          limit: PAGE_SIZE,
          startDate: selectedDate.startDate || "",
          endDate: selectedDate.endDate || "",
          shopId: shopId || "",
          ...(selectedGroup ? { customerGroupId: selectedGroup } : {}),
          ...(selectedType ? { customerTypeId: selectedType } : {}),
        });
        setRows(res?.data ?? []);
        const pd = res?.paginationData;
        if (pd) {
          setPagination({ page: pd.currentPage || page, totalPages: pd.totalPages || 1, totalEntries: pd.totalEntries || 0 });
        }
      } catch (err: any) {
        toast.error(err?.message || "Failed to load new customers");
      } finally {
        setLoading(false);
      }
    },
    [shopId, selectedDate, selectedGroup, selectedType],
  );

  const handleRunReport = async () => {
    await fetchData(1);
    setRunReport(true);
  };

  const handleExportCsv = () => {
    if (!rows.length) {
      toast.warning("No data to export");
      return;
    }
    exportNewCustomersToCsv(rows, `new_customers_${todayStr()}.csv`);
    toast.success("CSV downloaded");
  };

  const summary = getNewCustomersSummary(rows, selectedDate);
  const totalCustomers = pagination.totalEntries || rows.length;

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
          <DateRangeSelector setSelectedDate={setSelectedDate} initialDate={selectedDate} showAllOption={false} />
        </div>

        <div className="flex items-center gap-3">
          <div className="w-52 text-sm">Customer Group</div>
          <Select
            items={[{ value: "", label: "All" }, ...customerGroups.map((o) => ({ value: o.id, label: o.name }))]}
            value={selectedGroup}
            onValueChange={setSelectedGroup}
          >
            <SelectTrigger className="w-62.5">
              <SelectValue placeholder="Select Customer Group" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All</SelectItem>
              {customerGroups.map((o) => (
                <SelectItem key={o.id} value={o.id}>
                  {o.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-52 text-sm">Customer Type</div>
          <Select
            items={[{ value: "", label: "All" }, ...customerTypes.map((o) => ({ value: o.id, label: o.name }))]}
            value={selectedType}
            onValueChange={setSelectedType}
          >
            <SelectTrigger className="w-62.5">
              <SelectValue placeholder="Select Customer Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All</SelectItem>
              {customerTypes.map((o) => (
                <SelectItem key={o.id} value={o.id}>
                  {o.name}
                </SelectItem>
              ))}
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
                    <TableHead className="w-50">Customer Name</TableHead>
                    <TableHead className="w-50">Email</TableHead>
                    <TableHead className="w-37.5">Phone</TableHead>
                    <TableHead className="w-37.5">Customer Type</TableHead>
                    <TableHead className="w-62.5">Customer Groups</TableHead>
                    <TableHead className="w-32">Date of Birth</TableHead>
                    <TableHead className="w-37.5">Medical ID</TableHead>
                    <TableHead className="w-45">Created Date &amp; Time</TableHead>
                    <TableHead className="w-45">Created By</TableHead>
                  </TableRow>
                  <TableRow className="border-b-0 bg-muted/40 font-semibold">
                    <TableHead colSpan={9} className="text-center">
                      TOTALS → ({summary["Total New Customers"]} new customers)
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading && rows.length === 0 &&
                    Array.from({ length: 6 }).map((_, i) => (
                      <TableRow key={`s-${i}`} className="border-b-0">
                        {Array.from({ length: 9 }).map((__, j) => (
                          <TableCell key={j}>
                            <div className="h-4 w-full animate-pulse rounded bg-muted" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  {!loading && rows.length === 0 && (
                    <TableRow className="border-b-0">
                      <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">
                        No new customers found.
                      </TableCell>
                    </TableRow>
                  )}
                  {rows.map((row, i) => (
                    <TableRow key={row._id ?? i} className={`border-b-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] ${i % 2 === 1 ? "bg-stone-100 dark:bg-stone-800" : ""}`}>
                      <TableCell>{row.customerName || "N/A"}</TableCell>
                      <TableCell>{row.email || "N/A"}</TableCell>
                      <TableCell>{row.phone || "N/A"}</TableCell>
                      <TableCell>{row.customerTypeName || "N/A"}</TableCell>
                      <TableCell>
                        {row.customerGroupNames?.length ? (
                          <div className="flex flex-wrap gap-1">
                            {row.customerGroupNames.map((g: string, idx: number) => (
                              <Badge key={idx}>{g}</Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>{row.dob ? format(new Date(row.dob), "yyyy-MM-dd") : "N/A"}</TableCell>
                      <TableCell>{row.medicalId || "N/A"}</TableCell>
                      <TableCell>{row.createdAt ? format(new Date(row.createdAt), "yyyy-MM-dd HH:mm:ss") : "N/A"}</TableCell>
                      <TableCell>{row.createdEmployee || "N/A"}</TableCell>
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
        availableSections={NEW_CUSTOMERS_SECTIONS}
        htmlGenerator={buildNewCustomersHtml as any}
        columnConfig={NEW_CUSTOMERS_EXCEL_COLUMN_CONFIG}
      />
      <ExcelExportDrawer
        open={excelOpen}
        onClose={() => setExcelOpen(false)}
        data={rows}
        metadata={exportMetadata}
        availableSections={NEW_CUSTOMERS_SECTIONS}
        excelGenerator={buildNewCustomersExcelSheets as any}
        columnConfig={NEW_CUSTOMERS_EXCEL_COLUMN_CONFIG}
        filename={`New_Customers_${todayStr()}`}
      />
    </div>
  );
}
