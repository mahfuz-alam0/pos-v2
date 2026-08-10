"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Receipt, ShieldCheck } from "lucide-react";

import { useShop } from "@/context/shop-context";
import { useSettings } from "@/context/settings-context";
import { fetchProductTaxDetail } from "@/services/reporting/productTaxDetail";
import { fetchProductTaxDetailExemption } from "@/services/reporting/productTaxDetailExemption";
import { listCategories } from "@/services/classifications/listCategories";
import { fetchProductsList } from "@/services/products/list";
import { fetchBrandsList } from "@/services/brands/list";
import { listCustomerTypes } from "@/services/customers/listCustomerTypes";
import { listCustomers } from "@/services/customers/listCustomers";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DateRangeSelector, type SelectedDateResult } from "@/components/ui/date-range-selector";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ApiSelect } from "@/components/ui/api-select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import PdfExportDrawer from "@/components/ui/pdf-export-drawer";
import ExcelExportDrawer from "@/components/ui/excel-export-drawer";

import TaxDetailsTable from "./TaxDetailsTable";
import TaxBreakdownSummary from "./TaxBreakdownSummary";
import TaxExemptionsTable from "./TaxExemptionsTable";
import {
  TAX_DETAILS_SECTIONS,
  TAX_DETAILS_COLUMN_CONFIG,
  buildTaxDetailsHtml,
  buildTaxDetailsExcelSheets,
  exportTaxDetailsToCsv,
  TAX_EXEMPTIONS_SECTIONS,
  TAX_EXEMPTIONS_COLUMN_CONFIG,
  buildTaxExemptionsHtml,
  buildTaxExemptionsExcelSheets,
  exportTaxExemptionsToCsv,
} from "./exportConfig";
import type { ReportPagination, TaxDetailRow, TaxDetailSummary, TaxExemptionRow } from "./types";

const PAGE_SIZE = 10;
const REPORTS = [
  { key: "details", title: "Tax Details", icon: Receipt, description: "View products sold and tax details based on a date range and when the products were originally received." },
  { key: "exemptions", title: "Tax Exemptions", icon: ShieldCheck, description: "View tax exemptions down to the product level, including tax type, location, and employee who performed the exemption." },
] as const;

function emptyPagination(size = PAGE_SIZE): ReportPagination {
  return { page: 1, pageSize: size, totalEntries: 0, totalPages: 1 };
}

function TaxDetailsReport() {
  const { shopId } = useShop();
  const { defaultPageSize } = useSettings();

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const [selectedDate, setSelectedDate] = useState<SelectedDateResult>({ startDate: todayStr, endDate: todayStr, timeEnabled: false });
  const startDate = selectedDate.startDate ?? todayStr;
  const endDate = selectedDate.endDate ?? startDate;

  const [categoryId, setCategoryId] = useState<string | number | null>(null);
  const [productId, setProductId] = useState<string | number | null>(null);
  const [brandId, setBrandId] = useState<string | number | null>(null);

  const [data, setData] = useState<TaxDetailRow[]>([]);
  const [summary, setSummary] = useState<TaxDetailSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [pagination, setPagination] = useState(() => emptyPagination(defaultPageSize));
  const [ranReport, setRanReport] = useState(false);

  const [pdfOpen, setPdfOpen] = useState(false);
  const [excelOpen, setExcelOpen] = useState(false);

  const dateRangeLabel = `${format(new Date(startDate), "MMM dd, yyyy")} - ${format(new Date(endDate), "MMM dd, yyyy")}`;
  const exportData = { data, summary };

  const fetchData = async (page: number, size: number = pageSize) => {
    if (!shopId) return;
    setLoading(true);
    try {
      const response = await fetchProductTaxDetail({
        page,
        limit: size,
        startDate,
        endDate,
        shopId,
        ...(categoryId ? { categoryId } : {}),
        ...(productId ? { productId } : {}),
        ...(brandId ? { brandId } : {}),
      });
      setData(response?.data?.data || []);
      setSummary(response?.data?.summary || null);
      const pData = response?.data?.paginationData;
      setPagination((prev) => ({ ...prev, page, pageSize: size, totalEntries: pData?.totalEntries || 0, totalPages: pData?.totalPages || 1 }));
    } catch (error) {
      console.error("Error fetching tax details:", error);
    } finally {
      setLoading(false);
      setRanReport(true);
    }
  };

  const handleRunReport = () => fetchData(1);
  const handlePageChange = (page: number) => fetchData(page);

  useEffect(() => {
    if (!shopId) return;
    fetchData(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopId, startDate, endDate, categoryId, productId, brandId]);

  const handleExportCsv = () => {
    exportTaxDetailsToCsv(exportData, dateRangeLabel, `tax_details_report_${format(new Date(), "yyyy-MM-dd")}.csv`);
  };

  return (
    <div className="flex flex-col gap-4">
      <Card className="p-4 shadow-sm ring-0">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-4">
            <div className="w-40 shrink-0 text-sm text-muted-foreground">Date Range</div>
            <DateRangeSelector setSelectedDate={setSelectedDate} initialDate={{ startDate: selectedDate.startDate, endDate: selectedDate.endDate }} showAllOption={false} className="w-full sm:w-64" />
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <div className="w-40 shrink-0 text-sm text-muted-foreground">Category</div>
            <CategorySelect value={categoryId} onChange={setCategoryId} />
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <div className="w-40 shrink-0 text-sm text-muted-foreground">Product</div>
            <ProductFilterSelect value={productId} onChange={setProductId} />
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <div className="w-40 shrink-0 text-sm text-muted-foreground">Brand</div>
            <BrandFilterSelect value={brandId} onChange={setBrandId} />
          </div>
          <div className="flex items-center gap-3 pt-1">
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="outline" disabled={!ranReport}>Export</Button>} />
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
      </Card>

      {ranReport && <TaxBreakdownSummary data={data} summary={summary} />}
      {ranReport && (
        <TaxDetailsTable
          data={data}
          loading={loading}
          pagination={pagination}
          onPageChange={handlePageChange}
          onPageSizeChange={(s) => {
            setPageSize(s);
            fetchData(1, s);
          }}
        />
      )}

      <PdfExportDrawer
        open={pdfOpen}
        onClose={() => setPdfOpen(false)}
        data={exportData}
        metadata={{ dateRange: dateRangeLabel }}
        availableSections={TAX_DETAILS_SECTIONS}
        htmlGenerator={buildTaxDetailsHtml as any}
        columnConfig={TAX_DETAILS_COLUMN_CONFIG}
      />
      <ExcelExportDrawer
        open={excelOpen}
        onClose={() => setExcelOpen(false)}
        data={exportData}
        metadata={{ dateRange: dateRangeLabel }}
        availableSections={TAX_DETAILS_SECTIONS}
        excelGenerator={buildTaxDetailsExcelSheets as any}
        columnConfig={TAX_DETAILS_COLUMN_CONFIG}
        filename={`tax_details_report_${format(new Date(), "yyyy-MM-dd")}`}
      />
    </div>
  );
}

function CategorySelect({ value, onChange }: { value: string | number | null; onChange: (v: string | number | null) => void }) {
  const [options, setOptions] = useState<{ id: string; name: string }[]>([]);
  useEffect(() => {
    listCategories({ page: 1, limit: 100 }).then((res) => setOptions(res?.data ?? []));
  }, []);
  const items = [{ value: "__all__", label: "All Categories" }, ...options.map((c) => ({ value: c.id, label: c.name }))];
  return (
    <Select items={items} value={value == null ? "__all__" : String(value)} onValueChange={(v) => onChange(v === "__all__" ? null : v)}>
      <SelectTrigger className="w-full sm:w-64">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {items.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function ProductFilterSelect({ value, onChange }: { value: string | number | null; onChange: (v: string | number | null) => void }) {
  return (
    <ApiSelect
      placeholder="All Products"
      value={value}
      onChange={(v) => onChange(v)}
      triggerClassName="w-full sm:w-64"
      fetchPage={async (page, search) => {
        const res = await fetchProductsList({ page, limit: 20, search });
        return { items: (res?.data ?? []).map((p: any) => ({ id: p.id, name: p.name })), totalPages: res?.paginationData?.totalPages ?? 1 };
      }}
    />
  );
}

function BrandFilterSelect({ value, onChange }: { value: string | number | null; onChange: (v: string | number | null) => void }) {
  return (
    <ApiSelect
      placeholder="All Brands"
      value={value}
      onChange={(v) => onChange(v)}
      triggerClassName="w-full sm:w-64"
      fetchPage={async (page, search) => {
        const res = await fetchBrandsList({ page, limit: 20, search });
        return { items: (res?.data ?? []).map((b: any) => ({ id: b.id, name: b.name })), totalPages: res?.paginationData?.totalPages ?? 1 };
      }}
    />
  );
}

function TaxExemptionsReport() {
  const { defaultPageSize } = useSettings();
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const [selectedDate, setSelectedDate] = useState<SelectedDateResult>({ startDate: todayStr, endDate: todayStr, timeEnabled: false });
  const startDate = selectedDate.startDate ?? todayStr;
  const endDate = selectedDate.endDate ?? startDate;

  const [customerTypeId, setCustomerTypeId] = useState<string | null>(null);
  const [customerTypes, setCustomerTypes] = useState<{ id: string; name: string }[]>([]);
  const [customerId, setCustomerId] = useState<string | number | null>(null);

  const [data, setData] = useState<TaxExemptionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [pagination, setPagination] = useState(() => emptyPagination(defaultPageSize));
  const [ranReport, setRanReport] = useState(false);

  const [pdfOpen, setPdfOpen] = useState(false);
  const [excelOpen, setExcelOpen] = useState(false);

  const dateRangeLabel = `${format(new Date(startDate), "MMM dd, yyyy")} - ${format(new Date(endDate), "MMM dd, yyyy")}`;

  useEffect(() => {
    listCustomerTypes().then((res) => setCustomerTypes(res?.data?.customerTypes || []));
  }, []);

  const fetchData = async (page: number, size: number = pageSize) => {
    setLoading(true);
    try {
      const response = await fetchProductTaxDetailExemption({
        page,
        limit: size,
        startDate,
        endDate,
        ...(customerTypeId ? { customerTypeId } : {}),
        ...(customerId ? { customerId } : {}),
      });
      setData(response?.data?.data || []);
      const pData = response?.data?.paginationData;
      setPagination((prev) => ({ ...prev, page, pageSize: size, totalEntries: pData?.totalEntries || 0, totalPages: pData?.totalPages || 1 }));
    } catch (error) {
      console.error("Error fetching tax exemptions:", error);
    } finally {
      setLoading(false);
      setRanReport(true);
    }
  };

  const handleRunReport = () => fetchData(1);
  const handlePageChange = (page: number) => fetchData(page);

  useEffect(() => {
    fetchData(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate, customerTypeId, customerId]);

  const handleExportCsv = () => {
    exportTaxExemptionsToCsv(data, dateRangeLabel, `tax_exemptions_report_${format(new Date(), "yyyy-MM-dd")}.csv`);
  };

  const customerTypeItems = [{ value: "__all__", label: "All Customer Types" }, ...customerTypes.map((ct) => ({ value: ct.id, label: ct.name }))];

  return (
    <div className="flex flex-col gap-4">
      <Card className="p-4 shadow-sm ring-0">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-4">
            <div className="w-40 shrink-0 text-sm text-muted-foreground">Date Range</div>
            <DateRangeSelector setSelectedDate={setSelectedDate} initialDate={{ startDate: selectedDate.startDate, endDate: selectedDate.endDate }} showAllOption={false} className="w-full sm:w-64" />
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <div className="w-40 shrink-0 text-sm text-muted-foreground">Customer Type</div>
            <Select items={customerTypeItems} value={customerTypeId ?? "__all__"} onValueChange={(v) => setCustomerTypeId(v === "__all__" ? null : v)}>
              <SelectTrigger className="w-full sm:w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {customerTypeItems.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <div className="w-40 shrink-0 text-sm text-muted-foreground">Customer</div>
            <ApiSelect
              placeholder="All Customers"
              value={customerId}
              onChange={(v) => setCustomerId(v)}
              triggerClassName="w-full sm:w-64"
              fetchPage={async (page, search) => {
                const res = await listCustomers({ page, ...(search ? { searchFieldName: "firstName", searchFiledValue: search } : {}) });
                const customers = res?.data?.data?.customers || [];
                return {
                  items: customers.map((c: any) => ({ id: c.id, name: `${c.firstName || ""} ${c.lastName || ""}`.trim() || c.email })),
                  totalPages: res?.data?.data?.paginationData?.totalPages ?? 1,
                };
              }}
            />
          </div>
          <div className="flex items-center gap-3 pt-1">
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="outline" disabled={!ranReport}>Export</Button>} />
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
      </Card>

      {ranReport && (
        <TaxExemptionsTable
          data={data}
          loading={loading}
          pagination={pagination}
          onPageChange={handlePageChange}
          onPageSizeChange={(s) => {
            setPageSize(s);
            fetchData(1, s);
          }}
        />
      )}

      <PdfExportDrawer
        open={pdfOpen}
        onClose={() => setPdfOpen(false)}
        data={data}
        metadata={{ dateRange: dateRangeLabel }}
        availableSections={TAX_EXEMPTIONS_SECTIONS}
        htmlGenerator={buildTaxExemptionsHtml as any}
        columnConfig={TAX_EXEMPTIONS_COLUMN_CONFIG}
      />
      <ExcelExportDrawer
        open={excelOpen}
        onClose={() => setExcelOpen(false)}
        data={data}
        metadata={{ dateRange: dateRangeLabel }}
        availableSections={TAX_EXEMPTIONS_SECTIONS}
        excelGenerator={buildTaxExemptionsExcelSheets as any}
        columnConfig={TAX_EXEMPTIONS_COLUMN_CONFIG}
        filename={`tax_exemptions_report_${format(new Date(), "yyyy-MM-dd")}`}
      />
    </div>
  );
}

export default function Taxes() {
  const [selectedReport, setSelectedReport] = useState<(typeof REPORTS)[number]["key"]>(REPORTS[0].key);
  const active = REPORTS.find((r) => r.key === selectedReport) ?? REPORTS[0];
  const Icon = active.icon;

  const reportItems = REPORTS.map((r) => ({ value: r.key, label: r.title }));

  return (
    <div className="flex flex-col gap-4 p-6">
      <Card className="p-4 shadow-sm ring-0">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex shrink-0 items-center justify-center rounded-xl bg-rose-50 p-3 dark:bg-rose-950/40">
              <Icon className="size-5 text-rose-500" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">{active.title}</h1>
              <p className="text-sm text-muted-foreground">{active.description}</p>
            </div>
          </div>
          <Select items={reportItems} value={selectedReport} onValueChange={(v) => setSelectedReport(v as (typeof REPORTS)[number]["key"])}>
            <SelectTrigger className="w-full md:w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {reportItems.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {selectedReport === "details" && <TaxDetailsReport />}
      {selectedReport === "exemptions" && <TaxExemptionsReport />}
    </div>
  );
}
