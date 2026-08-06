"use client";

import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";

import { fetchEodSalesSummary } from "@/services/reporting/eodSalesSummary";
import { fetchOrderSalesSummary } from "@/services/reporting/orderSalesSummary";
import { fetchSalesByCustomerGroup } from "@/services/reporting/salesByCustomerGroup";
import { fetchSingleShop } from "@/services/shops/getSingle";

import { Button } from "@/components/ui/button";
import { DateRangeSelector, type SelectedDateResult } from "@/components/ui/date-range-selector";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import PdfExportDrawer from "@/components/ui/pdf-export-drawer";
import ExcelExportDrawer from "@/components/ui/excel-export-drawer";

import { useShop } from "./salesByShared";
import {
  OVERVIEW_SECTIONS,
  OVERVIEW_COLUMN_CONFIG,
  buildOverviewHtml,
  buildOverviewExcelSheets,
  exportOverviewToCsv,
} from "./exportConfig";
import type { SalesOverviewData, OrderSalesSummaryData, CustomerGroupSalesData, CustomerTypeOption } from "./types";

import OverallStatusTable from "./components/OverallStatusTable";
import DetailedStatsSection from "./components/DetailedStatsSection";
import TotalSalesBreakdown from "./components/TotalSalesBreakdown";
import SaleReturnTransactions from "./components/SaleReturnTransactions";
import CombinedShiftReport from "./components/CombinedShiftReport";
import SalesByCategoryTable from "./components/SalesByCategoryTable";
import OrderSalesSummaryTable from "./components/OrderSalesSummaryTable";
import CustomerGroupSalesTable from "./components/CustomerGroupSalesTable";

function todayStr() {
  return format(new Date(), "yyyy-MM-dd");
}

export default function SalesOverview() {
  const { shopId } = useShop();

  const [selectedDate, setSelectedDate] = useState<SelectedDateResult>({
    startDate: todayStr(),
    endDate: todayStr(),
    timeEnabled: false,
  });
  const [customerTypeId, setCustomerTypeId] = useState<string | null>(null);
  const [customerTypes, setCustomerTypes] = useState<CustomerTypeOption[]>([]);

  const [runReport, setRunReport] = useState(false);
  const [loading, setLoading] = useState(false);
  const [overview, setOverview] = useState<SalesOverviewData | null>(null);
  const [orderSalesSummary, setOrderSalesSummary] = useState<OrderSalesSummaryData | null>(null);
  const [storeInfo, setStoreInfo] = useState<any>({});

  const [showDetailedStats, setShowDetailedStats] = useState(false);
  const [customerGroups, setCustomerGroups] = useState<CustomerGroupSalesData[]>([]);
  const [customerGroupsLoading, setCustomerGroupsLoading] = useState(false);
  const [customerGroupsFetched, setCustomerGroupsFetched] = useState(false);
  const currentFiltersRef = useRef<Record<string, any> | null>(null);

  const [pdfOpen, setPdfOpen] = useState(false);
  const [excelOpen, setExcelOpen] = useState(false);

  useEffect(() => {
    // ponytail: no ported customer-type list service exists yet; leaves the
    // filter present but empty rather than blocking the report on it.
    setCustomerTypes([]);
  }, []);

  const startDate = selectedDate.startDate ?? todayStr();
  const endDate = selectedDate.endDate ?? startDate;
  const dateRangeLabel = `${format(new Date(startDate), "MMM dd, yyyy")} – ${format(new Date(endDate), "MMM dd, yyyy")}`;

  const buildFilters = () => {
    const filters: Record<string, any> = { fromDate: startDate, toDate: endDate };
    if (shopId) filters.shopId = shopId;
    if (customerTypeId) filters.customerTypeId = customerTypeId;
    return filters;
  };

  const handleSubmit = async () => {
    setLoading(true);
    setShowDetailedStats(false);
    setCustomerGroups([]);
    setCustomerGroupsFetched(false);
    try {
      if (!storeInfo?.name && shopId) {
        fetchSingleShop(shopId).then((res) => setStoreInfo(res?.data || {}));
      }
      const filters = buildFilters();
      currentFiltersRef.current = filters;
      const [eodRes, orderRes] = await Promise.all([
        fetchEodSalesSummary(filters),
        fetchOrderSalesSummary(filters),
      ]);
      setOverview(eodRes?.data ?? null);
      setOrderSalesSummary(orderRes?.data ?? null);
      setRunReport(true);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load sales overview");
    } finally {
      setLoading(false);
    }
  };

  const handleShowMore = async () => {
    const next = !showDetailedStats;
    setShowDetailedStats(next);
    if (next && !customerGroupsFetched) {
      setCustomerGroupsLoading(true);
      try {
        const filters = currentFiltersRef.current || buildFilters();
        const res = await fetchSalesByCustomerGroup(filters);
        setCustomerGroups(res?.data?.data ?? []);
      } catch {
        setCustomerGroups([]);
      } finally {
        setCustomerGroupsLoading(false);
        setCustomerGroupsFetched(true);
      }
    }
  };

  useEffect(() => {
    if (!shopId) return;
    handleSubmit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopId, startDate, endDate, customerTypeId]);

  const categoryData = overview?.categoryWiseBreakdown ?? [];
  const exportMetadata = { storeName: storeInfo?.name || "Store", dateRange: dateRangeLabel };

  const handleExportCsv = () => {
    if (!overview) return;
    exportOverviewToCsv(overview, dateRangeLabel, `sales_overview_${todayStr()}.csv`);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="w-52 text-sm">Date Range</div>
          <DateRangeSelector
            setSelectedDate={setSelectedDate}
            initialDate={{ startDate: selectedDate.startDate, endDate: selectedDate.endDate }}
            showTimeSwitch
            showAllOption={false}
            className="w-62.5"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="w-52 text-sm">Customer Type</div>
          <Select
            items={[{ value: "__all__", label: "All Customer Types" }, ...customerTypes.map((ct) => ({ value: ct.id, label: ct.name }))]}
            value={customerTypeId ?? "__all__"}
            onValueChange={(v) => setCustomerTypeId(v === "__all__" ? null : v)}
          >
            <SelectTrigger className="w-62.5">
              <SelectValue placeholder="All Customer Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All Customer Types</SelectItem>
              {customerTypes.map((ct) => (
                <SelectItem key={ct.id} value={ct.id}>
                  {ct.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-52 shrink-0" aria-hidden="true" />
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="outline" disabled={!runReport}>Export</Button>} />
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setPdfOpen(true)}>Export to PDF</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setExcelOpen(true)}>Export to Excel</DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportCsv}>Export to CSV</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={handleSubmit} disabled={loading}>
            Run Report
          </Button>
        </div>
      </div>

      {runReport && overview && (
        <div className="flex flex-col gap-4">
          <OverallStatusTable salesOverviewData={overview} />

          <div className="text-center">
            <Button variant="link" onClick={handleShowMore}>
              {showDetailedStats ? "Show Less" : "Show More"} Detailed Report
            </Button>
          </div>

          {showDetailedStats && (
            <>
              <DetailedStatsSection salesOverviewData={overview} />
              <CustomerGroupSalesTable groups={customerGroups} loading={customerGroupsLoading} />
            </>
          )}

          <TotalSalesBreakdown data={overview.saleTransactions} />
          <SaleReturnTransactions data={overview.saleReturnTransactions} />
          <CombinedShiftReport data={overview.combinedShiftReport} />
          <OrderSalesSummaryTable data={orderSalesSummary} />
          <SalesByCategoryTable categoryData={categoryData} />
        </div>
      )}

      {overview && (
        <>
          <PdfExportDrawer
            open={pdfOpen}
            onClose={() => setPdfOpen(false)}
            data={overview}
            metadata={exportMetadata}
            availableSections={OVERVIEW_SECTIONS}
            htmlGenerator={buildOverviewHtml as any}
            columnConfig={OVERVIEW_COLUMN_CONFIG}
          />
          <ExcelExportDrawer
            open={excelOpen}
            onClose={() => setExcelOpen(false)}
            data={overview}
            metadata={exportMetadata}
            availableSections={OVERVIEW_SECTIONS}
            excelGenerator={buildOverviewExcelSheets as any}
            columnConfig={OVERVIEW_COLUMN_CONFIG}
            filename={`Sales_Overview_${todayStr()}`}
          />
        </>
      )}
    </div>
  );
}
