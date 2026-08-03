import * as XLSX from "xlsx";
import type { PdfColumnConfig } from "@/components/ui/pdf-export-drawer";
import type { BrandSummaryRow, EmployeePerformanceByCategoryRow, EmployeePerformanceRow } from "./types";

export const EXPORT_SECTIONS = [
  "Employee Performance",
  "Employee Performance by Category",
  "Brand Summary",
];

export const PDF_COLUMN_CONFIG: Record<string, PdfColumnConfig[]> = {
  "Employee Performance": [
    { key: "employeeName", label: "Employee Name" },
    { key: "netSales", label: "Net Sales" },
    { key: "orders", label: "# Orders" },
    { key: "aov", label: "AOV $" },
    { key: "effectiveDiscount", label: "Effective Discount %" },
    { key: "ordersDiscount", label: "% Orders w/ Discount" },
    { key: "percentNetSales", label: "% Net Sales" },
  ],
  "Employee Performance by Category": [
    { key: "category", label: "Category Name" },
    { key: "employeeName", label: "Employee Name" },
    { key: "grossSales", label: "Gross Sales" },
    { key: "netSales", label: "Net Sales" },
    { key: "items", label: "# Items" },
  ],
  "Brand Summary": [
    { key: "brand", label: "Brand Name" },
    { key: "netSales", label: "Net Sales" },
    { key: "returns", label: "Returns % of Sales" },
    { key: "effectiveDiscount", label: "Effective Discount %" },
    { key: "grossMargin", label: "Gross Margin" },
  ],
};

export interface ExportData {
  budtenderData: EmployeePerformanceRow[];
  categoryData: EmployeePerformanceByCategoryRow[];
  brandData: BrandSummaryRow[];
}

export interface ExportMetadata {
  store: string;
  dateCreated: string;
  dateRange: string;
}

function th(label: string, align: "left" | "right" = "left") {
  return `<th style="padding:5px 6px;border:1px solid #ddd;background:#f5f5f5;font-weight:600;text-align:${align};">${label}</th>`;
}
function td(val: any, align: "left" | "right" = "left") {
  return `<td style="padding:5px 6px;border:1px solid #ddd;text-align:${align};">${val ?? "-"}</td>`;
}
function tableOpen() {
  return `<table style="width:100%;border-collapse:collapse;margin-bottom:16px;font-size:11px;">`;
}
function section(title: string) {
  return `<h3 style="margin:16px 0 8px;font-size:13px;border-bottom:2px solid #1890ff;padding-bottom:4px;color:#1a1a1a;">${title}</h3>`;
}

export function buildPerformanceHtml(
  data: ExportData,
  metadata: ExportMetadata,
  settings: { hiddenSections: string[] },
) {
  const hidden = settings.hiddenSections || [];
  const { budtenderData, categoryData, brandData } = data;

  let html = `<div style="font-family:Arial,sans-serif;font-size:12px;color:#333;">`;
  html += `<h2 style="margin-bottom:4px;color:#1a1a1a;">Performance Report</h2>`;
  html += `<p style="margin:0 0 4px;color:#666;font-size:11px;">${metadata.dateRange}</p>`;
  html += `<p style="margin:0;color:#999;font-size:10px;">Generated: ${metadata.dateCreated} | Store: ${metadata.store || "—"}</p>`;
  html += `<hr style="margin:10px 0;"/>`;

  if (!hidden.includes("Employee Performance") && budtenderData.length > 0) {
    html += section("Employee Performance");
    html += tableOpen();
    html += `<thead><tr>${th("Employee Name")}${th("Net Sales", "right")}${th("# Orders", "right")}${th("AOV $", "right")}${th("Eff. Discount %", "right")}${th("% Orders w/ Disc", "right")}${th("% Net Sales", "right")}</tr></thead><tbody>`;
    budtenderData.forEach((r) => {
      html += `<tr>
                ${td(r.employeeName || "-")}
                ${td("$" + Number(r.netSales || 0).toFixed(2), "right")}
                ${td(r.orders ?? "-", "right")}
                ${td("$" + Number(r.aov || 0).toFixed(2), "right")}
                ${td(Number(r.effectiveDiscount || 0).toFixed(1) + "%", "right")}
                ${td(Number(r.ordersDiscount || 0).toFixed(1) + "%", "right")}
                ${td(Number(r.percentNetSales || 0).toFixed(2) + "%", "right")}
            </tr>`;
    });
    html += `</tbody></table>`;
  }

  if (!hidden.includes("Employee Performance by Category") && categoryData.length > 0) {
    html += section("Employee Performance by Category");
    html += tableOpen();
    html += `<thead><tr>${th("Category")}${th("Employee")}${th("Gross Sales", "right")}${th("Net Sales", "right")}${th("# Items", "right")}</tr></thead><tbody>`;
    categoryData.forEach((r) => {
      html += `<tr>
                ${td(r.category || "-")}
                ${td(r.employeeName || "-")}
                ${td("$" + Number(r.grossSales || 0).toFixed(2), "right")}
                ${td("$" + Number(r.netSales || 0).toFixed(2), "right")}
                ${td(r.items ?? "-", "right")}
            </tr>`;
    });
    html += `</tbody></table>`;
  }

  if (!hidden.includes("Brand Summary") && brandData.length > 0) {
    html += section("Brand Summary");
    html += tableOpen();
    html += `<thead><tr>${th("Brand")}${th("Net Sales", "right")}${th("Returns %", "right")}${th("Eff. Discount %", "right")}${th("Gross Margin", "right")}</tr></thead><tbody>`;
    brandData.forEach((r) => {
      html += `<tr>
                ${td(r.brand || "-")}
                ${td("$" + Number(r.netSales || 0).toFixed(2), "right")}
                ${td(Number(r.returns || 0).toFixed(1) + "%", "right")}
                ${td(Number(r.effectiveDiscount || 0).toFixed(1) + "%", "right")}
                ${td(Number(r.grossMargin || 0).toFixed(1) + "%", "right")}
            </tr>`;
    });
    html += `</tbody></table>`;
  }

  html += `</div>`;
  return html;
}

export function buildPerformanceExcelSheets(
  data: ExportData,
  settings: { hiddenSections?: string[]; hiddenColumns?: Record<string, string[]> } = {},
) {
  const hiddenSections = settings.hiddenSections || [];
  const hiddenColumns = settings.hiddenColumns || {};
  const { budtenderData, categoryData, brandData } = data;
  const sheets: { name: string; data: any[][] }[] = [];

  const makeSheet = (sectionName: string, allCols: PdfColumnConfig[], rows: Record<string, any>[]) => {
    if (hiddenSections.includes(sectionName) || rows.length === 0) return;
    const visibleCols = allCols.filter((c) => !(hiddenColumns[sectionName] || []).includes(c.key));
    if (visibleCols.length === 0) return;
    sheets.push({
      name: sectionName.substring(0, 31),
      data: [visibleCols.map((c) => c.label), ...rows.map((row) => visibleCols.map((c) => row[c.key] ?? "-"))],
    });
  };

  makeSheet(
    "Employee Performance",
    PDF_COLUMN_CONFIG["Employee Performance"],
    budtenderData.map((r) => ({
      employeeName: r.employeeName || "-",
      netSales: `$${Number(r.netSales || 0).toFixed(2)}`,
      orders: r.orders ?? "-",
      aov: `$${Number(r.aov || 0).toFixed(2)}`,
      effectiveDiscount: `${Number(r.effectiveDiscount || 0).toFixed(1)}%`,
      ordersDiscount: `${Number(r.ordersDiscount || 0).toFixed(1)}%`,
      percentNetSales: `${Number(r.percentNetSales || 0).toFixed(2)}%`,
    })),
  );

  makeSheet(
    "Employee Performance by Category",
    PDF_COLUMN_CONFIG["Employee Performance by Category"],
    categoryData.map((r) => ({
      category: r.category || "-",
      employeeName: r.employeeName || "-",
      grossSales: `$${Number(r.grossSales || 0).toFixed(2)}`,
      netSales: `$${Number(r.netSales || 0).toFixed(2)}`,
      items: r.items ?? "-",
    })),
  );

  makeSheet(
    "Brand Summary",
    PDF_COLUMN_CONFIG["Brand Summary"],
    brandData.map((r) => ({
      brand: r.brand || "-",
      netSales: `$${Number(r.netSales || 0).toFixed(2)}`,
      returns: `${Number(r.returns || 0).toFixed(1)}%`,
      effectiveDiscount: `${Number(r.effectiveDiscount || 0).toFixed(1)}%`,
      grossMargin: `${Number(r.grossMargin || 0).toFixed(1)}%`,
    })),
  );

  return sheets.length > 0 ? sheets : [{ name: "No Data", data: [["No data available"]] }];
}

export function exportPerformanceToExcel(data: ExportData, filename: string) {
  const sheets = buildPerformanceExcelSheets(data);
  const wb = XLSX.utils.book_new();
  sheets.forEach((sheet) => {
    const ws = XLSX.utils.aoa_to_sheet(sheet.data);
    XLSX.utils.book_append_sheet(wb, ws, sheet.name);
  });
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

export function exportBudtenderToCsv(budtenderData: EmployeePerformanceRow[]) {
  const rows = [
    ["Employee Name", "Net Sales", "# Orders", "AOV $", "Effective Discount %", "% Orders w/ Discount", "% Net Sales"],
    ...budtenderData.map((r) => [
      r.employeeName || "-",
      `$${Number(r.netSales || 0).toFixed(2)}`,
      String(r.orders ?? "-"),
      `$${Number(r.aov || 0).toFixed(2)}`,
      `${Number(r.effectiveDiscount || 0).toFixed(1)}%`,
      `${Number(r.ordersDiscount || 0).toFixed(1)}%`,
      `${Number(r.percentNetSales || 0).toFixed(2)}%`,
    ]),
  ];
  const csv = rows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", "performance_report.csv");
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
