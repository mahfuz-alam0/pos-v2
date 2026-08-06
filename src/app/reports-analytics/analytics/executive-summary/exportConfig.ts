import * as XLSX from "xlsx";
import { format } from "date-fns";
import type { PdfColumnConfig } from "@/components/ui/pdf-export-drawer";
import type {
  ExecutiveSummary,
  MedicalVsRecreationalSlice,
  OverallTaxStats,
  SalesByCategoryRow,
  SalesByOrderSourceRow,
  SalesByStoreRow,
  SalesHourStat,
  SalesStatusAOVPoint,
  TaxProfileStat,
} from "./types";

export const EXPORT_SECTIONS = [
  "Summary",
  "Sales by Order Source",
  "Sales by Category",
  "Sales by Store",
  "Medical vs Recreational",
  "Sales Status & AOV Over Time",
  "Busy Times of Day",
  "Tax Summary",
  "Tax Breakdown by Classification",
];

export const PDF_COLUMN_CONFIG: Record<string, PdfColumnConfig[]> = {
  "Summary": [
    { key: "netSales", label: "Net Sales" },
    { key: "averageOrderValue", label: "Average Order Value" },
    { key: "numberOfOrders", label: "Number of Orders" },
    { key: "totalCustomers", label: "Total Customers" },
    { key: "marginPercent", label: "Margin %" },
    { key: "winBackOrderPercent", label: "Win Back Order %" },
  ],
  "Sales by Order Source": [
    { key: "orderSource", label: "Order Source" },
    { key: "onlineType", label: "Online Type" },
    { key: "netSales", label: "Net Sales" },
    { key: "numberOfOrders", label: "# Orders" },
    { key: "aov", label: "AOV $" },
    { key: "grossMargin", label: "Gross Margin" },
    { key: "profitPerOrder", label: "Profit/Order" },
    { key: "percentNetSales", label: "%Net Sales" },
  ],
  "Sales by Category": [
    { key: "categoryName", label: "Category" },
    { key: "netSales", label: "Net Sales" },
    { key: "grossMargin", label: "Margin %" },
  ],
  "Sales by Store": [
    { key: "shopName", label: "Store Name" },
    { key: "netSales", label: "Net Sales" },
    { key: "netSalesPercent", label: "%Net Sales" },
  ],
};

export interface ExportData {
  summary: ExecutiveSummary;
  salesByOrderSource: SalesByOrderSourceRow[];
  salesByCategory: SalesByCategoryRow[];
  salesByStore: SalesByStoreRow[];
  medicalVsRecreational: MedicalVsRecreationalSlice[];
  salesStatusAOVOverTime: SalesStatusAOVPoint[];
  salesHourStats: SalesHourStat[];
  statsByTaxProfile: TaxProfileStat[];
  overallStats: OverallTaxStats;
  taxesByClassification: any[];
}

export interface ExportMetadata {
  store: string;
  dateCreated: string;
  dateRange: string;
}

function th(label: string, align: "left" | "right" = "left") {
  return `<th style="padding:5px 6px; border:1px solid #ddd; background:#f5f5f5; font-weight:600; text-align:${align};">${label}</th>`;
}
function td(val: any, align: "left" | "right" = "left") {
  return `<td style="padding:5px 6px; border:1px solid #ddd; text-align:${align};">${val ?? "-"}</td>`;
}
function tableOpen() {
  return `<table style="width:100%; border-collapse:collapse; margin-bottom:16px; font-size:11px;">`;
}
function section(title: string) {
  return `<h3 style="margin:16px 0 8px; font-size:13px; border-bottom:2px solid #1890ff; padding-bottom:4px; color:#1a1a1a;">${title}</h3>`;
}
function fmt(v: any, type?: "currency" | "percent") {
  if (v === undefined || v === null) return "-";
  if (type === "currency") return `$${Number(v).toFixed(2)}`;
  if (type === "percent") return `${Number(v).toFixed(2)}%`;
  return v;
}

export function buildExecutiveSummaryHtml(data: ExportData, metadata: ExportMetadata, settings: { hiddenSections: string[] }) {
  const hidden = settings.hiddenSections || [];
  const {
    summary,
    salesByOrderSource,
    salesByCategory,
    salesByStore,
    medicalVsRecreational,
    salesStatusAOVOverTime,
    salesHourStats,
    statsByTaxProfile,
    overallStats,
    taxesByClassification,
  } = data;

  let html = `<div style="font-family: Arial, sans-serif; font-size: 12px; color: #333;">`;
  html += `<h2 style="margin-bottom: 4px; color:#1a1a1a;">Executive Summary — Command Center</h2>`;
  html += `<p style="margin: 0 0 4px; color: #666; font-size: 11px;">${metadata.dateRange}</p>`;
  html += `<p style="margin: 0; color: #999; font-size: 10px;">Generated: ${metadata.dateCreated} | Store: ${metadata.store || "—"}</p>`;
  html += `<hr style="margin: 10px 0;" />`;

  if (!hidden.includes("Summary")) {
    html += section("Summary");
    html += tableOpen();
    html += `<thead><tr>${th("Metric")}${th("Value", "right")}</tr></thead><tbody>`;
    [
      ["Net Sales", fmt(summary.netSales, "currency")],
      ["Average Order Value", fmt(summary.averageOrderValue, "currency")],
      ["Number of Orders", summary.numberOfOrders ?? "-"],
      ["Total Customers", summary.totalCustomers ?? "-"],
      ["Margin %", fmt(summary.marginPercent, "percent")],
      ["Win Back Order %", fmt(summary.winBackOrderPercent, "percent")],
    ].forEach(([label, val]) => {
      html += `<tr>${td(label)}${td(val, "right")}</tr>`;
    });
    html += `</tbody></table>`;
  }

  if (!hidden.includes("Sales by Order Source") && salesByOrderSource.length > 0) {
    html += section("Sales by Order Source");
    html += tableOpen();
    html += `<thead><tr>${th("Order Source")}${th("Online Type")}${th("Net Sales", "right")}${th("# Orders", "right")}${th("AOV", "right")}${th("Gross Margin", "right")}${th("% Net Sales", "right")}</tr></thead><tbody>`;
    salesByOrderSource.forEach((row) => {
      html += `<tr>${td(row.orderSource || "-")}${td(row.onlineType || "N/A")}${td(fmt(row.netSales, "currency"), "right")}${td(row.numberOfOrders ?? "-", "right")}${td(fmt(row.aov, "currency"), "right")}${td(`${Number(row.grossMargin || 0).toFixed(1)}%`, "right")}${td(`${Number(row.percentNetSales || 0).toFixed(3)}%`, "right")}</tr>`;
    });
    html += `</tbody></table>`;
  }

  if (!hidden.includes("Sales by Category") && salesByCategory.length > 0) {
    html += section("Sales by Category");
    html += tableOpen();
    html += `<thead><tr>${th("Category")}${th("Net Sales", "right")}${th("Margin %", "right")}</tr></thead><tbody>`;
    salesByCategory.forEach((row) => {
      html += `<tr>${td(row.categoryName || "-")}${td(fmt(row.netSales, "currency"), "right")}${td(`${Number(row.grossMargin || 0).toFixed(2)}%`, "right")}</tr>`;
    });
    html += `</tbody></table>`;
  }

  if (!hidden.includes("Sales by Store") && salesByStore.length > 0) {
    html += section("Sales by Store");
    html += tableOpen();
    html += `<thead><tr>${th("Store Name")}${th("Net Sales", "right")}${th("% Net Sales", "right")}</tr></thead><tbody>`;
    salesByStore.forEach((row) => {
      html += `<tr>${td(row.shopName || "-")}${td(fmt(row.netSales, "currency"), "right")}${td(`${Number(row.netSalesPercent || 0).toFixed(1)}%`, "right")}</tr>`;
    });
    html += `</tbody></table>`;
  }

  if (!hidden.includes("Medical vs Recreational") && medicalVsRecreational.length > 0) {
    html += section("Medical vs Recreational");
    html += tableOpen();
    html += `<thead><tr>${th("Type")}${th("Sales Count", "right")}</tr></thead><tbody>`;
    medicalVsRecreational.forEach((row) => {
      html += `<tr>${td(row.name)}${td(Number(row.value || 0).toFixed(2), "right")}</tr>`;
    });
    const total = medicalVsRecreational.reduce((s, r) => s + (r.value || 0), 0);
    html += `<tr style="font-weight:600; background:#f5f5f5;">${td("Total")}${td(total.toFixed(2), "right")}</tr>`;
    html += `</tbody></table>`;
  }

  if (!hidden.includes("Sales Status & AOV Over Time") && salesStatusAOVOverTime.length > 0) {
    html += section("Sales Status & AOV Over Time");
    html += tableOpen();
    html += `<thead><tr>${th("Date")}${th("New ($)", "right")}${th("Returning ($)", "right")}${th("Reactivated ($)", "right")}${th("AOV ($)", "right")}</tr></thead><tbody>`;
    salesStatusAOVOverTime.forEach((row) => {
      html += `<tr>${td(format(new Date(row.date), "MMM dd, yyyy"))}${td(fmt(row.new, "currency"), "right")}${td(fmt(row.returning, "currency"), "right")}${td(fmt(row.reactivated, "currency"), "right")}${td(fmt(row.aov, "currency"), "right")}</tr>`;
    });
    html += `</tbody></table>`;
  }

  if (!hidden.includes("Busy Times of Day") && salesHourStats.length > 0) {
    html += section("Busy Times of Day");
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const pivot: Record<string, Record<string, number>> = {};
    salesHourStats.forEach((entry) => {
      const time = entry.twelveHoursTime || "-";
      const day = dayNames[(entry.weekDay || 1) - 1] || "Unknown";
      if (!pivot[time]) pivot[time] = {};
      pivot[time][day] = (pivot[time][day] || 0) + (entry.totalHitCount || 0);
    });
    const timeSlots = Object.keys(pivot);
    const activeDays = [...new Set(salesHourStats.map((e) => dayNames[(e.weekDay || 1) - 1]))];
    html += tableOpen();
    html += `<thead><tr>${th("Time")}${activeDays.map((d) => th(d, "right")).join("")}</tr></thead><tbody>`;
    timeSlots.forEach((time) => {
      html += `<tr>${td(time)}${activeDays.map((d) => td(pivot[time][d] ?? 0, "right")).join("")}</tr>`;
    });
    html += `</tbody></table>`;
  }

  if (!hidden.includes("Tax Summary") && statsByTaxProfile.length > 0) {
    html += section("Tax Summary");
    html += tableOpen();
    html += `<thead><tr>${th("Tax Name")}${th("Rate %", "right")}${th("Taxable Amount", "right")}${th("Times Applied", "right")}${th("Total Tax", "right")}</tr></thead><tbody>`;
    statsByTaxProfile.forEach((row) => {
      html += `<tr>${td(row.name || row.profileName || "-")}${td(`${Number(row.percentageUsed || 0).toFixed(2)}%`, "right")}${td(fmt(row.totalRevenueInvolved, "currency"), "right")}${td(row.totalTimesApplied ?? "-", "right")}${td(fmt(row.totalAmount, "currency"), "right")}</tr>`;
    });
    if (overallStats && Object.keys(overallStats).length > 0) {
      html += `<tr style="font-weight:600; background:#f5f5f5;">${td("Total")}${td("")}${td(fmt(overallStats.totalRevenueInvolved, "currency"), "right")}${td(overallStats.totalTimesApplied ?? "-", "right")}${td(fmt(overallStats.totalAmount, "currency"), "right")}</tr>`;
    }
    html += `</tbody></table>`;
  }

  if (!hidden.includes("Tax Breakdown by Classification") && taxesByClassification.length > 0) {
    html += section("Tax Breakdown by Classification");
    html += tableOpen();
    html += `<thead><tr>${th("Tax Name")}${th("Classification")}${th("Taxable Amount", "right")}${th("Tax Amount", "right")}</tr></thead><tbody>`;
    taxesByClassification.forEach((c: any) => {
      (c.taxes || []).forEach((t: any) => {
        html += `<tr>${td(t.taxName || "-")}${td(c.classificationName || "-")}${td(fmt(t.taxesRevenue, "currency"), "right")}${td(fmt(t.totalAmount, "currency"), "right")}</tr>`;
      });
    });
    html += `</tbody></table>`;
  }

  html += `</div>`;
  return html;
}

export function exportExecutiveSummaryToExcel(data: ExportData, metadata: ExportMetadata) {
  const wb = XLSX.utils.book_new();
  const {
    summary,
    salesByOrderSource,
    salesByCategory,
    salesByStore,
    medicalVsRecreational,
    salesStatusAOVOverTime,
    statsByTaxProfile,
  } = data;

  const summarySheet = XLSX.utils.aoa_to_sheet([
    ["Executive Summary — Command Center"],
    ["Date Range:", metadata.dateRange],
    ["Generated:", metadata.dateCreated],
    ["Store:", metadata.store || "-"],
    [],
    ["Metric", "Value"],
    ["Net Sales", `$${Number(summary.netSales || 0).toFixed(2)}`],
    ["Average Order Value", `$${Number(summary.averageOrderValue || 0).toFixed(2)}`],
    ["Number of Orders", summary.numberOfOrders || 0],
    ["Total Customers", summary.totalCustomers || 0],
    ["Margin %", `${Number(summary.marginPercent || 0).toFixed(2)}%`],
    ["Win Back Order %", `${Number(summary.winBackOrderPercent || 0).toFixed(2)}%`],
  ]);
  XLSX.utils.book_append_sheet(wb, summarySheet, "Summary");

  if (salesByOrderSource.length > 0) {
    const sheet = XLSX.utils.aoa_to_sheet([
      ["Order Source", "Online Type", "Net Sales", "# Orders", "AOV", "Gross Margin %", "Profit/Order", "% Net Sales"],
      ...salesByOrderSource.map((r) => [
        r.orderSource || "-",
        r.onlineType || "N/A",
        `$${Number(r.netSales || 0).toFixed(2)}`,
        r.numberOfOrders ?? "-",
        `$${Number(r.aov || 0).toFixed(2)}`,
        `${Number(r.grossMargin || 0).toFixed(1)}%`,
        `$${Number(r.profitPerOrder || 0).toFixed(2)}`,
        `${Number(r.percentNetSales || 0).toFixed(3)}%`,
      ]),
    ]);
    XLSX.utils.book_append_sheet(wb, sheet, "Sales by Order Source");
  }

  if (salesByCategory.length > 0) {
    const sheet = XLSX.utils.aoa_to_sheet([
      ["Category", "Net Sales", "Margin %"],
      ...salesByCategory.map((r) => [r.categoryName || "-", `$${Number(r.netSales || 0).toFixed(2)}`, `${Number(r.grossMargin || 0).toFixed(2)}%`]),
    ]);
    XLSX.utils.book_append_sheet(wb, sheet, "Sales by Category");
  }

  if (salesByStore.length > 0) {
    const sheet = XLSX.utils.aoa_to_sheet([
      ["Store Name", "Net Sales", "% Net Sales"],
      ...salesByStore.map((r) => [r.shopName || "-", `$${Number(r.netSales || 0).toFixed(2)}`, `${Number(r.netSalesPercent || 0).toFixed(1)}%`]),
    ]);
    XLSX.utils.book_append_sheet(wb, sheet, "Sales by Store");
  }

  if (medicalVsRecreational.length > 0) {
    const sheet = XLSX.utils.aoa_to_sheet([
      ["Type", "Sales Count"],
      ...medicalVsRecreational.map((r) => [r.name || "-", Number(r.value || 0).toFixed(2)]),
    ]);
    XLSX.utils.book_append_sheet(wb, sheet, "Medical vs Recreational");
  }

  if (salesStatusAOVOverTime.length > 0) {
    const sheet = XLSX.utils.aoa_to_sheet([
      ["Date", "New ($)", "Returning ($)", "Reactivated ($)", "AOV ($)"],
      ...salesStatusAOVOverTime.map((r) => [
        format(new Date(r.date), "yyyy-MM-dd"),
        `$${Number(r.new || 0).toFixed(2)}`,
        `$${Number(r.returning || 0).toFixed(2)}`,
        `$${Number(r.reactivated || 0).toFixed(2)}`,
        `$${Number(r.aov || 0).toFixed(2)}`,
      ]),
    ]);
    XLSX.utils.book_append_sheet(wb, sheet, "Sales Status & AOV");
  }

  if (statsByTaxProfile.length > 0) {
    const sheet = XLSX.utils.aoa_to_sheet([
      ["Tax Name", "Rate %", "Taxable Amount", "Times Applied", "Total Tax"],
      ...statsByTaxProfile.map((r) => [
        r.name || r.profileName || "-",
        `${Number(r.percentageUsed || 0).toFixed(2)}%`,
        `$${Number(r.totalRevenueInvolved || 0).toFixed(2)}`,
        r.totalTimesApplied ?? "-",
        `$${Number(r.totalAmount || 0).toFixed(2)}`,
      ]),
    ]);
    XLSX.utils.book_append_sheet(wb, sheet, "Tax Summary");
  }

  XLSX.writeFile(wb, `Executive_Summary_${format(new Date(), "yyyy-MM-dd_HH-mm-ss")}.xlsx`);
}

export function exportExecutiveSummaryToCsv(summary: ExecutiveSummary) {
  const rows = [
    ["Metric", "Value"],
    ["Net Sales", `$${Number(summary.netSales || 0).toFixed(2)}`],
    ["Average Order Value", `$${Number(summary.averageOrderValue || 0).toFixed(2)}`],
    ["Number of Orders", String(summary.numberOfOrders || 0)],
    ["Total Customers", String(summary.totalCustomers || 0)],
    ["Margin %", `${Number(summary.marginPercent || 0).toFixed(2)}%`],
    ["Win Back Order %", `${Number(summary.winBackOrderPercent || 0).toFixed(2)}%`],
  ];
  const csv = rows.map((r) => r.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", "executive_summary.csv");
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
