"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";

import { fetchCustomerActivity } from "@/services/reporting/customerActivity";
import { listCustomerGroups } from "@/services/customers/listCustomerGroups";
import { listCustomerTypes } from "@/services/customers/listCustomerTypes";
import { fetchSingleShop } from "@/services/shops/getSingle";
import { useShop } from "@/context/shop-context";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import PdfExportDrawer from "@/components/ui/pdf-export-drawer";
import ExcelExportDrawer from "@/components/ui/excel-export-drawer";

import {
  ACTIVITY_SECTIONS,
  ACTIVITY_EXCEL_COLUMN_CONFIG,
  getActivitySummary,
  buildActivityHtml,
  buildActivityExcelSheets,
  exportActivityToCsv,
} from "./exportConfig.activity";

const PAGE_SIZE = 20;

export default function CustomerActivityListTable() {
  const { shopId } = useShop();

  const [runReport, setRunReport] = useState(false);
  const [daySince, setDaySince] = useState("0");
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
        const res = await fetchCustomerActivity({
          page,
          limit: PAGE_SIZE,
          daysSinceLastVisitIsGreaterThan: daySince,
          consumerType: selectedGroup,
          customerType: selectedType,
        });
        setRows(res?.data ?? []);
        const pd = res?.paginationData;
        if (pd) {
          setPagination({
            page: pd.currentPage || page,
            totalPages: pd.totalPages || 1,
            totalEntries: pd.totalEntries || 0,
          });
        }
      } catch (err: any) {
        toast.error(err?.message || "Failed to load customer activity");
      } finally {
        setLoading(false);
      }
    },
    [daySince, selectedGroup, selectedType],
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
    exportActivityToCsv(rows, `customer_activity_list_${format(new Date(), "yyyy-MM-dd")}.csv`);
    toast.success("CSV downloaded");
  };

  const summary = getActivitySummary(rows);
  const exportMetadata = {
    storeName: storeInfo?.name || storeInfo?.shopName || "Store",
    date: format(new Date(), "yyyy-MM-dd"),
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
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
          <div className="w-52 text-sm">Days Since Last Visit Is Greater Than</div>
          <Input
            type="number"
            placeholder="0"
            value={daySince}
            onChange={(e) => setDaySince(e.target.value)}
            className="w-62.5"
          />
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
                    <TableHead className="w-62.5">Email</TableHead>
                    <TableHead className="w-37.5">Phone</TableHead>
                    <TableHead className="w-37.5">Customer Type</TableHead>
                    <TableHead className="w-50">Customer Groups</TableHead>
                    <TableHead className="w-45 text-right">Days Since Last Visit</TableHead>
                    <TableHead className="w-32 text-right">Times Visited</TableHead>
                    <TableHead className="w-37.5 text-right">Average Spent</TableHead>
                    <TableHead className="w-42.5">Last Visit</TableHead>
                    <TableHead className="w-32">Date of Birth</TableHead>
                  </TableRow>
                  <TableRow className="border-b-0 bg-muted/40 font-semibold">
                    <TableHead colSpan={5} className="text-center">
                      TOTALS → ({summary["Total Customers"]} customers)
                    </TableHead>
                    <TableHead className="text-right">Avg: {summary["Average Days Since Last Visit"]}</TableHead>
                    <TableHead className="text-right">{summary["Total Days Visited"]}</TableHead>
                    <TableHead className="text-right">{summary["Average Amount Spent"]}</TableHead>
                    <TableHead className="text-center">-</TableHead>
                    <TableHead className="text-center">-</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading && rows.length === 0 &&
                    Array.from({ length: 6 }).map((_, i) => (
                      <TableRow key={`s-${i}`} className="border-b-0">
                        {Array.from({ length: 10 }).map((__, j) => (
                          <TableCell key={j}>
                            <div className="h-4 w-full animate-pulse rounded bg-muted" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}

                  {!loading && rows.length === 0 && (
                    <TableRow className="border-b-0">
                      <TableCell colSpan={10} className="py-10 text-center text-muted-foreground">
                        No customer activity found.
                      </TableCell>
                    </TableRow>
                  )}

                  {rows.map((row, i) => (
                    <TableRow key={row._id ?? i} className={`border-b-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] ${i % 2 === 1 ? "bg-stone-100 dark:bg-stone-800" : ""}`}>
                      <TableCell>{`${row.firstName || ""} ${row.lastName || ""}`.trim() || "N/A"}</TableCell>
                      <TableCell>{row.email || "N/A"}</TableCell>
                      <TableCell>{row.phone || "N/A"}</TableCell>
                      <TableCell>{row.customerType || "N/A"}</TableCell>
                      <TableCell>
                        {row.consumerTypes?.length ? (
                          <div className="flex flex-wrap gap-1">
                            {row.consumerTypes.map((type: string, idx: number) => {
                              const display = type.replace(/\s*\(MJ - System Generated\)/, "");
                              return (
                                <Badge key={idx} variant={display.toLowerCase().includes("medical") ? "secondary" : "default"}>
                                  {display}
                                </Badge>
                              );
                            })}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {row.daysSinceLastVisit != null ? `${row.daysSinceLastVisit} days` : "Never"}
                      </TableCell>
                      <TableCell className="text-right">{row.daysVisited ?? 0}</TableCell>
                      <TableCell className="text-right">${(row.averageSpent || 0).toFixed(2)}</TableCell>
                      <TableCell>{row.lastVisitedAt ? format(new Date(row.lastVisitedAt), "yyyy-MM-dd HH:mm") : "Never"}</TableCell>
                      <TableCell>{row.dateOfBirth ? format(new Date(row.dateOfBirth), "yyyy-MM-dd") : "N/A"}</TableCell>
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
        availableSections={ACTIVITY_SECTIONS}
        htmlGenerator={buildActivityHtml as any}
        columnConfig={ACTIVITY_EXCEL_COLUMN_CONFIG}
      />
      <ExcelExportDrawer
        open={excelOpen}
        onClose={() => setExcelOpen(false)}
        data={rows}
        metadata={exportMetadata}
        availableSections={ACTIVITY_SECTIONS}
        excelGenerator={buildActivityExcelSheets as any}
        columnConfig={ACTIVITY_EXCEL_COLUMN_CONFIG}
        filename={`Customer_Activity_List_${format(new Date(), "yyyy-MM-dd")}`}
      />
    </div>
  );
}
