import { format } from "date-fns";
import type { PdfColumnConfig } from "@/components/ui/pdf-export-drawer";
import type {
  SalesByCategoryRow,
  SalesByDayRow,
  SalesByEmployeeRow,
  SalesByLocationRow,
  SalesByProductRow,
  ItemizedSaleRow,
  TaxBreakdownItem,
} from "./types";

/* ---------------- shared helpers (same pattern as inventory/exportConfig.ts) ---------------- */

function fmt(v: any) {
  return `$${(Number(v) || 0).toFixed(2)}`;
}

function pctFmt(v: any) {
  return `${(Number(v) || 0).toFixed(2)}%`;
}

function downloadCsv(csv: string, filename: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function csvEscape(v: any) {
  return `"${String(v ?? "").replace(/"/g, '""')}"`;
}

function tableHtml(headers: string[], rows: (string | number)[][]) {
  const thStyle = `style="background:#f8f9fa;padding:8px 12px;text-align:left;font-size:12px;font-weight:600;color:#374151;border:1px solid #e5e7eb;"`;
  const tdStyle = `style="padding:7px 12px;font-size:12px;color:#374151;border:1px solid #e5e7eb;"`;
  return `<table style="width:100%;border-collapse:collapse;margin-top:8px;">
    <thead><tr>${headers.map((h) => `<th ${thStyle}>${h}</th>`).join("")}</tr></thead>
    <tbody>${rows
      .map(
        (row, i) =>
          `<tr style="background:${i % 2 === 0 ? "#fff" : "#f9fafb"};">${row.map((c) => `<td ${tdStyle}>${c ?? ""}</td>`).join("")}</tr>`,
      )
      .join("")}</tbody>
  </table>`;
}

function section(title: string, content: string) {
  return `<div style="margin-bottom:24px;">
    <h3 style="font-size:14px;font-weight:700;color:#1e293b;margin:0 0 8px 0;padding-bottom:6px;border-bottom:2px solid #e2e8f0;">${title}</h3>
    ${content}
  </div>`;
}

function reportHeaderHtml(title: string, metadata: { storeName?: string; dateRange?: string }) {
  return `<div style="margin-bottom:20px;">
    <h2 style="font-size:20px;font-weight:700;color:#1e293b;margin:0;">${title}</h2>
    ${metadata?.storeName ? `<p style="color:#64748b;font-size:13px;margin:4px 0 0;">${metadata.storeName}</p>` : ""}
    ${metadata?.dateRange ? `<p style="color:#64748b;font-size:13px;margin:2px 0 0;">${metadata.dateRange}</p>` : ""}
  </div>`;
}

function uniqueTaxNames(rows: { taxBreakdown?: TaxBreakdownItem[] }[]) {
  const names = new Set<string>();
  rows.forEach((r) => r.taxBreakdown?.forEach((t) => t.name && names.add(t.name)));
  return Array.from(names).sort();
}

function taxAmt(row: { taxBreakdown?: TaxBreakdownItem[] }, name: string) {
  return row.taxBreakdown?.find((t) => t.name === name)?.totalAmount || 0;
}

/* ==================== Sales by Category ==================== */

export const CATEGORY_SECTIONS = ["Summary", "Sales by Category"];

export const CATEGORY_COLUMN_CONFIG: Record<string, PdfColumnConfig[]> = {
  "Sales by Category": [
    { key: "categoryName", label: "Category" },
    { key: "itemsSold", label: "Items Sold" },
    { key: "grossSales", label: "Gross Sales" },
    { key: "subtotal", label: "Subtotal" },
    { key: "totalCost", label: "Total Cost" },
    { key: "grossProfit", label: "Gross Profit" },
    { key: "grossMargin", label: "Gross Margin" },
    { key: "totalDiscount", label: "Total Discount" },
    { key: "totalTax", label: "Total Tax" },
    { key: "markdownPercent", label: "Markdown %" },
  ],
};

function categorySummary(rows: SalesByCategoryRow[]) {
  return {
    "Total Categories": rows.length,
    "Total Items Sold": rows.reduce((s, r) => s + (r.itemsSold || 0), 0),
    "Total Gross Sales": fmt(rows.reduce((s, r) => s + (r.grossSales || 0), 0)),
    "Total Gross Profit": fmt(rows.reduce((s, r) => s + (r.grossProfit || 0), 0)),
    "Total Discount": fmt(rows.reduce((s, r) => s + (r.totalDiscount || 0), 0)),
    "Total Tax": fmt(rows.reduce((s, r) => s + (r.totalTax || 0), 0)),
  };
}

function categoryHeaders(taxNames: string[]) {
  return ["Category", "Items Sold", "Gross Sales", "Subtotal", "Total Cost", "Gross Profit", "Gross Margin", "Total Discount", "Total Tax", "Markdown %", ...taxNames.map((n) => `Tax: ${n}`)];
}

function categoryRow(r: SalesByCategoryRow, taxNames: string[]) {
  return [
    r.categoryName || "-",
    r.itemsSold || 0,
    fmt(r.grossSales),
    fmt(r.subtotal),
    fmt(r.totalCost),
    fmt(r.grossProfit),
    pctFmt(r.grossMargin),
    fmt(r.totalDiscount),
    fmt(r.totalTax),
    pctFmt((r.markdownPercent || 0) * 100),
    ...taxNames.map((n) => fmt(taxAmt(r, n))),
  ];
}

export function buildCategoryHtml(data: SalesByCategoryRow[], metadata: { storeName?: string; dateRange?: string }, settings: { hiddenSections: string[] }) {
  const hidden = settings?.hiddenSections || [];
  const taxNames = uniqueTaxNames(data);
  let html = `<div style="font-family:Arial,sans-serif;padding:20px;">${reportHeaderHtml("Sales by Category Report", metadata)}`;
  if (!hidden.includes("Summary")) {
    html += section("Summary", tableHtml(["Metric", "Value"], Object.entries(categorySummary(data)).map(([k, v]) => [k, v as string | number])));
  }
  if (!hidden.includes("Sales by Category") && data.length) {
    html += section("Sales by Category", tableHtml(categoryHeaders(taxNames), data.map((r) => categoryRow(r, taxNames))));
  }
  html += `</div>`;
  return html;
}

export function buildCategoryExcelSheets(data: SalesByCategoryRow[], settings: { hiddenSections: string[] }) {
  const hidden = settings?.hiddenSections || [];
  const taxNames = uniqueTaxNames(data);
  const sheets: { name: string; data: any[][] }[] = [];
  if (!hidden.includes("Summary")) sheets.push({ name: "Summary", data: [["Metric", "Value"], ...Object.entries(categorySummary(data))] });
  if (!hidden.includes("Sales by Category") && data.length) {
    sheets.push({ name: "Sales by Category", data: [categoryHeaders(taxNames), ...data.map((r) => categoryRow(r, taxNames))] });
  }
  return sheets.length > 0 ? sheets : [{ name: "No Data", data: [["No data available"]] }];
}

export function exportCategoryToCsv(data: SalesByCategoryRow[], dateRangeLabel: string, filename: string) {
  const taxNames = uniqueTaxNames(data);
  let csv = `Sales by Category Report\n${dateRangeLabel}\n\nSummary\n`;
  Object.entries(categorySummary(data)).forEach(([k, v]) => (csv += `${csvEscape(k)},${csvEscape(v)}\n`));
  csv += `\nSales by Category\n${categoryHeaders(taxNames).join(",")}\n`;
  data.forEach((r) => (csv += categoryRow(r, taxNames).map(csvEscape).join(",") + "\n"));
  downloadCsv(csv, filename);
}

/* ==================== Sales by Day ==================== */

export const DAY_SECTIONS = ["Summary", "Sales by Day"];

export const DAY_COLUMN_CONFIG: Record<string, PdfColumnConfig[]> = {
  "Sales by Day": [
    { key: "date", label: "Date" },
    { key: "itemsSold", label: "Items Sold" },
    { key: "grossSales", label: "Gross Sales" },
    { key: "subtotal", label: "Subtotal" },
    { key: "totalCost", label: "Total Cost" },
    { key: "grossProfit", label: "Gross Profit" },
    { key: "grossMargin", label: "Gross Margin %" },
    { key: "totalDiscount", label: "Total Discount" },
    { key: "markdownPercent", label: "Markdown %" },
    { key: "totalTax", label: "Total Tax" },
    { key: "averageTransactions", label: "Transaction Average" },
    { key: "avgItemTransaction", label: "Avg Items/Transaction" },
  ],
};

function daySummary(rows: SalesByDayRow[]) {
  return {
    "Total Days": rows.length,
    "Total Items Sold": rows.reduce((s, r) => s + (r.itemsSold || 0), 0),
    "Total Gross Sales": fmt(rows.reduce((s, r) => s + (r.grossSales || 0), 0)),
    "Total Gross Profit": fmt(rows.reduce((s, r) => s + (r.grossProfit || 0), 0)),
    "Total Discount": fmt(rows.reduce((s, r) => s + (r.totalDiscount || 0), 0)),
    "Total Tax": fmt(rows.reduce((s, r) => s + (r.totalTax || 0), 0)),
  };
}

function dayHeaders(taxNames: string[]) {
  return ["Date", "Items Sold", "Gross Sales", "Subtotal", "Total Cost", "Gross Profit", "Gross Margin %", "Total Discount", "Markdown %", "Total Tax", ...taxNames.map((n) => `Tax: ${n}`), "Transaction Average", "Avg Items/Transaction"];
}

function dayRow(r: SalesByDayRow, taxNames: string[]) {
  return [
    r.date ? format(new Date(r.date), "yyyy-MM-dd") : "-",
    r.itemsSold || 0,
    fmt(r.grossSales),
    fmt(r.subtotal),
    fmt(r.totalCost),
    fmt(r.grossProfit),
    pctFmt(r.grossMargin),
    fmt(r.totalDiscount),
    pctFmt(r.markdownPercent),
    fmt(r.totalTax),
    ...taxNames.map((n) => fmt(taxAmt(r, n))),
    fmt(r.averageTransactions),
    (r.avgItemTransaction || 0).toFixed(2),
  ];
}

export function buildDayHtml(data: SalesByDayRow[], metadata: { storeName?: string; dateRange?: string }, settings: { hiddenSections: string[] }) {
  const hidden = settings?.hiddenSections || [];
  const taxNames = uniqueTaxNames(data);
  let html = `<div style="font-family:Arial,sans-serif;padding:20px;">${reportHeaderHtml("Sales by Day Report", metadata)}`;
  if (!hidden.includes("Summary")) html += section("Summary", tableHtml(["Metric", "Value"], Object.entries(daySummary(data)).map(([k, v]) => [k, v as string | number])));
  if (!hidden.includes("Sales by Day") && data.length) html += section("Sales by Day", tableHtml(dayHeaders(taxNames), data.map((r) => dayRow(r, taxNames))));
  html += `</div>`;
  return html;
}

export function buildDayExcelSheets(data: SalesByDayRow[], settings: { hiddenSections: string[] }) {
  const hidden = settings?.hiddenSections || [];
  const taxNames = uniqueTaxNames(data);
  const sheets: { name: string; data: any[][] }[] = [];
  if (!hidden.includes("Summary")) sheets.push({ name: "Summary", data: [["Metric", "Value"], ...Object.entries(daySummary(data))] });
  if (!hidden.includes("Sales by Day") && data.length) sheets.push({ name: "Sales by Day", data: [dayHeaders(taxNames), ...data.map((r) => dayRow(r, taxNames))] });
  return sheets.length > 0 ? sheets : [{ name: "No Data", data: [["No data available"]] }];
}

export function exportDayToCsv(data: SalesByDayRow[], dateRangeLabel: string, filename: string) {
  const taxNames = uniqueTaxNames(data);
  let csv = `Sales by Day Report\n${dateRangeLabel}\n\nSummary\n`;
  Object.entries(daySummary(data)).forEach(([k, v]) => (csv += `${csvEscape(k)},${csvEscape(v)}\n`));
  csv += `\nSales by Day\n${dayHeaders(taxNames).join(",")}\n`;
  data.forEach((r) => (csv += dayRow(r, taxNames).map(csvEscape).join(",") + "\n"));
  downloadCsv(csv, filename);
}

/* ==================== Sales by Employee ==================== */

export const EMPLOYEE_SECTIONS = ["Summary", "Sales by Employee"];

export const EMPLOYEE_COLUMN_CONFIG: Record<string, PdfColumnConfig[]> = {
  "Sales by Employee": [
    { key: "createdEmployeeName", label: "Employee" },
    { key: "totalOrders", label: "Total Orders" },
    { key: "itemsSold", label: "Items Sold" },
    { key: "grossSales", label: "Gross Sales" },
    { key: "totalDiscount", label: "Total Discount" },
    { key: "subtotal", label: "Subtotal" },
    { key: "totalCost", label: "Total Cost" },
    { key: "grossProfit", label: "Gross Profit" },
    { key: "grossMargin", label: "Gross Margin %" },
    { key: "markdownPercent", label: "Markdown %" },
    { key: "averageOrderValue", label: "Avg Order Value" },
    { key: "avgItemsPerOrder", label: "Avg Items/Order" },
  ],
};

function employeeSummary(rows: SalesByEmployeeRow[]) {
  return {
    "Total Employees": rows.length,
    "Total Orders": rows.reduce((s, r) => s + (r.totalOrders || 0), 0),
    "Total Items Sold": rows.reduce((s, r) => s + (r.itemsSold || 0), 0),
    "Total Gross Sales": fmt(rows.reduce((s, r) => s + (r.grossSales || 0), 0)),
    "Total Gross Profit": fmt(rows.reduce((s, r) => s + (r.grossProfit || 0), 0)),
    "Total Discount": fmt(rows.reduce((s, r) => s + (r.totalDiscount || 0), 0)),
  };
}

function employeeHeaders(taxNames: string[]) {
  return ["Employee", "Total Orders", "Items Sold", "Gross Sales", "Total Discount", "Subtotal", "Total Cost", "Gross Profit", "Gross Margin %", "Markdown %", ...taxNames.map((n) => `Tax: ${n}`), "Avg Order Value", "Avg Items/Order"];
}

function employeeRow(r: SalesByEmployeeRow, taxNames: string[]) {
  return [
    r.createdEmployeeName || "-",
    r.totalOrders || 0,
    (r.itemsSold || 0).toFixed(2),
    fmt(r.grossSales),
    fmt(r.totalDiscount),
    fmt(r.subtotal),
    fmt(r.totalCost),
    fmt(r.grossProfit),
    pctFmt(r.grossMargin),
    pctFmt(r.markdownPercent),
    ...taxNames.map((n) => fmt(taxAmt(r, n))),
    fmt(r.averageOrderValue),
    (r.avgItemsPerOrder || 0).toFixed(2),
  ];
}

export function buildEmployeeHtml(data: SalesByEmployeeRow[], metadata: { storeName?: string; dateRange?: string }, settings: { hiddenSections: string[] }) {
  const hidden = settings?.hiddenSections || [];
  const taxNames = uniqueTaxNames(data);
  let html = `<div style="font-family:Arial,sans-serif;padding:20px;">${reportHeaderHtml("Sales by Employee Report", metadata)}`;
  if (!hidden.includes("Summary")) html += section("Summary", tableHtml(["Metric", "Value"], Object.entries(employeeSummary(data)).map(([k, v]) => [k, v as string | number])));
  if (!hidden.includes("Sales by Employee") && data.length) html += section("Sales by Employee", tableHtml(employeeHeaders(taxNames), data.map((r) => employeeRow(r, taxNames))));
  html += `</div>`;
  return html;
}

export function buildEmployeeExcelSheets(data: SalesByEmployeeRow[], settings: { hiddenSections: string[] }) {
  const hidden = settings?.hiddenSections || [];
  const taxNames = uniqueTaxNames(data);
  const sheets: { name: string; data: any[][] }[] = [];
  if (!hidden.includes("Summary")) sheets.push({ name: "Summary", data: [["Metric", "Value"], ...Object.entries(employeeSummary(data))] });
  if (!hidden.includes("Sales by Employee") && data.length) sheets.push({ name: "Sales by Employee", data: [employeeHeaders(taxNames), ...data.map((r) => employeeRow(r, taxNames))] });
  return sheets.length > 0 ? sheets : [{ name: "No Data", data: [["No data available"]] }];
}

export function exportEmployeeToCsv(data: SalesByEmployeeRow[], dateRangeLabel: string, filename: string) {
  const taxNames = uniqueTaxNames(data);
  let csv = `Sales by Employee Report\n${dateRangeLabel}\n\nSummary\n`;
  Object.entries(employeeSummary(data)).forEach(([k, v]) => (csv += `${csvEscape(k)},${csvEscape(v)}\n`));
  csv += `\nSales by Employee\n${employeeHeaders(taxNames).join(",")}\n`;
  data.forEach((r) => (csv += employeeRow(r, taxNames).map(csvEscape).join(",") + "\n"));
  downloadCsv(csv, filename);
}

/* ==================== Sales by Location ==================== */

export const LOCATION_SECTIONS = ["Summary", "Sales by Location"];

export const LOCATION_COLUMN_CONFIG: Record<string, PdfColumnConfig[]> = {
  "Sales by Location": [
    { key: "shopName", label: "Location Name" },
    { key: "itemsSold", label: "Items Sold" },
    { key: "grossSales", label: "Gross Sales" },
    { key: "totalDiscount", label: "Total Discount" },
    { key: "subtotal", label: "Subtotal" },
    { key: "totalCost", label: "Total Cost" },
    { key: "grossProfit", label: "Gross Profit" },
    { key: "grossMargin", label: "Gross Margin %" },
    { key: "markdownPercent", label: "Markdown %" },
    { key: "totalTax", label: "Total Tax" },
    { key: "transactionAvg", label: "Transaction Avg" },
    { key: "avgItemPerTransaction", label: "Avg Items/Transaction" },
    { key: "loyaltyRedemptions", label: "Loyalty Redemptions" },
    { key: "cash", label: "Cash" },
    { key: "debit", label: "Debit" },
  ],
};

function locationSummary(rows: SalesByLocationRow[]) {
  return {
    "Total Locations": rows.length,
    "Total Items Sold": rows.reduce((s, r) => s + (r.itemsSold || 0), 0),
    "Total Gross Sales": fmt(rows.reduce((s, r) => s + (r.grossSales || 0), 0)),
    "Total Gross Profit": fmt(rows.reduce((s, r) => s + (r.grossProfit || 0), 0)),
    "Total Cash": fmt(rows.reduce((s, r) => s + (r.cash || 0), 0)),
    "Total Debit": fmt(rows.reduce((s, r) => s + (r.debit || 0), 0)),
  };
}

function locationHeaders() {
  return ["Location Name", "Items Sold", "Gross Sales", "Total Discount", "Subtotal", "Total Cost", "Gross Profit", "Gross Margin %", "Markdown %", "Total Tax", "Transaction Avg", "Avg Items/Transaction", "Loyalty Redemptions", "Cash", "Debit"];
}

function locationRow(r: SalesByLocationRow) {
  return [
    r.shopName || r.shopId || "-",
    (r.itemsSold || 0).toFixed(2),
    fmt(r.grossSales),
    fmt(r.totalDiscount),
    fmt(r.subtotal),
    fmt(r.totalCost),
    fmt(r.grossProfit),
    pctFmt(r.grossMargin),
    pctFmt(r.markdownPercent),
    fmt(r.totalTax),
    fmt(r.transactionAvg),
    (r.avgItemPerTransaction || 0).toFixed(2),
    r.loyaltyRedemptions || 0,
    fmt(r.cash),
    fmt(r.debit),
  ];
}

export function buildLocationHtml(data: SalesByLocationRow[], metadata: { storeName?: string; dateRange?: string }, settings: { hiddenSections: string[] }) {
  const hidden = settings?.hiddenSections || [];
  let html = `<div style="font-family:Arial,sans-serif;padding:20px;">${reportHeaderHtml("Sales by Location Report", metadata)}`;
  if (!hidden.includes("Summary")) html += section("Summary", tableHtml(["Metric", "Value"], Object.entries(locationSummary(data)).map(([k, v]) => [k, v as string | number])));
  if (!hidden.includes("Sales by Location") && data.length) html += section("Sales by Location", tableHtml(locationHeaders(), data.map((r) => locationRow(r))));
  html += `</div>`;
  return html;
}

export function buildLocationExcelSheets(data: SalesByLocationRow[], settings: { hiddenSections: string[] }) {
  const hidden = settings?.hiddenSections || [];
  const sheets: { name: string; data: any[][] }[] = [];
  if (!hidden.includes("Summary")) sheets.push({ name: "Summary", data: [["Metric", "Value"], ...Object.entries(locationSummary(data))] });
  if (!hidden.includes("Sales by Location") && data.length) sheets.push({ name: "Sales by Location", data: [locationHeaders(), ...data.map((r) => locationRow(r))] });
  return sheets.length > 0 ? sheets : [{ name: "No Data", data: [["No data available"]] }];
}

export function exportLocationToCsv(data: SalesByLocationRow[], dateRangeLabel: string, filename: string) {
  let csv = `Sales by Location Report\n${dateRangeLabel}\n\nSummary\n`;
  Object.entries(locationSummary(data)).forEach(([k, v]) => (csv += `${csvEscape(k)},${csvEscape(v)}\n`));
  csv += `\nSales by Location\n${locationHeaders().join(",")}\n`;
  data.forEach((r) => (csv += locationRow(r).map(csvEscape).join(",") + "\n"));
  downloadCsv(csv, filename);
}

/* ==================== Sales by Product ==================== */

export const PRODUCT_SECTIONS = ["Summary", "Sales by Product"];

export const PRODUCT_COLUMN_CONFIG: Record<string, PdfColumnConfig[]> = {
  "Sales by Product": [
    { key: "productName", label: "Product Name" },
    { key: "productSKU", label: "SKU" },
    { key: "categoryName", label: "Category" },
    { key: "brandName", label: "Brand" },
    { key: "itemsSold", label: "Items Sold" },
    { key: "grossSales", label: "Gross Sales" },
    { key: "subtotal", label: "Subtotal" },
    { key: "totalCost", label: "Total Cost" },
    { key: "grossProfit", label: "Gross Profit" },
    { key: "totalDiscount", label: "Total Discount" },
    { key: "totalTax", label: "Total Tax" },
    { key: "grossMargin", label: "Gross Margin" },
    { key: "markdownPercent", label: "Markdown %" },
  ],
};

function productSummary(rows: SalesByProductRow[]) {
  return {
    "Total Products": rows.length,
    "Total Items Sold": rows.reduce((s, r) => s + (r.itemsSold || 0), 0),
    "Total Gross Sales": fmt(rows.reduce((s, r) => s + (r.grossSales || 0), 0)),
    "Total Gross Profit": fmt(rows.reduce((s, r) => s + (r.grossProfit || 0), 0)),
    "Total Discount": fmt(rows.reduce((s, r) => s + (r.totalDiscount || 0), 0)),
    "Total Tax": fmt(rows.reduce((s, r) => s + (r.totalTax || 0), 0)),
  };
}

function productHeaders(taxNames: string[]) {
  return ["Product Name", "SKU", "Category", "Brand", "Items Sold", "Gross Sales", "Subtotal", "Total Cost", "Gross Profit", "Total Discount", "Total Tax", "Gross Margin", "Markdown %", ...taxNames.map((n) => `Tax: ${n}`)];
}

function productRow(r: SalesByProductRow, taxNames: string[]) {
  return [
    r.productName || "-",
    r.productSKU || "-",
    r.categoryName || "-",
    r.brandName || "-",
    r.itemsSold || 0,
    fmt(r.grossSales),
    fmt(r.subtotal),
    fmt(r.totalCost),
    fmt(r.grossProfit),
    fmt(r.totalDiscount),
    fmt(r.totalTax),
    pctFmt(r.grossMargin),
    pctFmt(r.markdownPercent),
    ...taxNames.map((n) => fmt(taxAmt(r, n))),
  ];
}

export function buildProductHtml(data: SalesByProductRow[], metadata: { storeName?: string; dateRange?: string }, settings: { hiddenSections: string[] }) {
  const hidden = settings?.hiddenSections || [];
  const taxNames = uniqueTaxNames(data);
  let html = `<div style="font-family:Arial,sans-serif;padding:20px;">${reportHeaderHtml("Sales by Product Report", metadata)}`;
  if (!hidden.includes("Summary")) html += section("Summary", tableHtml(["Metric", "Value"], Object.entries(productSummary(data)).map(([k, v]) => [k, v as string | number])));
  if (!hidden.includes("Sales by Product") && data.length) html += section("Sales by Product", tableHtml(productHeaders(taxNames), data.map((r) => productRow(r, taxNames))));
  html += `</div>`;
  return html;
}

export function buildProductExcelSheets(data: SalesByProductRow[], settings: { hiddenSections: string[] }) {
  const hidden = settings?.hiddenSections || [];
  const taxNames = uniqueTaxNames(data);
  const sheets: { name: string; data: any[][] }[] = [];
  if (!hidden.includes("Summary")) sheets.push({ name: "Summary", data: [["Metric", "Value"], ...Object.entries(productSummary(data))] });
  if (!hidden.includes("Sales by Product") && data.length) sheets.push({ name: "Sales by Product", data: [productHeaders(taxNames), ...data.map((r) => productRow(r, taxNames))] });
  return sheets.length > 0 ? sheets : [{ name: "No Data", data: [["No data available"]] }];
}

export function exportProductToCsv(data: SalesByProductRow[], dateRangeLabel: string, filename: string) {
  const taxNames = uniqueTaxNames(data);
  let csv = `Sales by Product Report\n${dateRangeLabel}\n\nSummary\n`;
  Object.entries(productSummary(data)).forEach(([k, v]) => (csv += `${csvEscape(k)},${csvEscape(v)}\n`));
  csv += `\nSales by Product\n${productHeaders(taxNames).join(",")}\n`;
  data.forEach((r) => (csv += productRow(r, taxNames).map(csvEscape).join(",") + "\n"));
  downloadCsv(csv, filename);
}

/* ==================== Itemized Sales ==================== */

export const ITEMIZED_SECTIONS = ["Summary", "Itemized Sales"];

export const ITEMIZED_COLUMN_CONFIG: Record<string, PdfColumnConfig[]> = {
  "Itemized Sales": [
    { key: "dateOfSale", label: "Date of Sale" },
    { key: "timeOfSale", label: "Time of Sale" },
    { key: "productName", label: "Product Name" },
    { key: "categoryName", label: "Category" },
    { key: "brandName", label: "Brand" },
    { key: "packageName", label: "Package Name" },
    { key: "advertisedPackageId", label: "Package ID" },
    { key: "unitCost", label: "Unit Cost" },
    { key: "unitPrice", label: "Unit Price" },
    { key: "quantitySold", label: "Quantity" },
    { key: "unitOfMeasurement", label: "UOM" },
    { key: "totalCost", label: "Total Cost" },
    { key: "discountAmount", label: "Discount" },
    { key: "taxAmount", label: "Tax" },
    { key: "finalTotalPrice", label: "Final Total" },
    { key: "customerName", label: "Customer" },
    { key: "employeeName", label: "Employee" },
    { key: "deliveryMethod", label: "Delivery Method" },
    { key: "source", label: "Source" },
  ],
};

function itemizedSummary(rows: ItemizedSaleRow[]) {
  return {
    "Total Line Items": rows.length,
    "Total Quantity Sold": rows.reduce((s, r) => s + (r.quantitySold || 0), 0).toFixed(2),
    "Total Sales (Final)": fmt(rows.reduce((s, r) => s + (r.finalTotalPrice || 0), 0)),
    "Total Cost": fmt(rows.reduce((s, r) => s + (r.totalCost || 0), 0)),
    "Total Discount": fmt(rows.reduce((s, r) => s + (r.discountAmount || 0), 0)),
    "Total Tax": fmt(rows.reduce((s, r) => s + (r.taxAmount || 0), 0)),
  };
}

function itemizedHeaders() {
  return ["Date of Sale", "Time of Sale", "Product Name", "Category", "Brand", "Package Name", "Package ID", "Unit Cost", "Unit Price", "Quantity", "UOM", "Total Cost", "Discount", "Tax", "Final Total", "Customer", "Employee", "Delivery Method", "Source"];
}

function itemizedRow(r: ItemizedSaleRow) {
  return [
    r.timeOfSale ? format(new Date(r.timeOfSale), "yyyy-MM-dd") : "-",
    r.timeOfSale ? format(new Date(r.timeOfSale), "HH:mm:ss") : "-",
    r.productName || "-",
    r.categoryName || "-",
    r.brandName || "-",
    r.packageName || "-",
    r.advertisedPackageId || "-",
    fmt(r.unitCost),
    fmt(r.unitPrice),
    (r.quantitySold || 0).toFixed(2),
    r.unitOfMeasurement || "-",
    fmt(r.totalCost),
    fmt(r.discountAmount),
    fmt(r.taxAmount),
    fmt(r.finalTotalPrice),
    r.customerName || "-",
    r.employeeName || "-",
    r.deliveryMethod || "-",
    r.source || "-",
  ];
}

export function buildItemizedHtml(data: ItemizedSaleRow[], metadata: { storeName?: string; dateRange?: string }, settings: { hiddenSections: string[] }) {
  const hidden = settings?.hiddenSections || [];
  let html = `<div style="font-family:Arial,sans-serif;padding:20px;">${reportHeaderHtml("Itemized Sales Report", metadata)}`;
  if (!hidden.includes("Summary")) html += section("Summary", tableHtml(["Metric", "Value"], Object.entries(itemizedSummary(data)).map(([k, v]) => [k, v as string | number])));
  if (!hidden.includes("Itemized Sales") && data.length) html += section("Itemized Sales", tableHtml(itemizedHeaders(), data.map((r) => itemizedRow(r))));
  html += `</div>`;
  return html;
}

export function buildItemizedExcelSheets(data: ItemizedSaleRow[], settings: { hiddenSections: string[] }) {
  const hidden = settings?.hiddenSections || [];
  const sheets: { name: string; data: any[][] }[] = [];
  if (!hidden.includes("Summary")) sheets.push({ name: "Summary", data: [["Metric", "Value"], ...Object.entries(itemizedSummary(data))] });
  if (!hidden.includes("Itemized Sales") && data.length) sheets.push({ name: "Itemized Sales", data: [itemizedHeaders(), ...data.map((r) => itemizedRow(r))] });
  return sheets.length > 0 ? sheets : [{ name: "No Data", data: [["No data available"]] }];
}

export function exportItemizedToCsv(data: ItemizedSaleRow[], dateRangeLabel: string, filename: string) {
  let csv = `Itemized Sales Report\n${dateRangeLabel}\n\nSummary\n`;
  Object.entries(itemizedSummary(data)).forEach(([k, v]) => (csv += `${csvEscape(k)},${csvEscape(v)}\n`));
  csv += `\nItemized Sales\n${itemizedHeaders().join(",")}\n`;
  data.forEach((r) => (csv += itemizedRow(r).map(csvEscape).join(",") + "\n"));
  downloadCsv(csv, filename);
}

/* ==================== Sales Overview ==================== */

export const OVERVIEW_SECTIONS = ["Summary"];

export const OVERVIEW_COLUMN_CONFIG: Record<string, PdfColumnConfig[]> = {};

function statRow(label: string, s?: { marijuana?: number; nonMarijuana?: number; other?: number; total?: number }) {
  return [label, fmt(s?.marijuana), fmt(s?.nonMarijuana), fmt(s?.other), fmt(s?.total)];
}

export function buildOverviewHtml(data: any, metadata: { storeName?: string; dateRange?: string }) {
  const o = data?.overallStats || {};
  const html = `<div style="font-family:Arial,sans-serif;padding:20px;">${reportHeaderHtml("Sales Overview Report", metadata)}
    ${section(
      "Summary",
      tableHtml(
        ["Metric", "Marijuana", "Non-Marijuana", "Other", "Total"],
        [
          statRow("Gross Sales", o.grossSales),
          statRow("Discounts", o.discounts),
          statRow("Net Sales", o.netSales),
          statRow("Gross Profit", o.grossProfit),
          statRow("Cost of Goods", o.costOfGoods),
          statRow("Total (Tax Excluded)", o.totalWithoutTax),
          statRow("Total (Taxes Included)", o.totalFinalPayable),
          ["Total Number of Sales", "", "", "", String(o.totalNumberOfSales ?? 0)],
          ["Total Number of Returns", "", "", "", String(o.totalNumberOfSaleReturns ?? 0)],
          ["Total Items Sold", "", "", "", String(o.totalItemsSold ?? 0)],
        ],
      ),
    )}
  </div>`;
  return html;
}

function overviewSummaryRows(data: any) {
  const o = data?.overallStats || {};
  return [
    ["Metric", "Marijuana", "Non-Marijuana", "Other", "Total"],
    statRow("Gross Sales", o.grossSales),
    statRow("Discounts", o.discounts),
    statRow("Net Sales", o.netSales),
    statRow("Gross Profit", o.grossProfit),
    statRow("Cost of Goods", o.costOfGoods),
    statRow("Total (Tax Excluded)", o.totalWithoutTax),
    statRow("Total (Taxes Included)", o.totalFinalPayable),
    ["Total Number of Sales", "", "", "", String(o.totalNumberOfSales ?? 0)],
    ["Total Number of Returns", "", "", "", String(o.totalNumberOfSaleReturns ?? 0)],
    ["Total Items Sold", "", "", "", String(o.totalItemsSold ?? 0)],
  ];
}

export function buildOverviewExcelSheets(data: any) {
  return [{ name: "Summary", data: overviewSummaryRows(data) }];
}

export function exportOverviewToCsv(data: any, dateRangeLabel: string, filename: string) {
  const o = data?.overallStats || {};
  let csv = `Sales Overview Report\n${dateRangeLabel}\n\nMetric,Marijuana,Non-Marijuana,Other,Total\n`;
  [
    statRow("Gross Sales", o.grossSales),
    statRow("Discounts", o.discounts),
    statRow("Net Sales", o.netSales),
    statRow("Gross Profit", o.grossProfit),
    statRow("Cost of Goods", o.costOfGoods),
    statRow("Total (Tax Excluded)", o.totalWithoutTax),
    statRow("Total (Taxes Included)", o.totalFinalPayable),
  ].forEach((row) => (csv += row.map(csvEscape).join(",") + "\n"));
  csv += `${csvEscape("Total Number of Sales")},,,,${csvEscape(o.totalNumberOfSales ?? 0)}\n`;
  csv += `${csvEscape("Total Number of Returns")},,,,${csvEscape(o.totalNumberOfSaleReturns ?? 0)}\n`;
  csv += `${csvEscape("Total Items Sold")},,,,${csvEscape(o.totalItemsSold ?? 0)}\n`;
  downloadCsv(csv, filename);
}
