"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import {
  Area,
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  DollarSign,
  FileText,
  Percent,
  ShoppingCart,
  TrendingUp,
  User,
} from "lucide-react";

import { useShop } from "@/context/shop-context";
import { fetchSalesExecutiveReport } from "@/services/reporting/salesExecutiveReport";
import { fetchSalesStatusAndAOVOverTime } from "@/services/reporting/salesStatusAndAOVOverTime";
import { fetchMedicalVsNonMedicalSales } from "@/services/reporting/medicalVsNonMedicalSales";
import { fetchSaleByOrderSource } from "@/services/reporting/saleByOrderSource";
import { fetchEodSalesSummary } from "@/services/reporting/eodSalesSummary";
import { fetchSalesHoursStats } from "@/services/analytics/salesHoursStats";

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import PdfExportDrawer from "@/components/ui/pdf-export-drawer";

import BusyTimesChart from "./BusyTimesChart";
import TaxSummaryTable from "./TaxSummaryTable";
import TaxBreakdownCard from "./TaxBreakdownCard";
import {
  EXPORT_SECTIONS,
  PDF_COLUMN_CONFIG,
  buildExecutiveSummaryHtml,
  exportExecutiveSummaryToCsv,
  exportExecutiveSummaryToExcel,
} from "./exportConfig";
import {
  EMPTY_SUMMARY,
  type ExecutiveSummary as SummaryData,
  type MedicalVsRecreationalSlice,
  type OverallTaxStats,
  type SalesByCategoryRow,
  type SalesByOrderSourceRow,
  type SalesByStoreRow,
  type SalesHourStat,
  type SalesStatusAOVPoint,
  type TaxProfileStat,
} from "./types";

function toDayString(d: Date) {
  return format(d, "yyyy-MM-dd");
}

function SummaryCard({
  icon,
  color,
  title,
  value,
}: {
  icon: React.ReactNode;
  color: string;
  title: string;
  value: string;
}) {
  return (
    <Card size="sm" className="flex-1 basis-37.5">
      <div className="flex items-center gap-3">
        <div
          className="flex size-9 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${color}15`, color }}
        >
          {icon}
        </div>
        <div className="overflow-hidden">
          <p className="truncate text-xs text-muted-foreground">{title}</p>
          <p className="truncate text-base font-semibold">{value}</p>
        </div>
      </div>
    </Card>
  );
}

export default function ExecutiveSummary() {
  const { shopId, shopDetails } = useShop();

  const [range, setRange] = useState<DateRange | undefined>({
    from: new Date(new Date().setHours(0, 0, 0, 0)),
    to: new Date(new Date().setHours(23, 59, 59, 999)),
  });

  const [summary, setSummary] = useState<SummaryData>(EMPTY_SUMMARY);
  const [salesByCategory, setSalesByCategory] = useState<SalesByCategoryRow[]>([]);
  const [salesByStore, setSalesByStore] = useState<SalesByStoreRow[]>([]);
  const [salesByOrderSource, setSalesByOrderSource] = useState<SalesByOrderSourceRow[]>([]);
  const [salesHourStats, setSalesHourStats] = useState<SalesHourStat[]>([]);
  const [salesStatusAOVOverTime, setSalesStatusAOVOverTime] = useState<SalesStatusAOVPoint[]>([]);
  const [medicalVsRecreational, setMedicalVsRecreational] = useState<MedicalVsRecreationalSlice[]>([]);
  const [statsByTaxProfile, setStatsByTaxProfile] = useState<TaxProfileStat[]>([]);
  const [overallStats, setOverallStats] = useState<OverallTaxStats>({});
  const [eodSalesSummary, setEodSalesSummary] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [pdfOpen, setPdfOpen] = useState(false);

  const startDate = range?.from ? toDayString(range.from) : undefined;
  const endDate = range?.to ? toDayString(range.to) : startDate;

  useEffect(() => {
    if (!shopId || !startDate || !endDate) return;

    let cancelled = false;
    setLoading(true);

    const commonParams = { shopId, fromDate: startDate, toDate: endDate };

    Promise.allSettled([
      fetchSalesExecutiveReport({ shopId, fromDate: startDate, toDate: endDate, page: 1, limit: 50 }),
      fetchSalesHoursStats({ shopId, fromDateString: startDate, toDateString: endDate }),
      fetchSalesStatusAndAOVOverTime(commonParams),
      fetchMedicalVsNonMedicalSales(commonParams),
      fetchSaleByOrderSource({ shopId, startDate, endDate, page: 1, limit: 20 }),
      fetchEodSalesSummary({ shopId, fromDate: startDate, toDate: endDate }),
    ]).then(([execRes, hoursRes, aovRes, medRes, sourceRes, eodRes]) => {
      if (cancelled) return;

      if (execRes.status === "fulfilled" && execRes.value?.data) {
        const d = execRes.value.data;
        if (d.summary) setSummary(d.summary);
        setSalesByStore(d.salesByStore?.data || []);
        setSalesByCategory(d.salesByCategory?.data || []);
      } else if (execRes.status === "rejected") {
        toast.error(execRes.reason?.message || "Failed to load executive report");
      }

      if (hoursRes.status === "fulfilled") {
        setSalesHourStats(hoursRes.value?.data?.weekDaysData || []);
      }

      if (aovRes.status === "fulfilled" && aovRes.value?.data?.data) {
        setSalesStatusAOVOverTime(
          aovRes.value.data.data.map((item: any) => ({
            date: item.date,
            new: item.newAmount || 0,
            returning: item.returningAmount || 0,
            reactivated: item.reactivatedAmount || 0,
            aov: item.aov || 0,
          })),
        );
      }

      if (medRes.status === "fulfilled" && medRes.value?.data) {
        const d = medRes.value.data;
        setMedicalVsRecreational([
          { name: "Medical", value: d.medicalSalesCount || 0, color: "#1890ff" },
          { name: "Non-Medical", value: d.nonMedicalSalesCount || 0, color: "#52c41a" },
        ]);
      }

      if (sourceRes.status === "fulfilled" && sourceRes.value?.data) {
        const d = sourceRes.value.data;
        setSalesByOrderSource(Array.isArray(d) ? d : [d]);
      }

      if (eodRes.status === "fulfilled") {
        setEodSalesSummary(eodRes.value?.data ?? null);
      }

      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [shopId, startDate, endDate]);

  useEffect(() => {
    const taxStats = eodSalesSummary?.individualTaxesBreakDown || [];
    const mapped: TaxProfileStat[] = taxStats.map((curr: any) => ({
      name: curr.taxName || curr.name || "Unknown",
      profileId: curr.taxRateId || curr.profileId || curr.id || curr.taxName,
      percentageUsed: curr.rate || curr.percentageUsed || 0,
      profileName: curr.taxName || curr.profileName || "Unknown",
      totalRevenueInvolved: Number(curr.taxableAmount || curr.totalRevenueInvolved || 0),
      totalTimesApplied: Number(curr.count || curr.totalTimesApplied || 0),
      totalAmount: Number(curr.amount || curr.totalAmount || 0),
    }));
    setStatsByTaxProfile(mapped);
    setOverallStats(
      mapped.length > 0
        ? {
            totalRevenueInvolved: mapped.reduce((s, i) => s + i.totalRevenueInvolved, 0),
            totalTimesApplied: mapped.reduce((s, i) => s + i.totalTimesApplied, 0),
            totalAmount: mapped.reduce((s, i) => s + i.totalAmount, 0),
          }
        : {},
    );
  }, [eodSalesSummary]);

  const dateRangeLabel = useMemo(
    () => (startDate && endDate ? `${format(new Date(startDate), "MMM dd, yyyy")} - ${format(new Date(endDate), "MMM dd, yyyy")}` : ""),
    [startDate, endDate],
  );

  const exportData = {
    summary,
    salesByOrderSource,
    salesByCategory,
    salesByStore,
    medicalVsRecreational,
    salesStatusAOVOverTime,
    salesHourStats,
    statsByTaxProfile,
    overallStats,
    taxesByClassification: eodSalesSummary?.taxesByClassification || [],
  };

  const exportMetadata = {
    store: shopDetails?.name || shopDetails?.shopName || "",
    dateCreated: format(new Date(), "MM/dd/yyyy"),
    dateRange: dateRangeLabel,
  };

  const summaryCards = [
    { title: "Net Sales", value: `$${Number(summary.netSales || 0).toFixed(2)}`, icon: <DollarSign className="size-4" />, color: "#1890ff" },
    { title: "Average Order Value", value: `$${Number(summary.averageOrderValue || 0).toFixed(2)}`, icon: <ShoppingCart className="size-4" />, color: "#52c41a" },
    { title: "Number of Orders", value: String(summary.numberOfOrders || 0), icon: <ShoppingCart className="size-4" />, color: "#722ed1" },
    { title: "Total Customers", value: String(summary.totalCustomers || 0), icon: <User className="size-4" />, color: "#faad14" },
    { title: "Margin %", value: `${Number(summary.marginPercent || 0).toFixed(2)}%`, icon: <Percent className="size-4" />, color: "#13c2c2" },
    { title: "Win Back Order %", value: `${Number(summary.winBackOrderPercent || 0).toFixed(2)}%`, icon: <TrendingUp className="size-4" />, color: "#eb2f96" },
  ];

  const medicalTotal = medicalVsRecreational.reduce((s, i) => s + i.value, 0);

  return (
    <div className="flex flex-col gap-4 p-6">
      <Card size="sm">
        <div className="flex items-center gap-2">
          <FileText className="size-5 text-primary" />
          <div>
            <h1 className="text-lg font-semibold">Command Center</h1>
            <p className="text-sm text-muted-foreground">
              View a comprehensive overview of sales performance for a specified date range.
            </p>
          </div>
        </div>
      </Card>

      <Card size="sm">
        <div className="flex flex-wrap items-center gap-3">
          <DateRangePicker value={range} onChange={setRange} />
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="outline" disabled={loading}>Export</Button>} />
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setPdfOpen(true)}>Export to PDF</DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportExecutiveSummaryToExcel(exportData, exportMetadata)}>
                Export to Excel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportExecutiveSummaryToCsv(summary)}>Export to CSV</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </Card>

      <div className="flex flex-wrap gap-3">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16 flex-1 basis-37.5 rounded-xl" />)
          : summaryCards.map((c) => <SummaryCard key={c.title} {...c} />)}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <Card size="sm">
            <h2 className="mb-3 text-sm font-semibold">Sales by Order Source</h2>
            <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
              <Table>
                <TableHeader className="[&_tr]:border-b-0">
                  <TableRow className="bg-muted/60">
                    <TableHead>Order Source</TableHead>
                    <TableHead>Online Type</TableHead>
                    <TableHead className="text-right">Net Sales</TableHead>
                    <TableHead className="text-right"># Orders</TableHead>
                    <TableHead className="text-right">AOV $</TableHead>
                    <TableHead className="text-right">Gross Margin</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {salesByOrderSource.length === 0 && (
                    <TableRow className="border-b-0">
                      <TableCell colSpan={6} className="py-6 text-center text-muted-foreground">
                        No data available.
                      </TableCell>
                    </TableRow>
                  )}
                  {salesByOrderSource.map((row, i) => (
                    <TableRow key={i} className={`border-b-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] ${i % 2 === 1 ? "bg-stone-100 dark:bg-stone-800" : ""}`}>
                      <TableCell>{row.orderSource || "-"}</TableCell>
                      <TableCell>{row.onlineType || "N/A"}</TableCell>
                      <TableCell className="text-right">${Number(row.netSales || 0).toFixed(2)}</TableCell>
                      <TableCell className="text-right">{row.numberOfOrders ?? "-"}</TableCell>
                      <TableCell className="text-right">${Number(row.aov || 0).toFixed(2)}</TableCell>
                      <TableCell className="text-right">{Number(row.grossMargin || 0).toFixed(1)}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>

          <Card size="sm">
            <h2 className="mb-3 text-sm font-semibold">Sales, Status &amp; AOV over Time</h2>
            <ResponsiveContainer width="100%" height={350}>
              <ComposedChart data={salesStatusAOVOverTime} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} tickFormatter={(v) => format(new Date(v), "MMM dd")} />
                <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }}
                  labelFormatter={(label: string) => format(new Date(label), "MMM dd, yyyy")}
                />
                <Legend />
                <Bar yAxisId="left" dataKey="returning" stackId="a" fill="#1890ff" name="Returning" />
                <Bar yAxisId="left" dataKey="reactivated" stackId="a" fill="#95de64" name="Reactivated" />
                <Bar yAxisId="left" dataKey="new" stackId="a" fill="#ffa940" name="New" radius={[4, 4, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="aov" stroke="#ff7875" strokeWidth={2} name="AOV" />
              </ComposedChart>
            </ResponsiveContainer>
          </Card>
        </div>

        <Card size="sm">
          <h2 className="mb-3 text-sm font-semibold">Sales by Category</h2>
          <div className="max-h-125 overflow-auto rounded-xl ring-1 ring-foreground/10">
            <Table>
              <TableHeader className="[&_tr]:border-b-0">
                <TableRow className="bg-muted/60">
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Net Sales</TableHead>
                  <TableHead className="text-right">Margin %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salesByCategory.length === 0 && (
                  <TableRow className="border-b-0">
                    <TableCell colSpan={3} className="py-6 text-center text-muted-foreground">
                      No data available.
                    </TableCell>
                  </TableRow>
                )}
                {salesByCategory.map((row, i) => (
                  <TableRow key={row.categoryId || i} className={`border-b-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] ${i % 2 === 1 ? "bg-stone-100 dark:bg-stone-800" : ""}`}>
                    <TableCell>{row.categoryName || "-"}</TableCell>
                    <TableCell className="text-right">${Number(row.netSales || 0).toFixed(2)}</TableCell>
                    <TableCell className="text-right">{Number(row.grossMargin || 0).toFixed(2)}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>

      <Card size="sm">
        <h2 className="mb-3 text-sm font-semibold">Busy Times of Day</h2>
        <BusyTimesChart salesHourStats={salesHourStats} />
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card size="sm">
          <h2 className="mb-3 text-sm font-semibold">Medical vs. Recreational</h2>
          {medicalVsRecreational.length === 0 || medicalTotal === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No data available.</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={medicalVsRecreational}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={120}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, value }) => (value > 0 ? name : "")}
                  >
                    {medicalVsRecreational.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => `$${Number(value).toFixed(2)}`}
                    contentStyle={{ backgroundColor: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-2 flex justify-center gap-6">
                {medicalVsRecreational.map((item) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div className="size-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-sm text-muted-foreground">{item.name}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>

        <Card size="sm">
          <h2 className="mb-3 text-sm font-semibold">Sales by Store</h2>
          <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
            <Table>
              <TableHeader className="[&_tr]:border-b-0">
                <TableRow className="bg-muted/60">
                  <TableHead>Store Name</TableHead>
                  <TableHead className="text-right">Net Sales</TableHead>
                  <TableHead className="text-right">% Net Sales</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salesByStore.length === 0 && (
                  <TableRow className="border-b-0">
                    <TableCell colSpan={3} className="py-6 text-center text-muted-foreground">
                      No data available.
                    </TableCell>
                  </TableRow>
                )}
                {salesByStore.map((row, i) => (
                  <TableRow key={row.shopId || i} className={`border-b-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] ${i % 2 === 1 ? "bg-stone-100 dark:bg-stone-800" : ""}`}>
                    <TableCell>{row.shopName || "-"}</TableCell>
                    <TableCell className="text-right">${Number(row.netSales || 0).toFixed(2)}</TableCell>
                    <TableCell className="text-right">{Number(row.netSalesPercent || 0).toFixed(1)}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>

        <Card size="sm">
          <h2 className="mb-3 text-sm font-semibold">Tax Summary</h2>
          <TaxSummaryTable statsByTaxProfile={statsByTaxProfile} overallStats={overallStats} />
        </Card>

        <Card size="sm">
          <h2 className="mb-3 text-sm font-semibold">Tax Breakdown by Classification</h2>
          <TaxBreakdownCard taxesByClassification={eodSalesSummary?.taxesByClassification || []} />
        </Card>
      </div>

      <PdfExportDrawer
        open={pdfOpen}
        onClose={() => setPdfOpen(false)}
        data={exportData}
        metadata={exportMetadata}
        availableSections={EXPORT_SECTIONS}
        htmlGenerator={buildExecutiveSummaryHtml as any}
        columnConfig={PDF_COLUMN_CONFIG}
      />
    </div>
  );
}
