import type { PdfColumnConfig } from "@/components/ui/pdf-export-drawer";
import type { TaxDetailRow, TaxDetailSummary, TaxExemptionRow } from "./types";

function fmt(v: any) {
  return `$${(Number(v) || 0).toFixed(2)}`;
}
function pct(v: any) {
  return v == null ? "N/A" : `${(Number(v) || 0).toFixed(2)}%`;
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
  return `
    <div style="margin-bottom:24px;">
      <h3 style="font-size:14px;font-weight:700;color:#1e293b;margin:0 0 8px 0;padding-bottom:6px;border-bottom:2px solid #e2e8f0;">${title}</h3>
      ${content}
    </div>`;
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

/* ---------------- Tax Details ---------------- */

export const TAX_DETAILS_SECTIONS = ["Summary", "Tax Details"];

function taxDetailsSummaryData(data: TaxDetailRow[], summary: TaxDetailSummary | null) {
  const totals = summary
    ? { totalSales: summary.totalSales || 0, totalTax: summary.totalTax || 0, totalQuantity: summary.totalQuantitySold || 0, transactionCount: summary.totalTransactions || 0 }
    : data.reduce(
        (acc, row) => {
          acc.totalSales += row.totalPrice || 0;
          acc.totalTax += row.totalTaxApplied || 0;
          acc.totalQuantity += row.quantitySold || 0;
          return acc;
        },
        { totalSales: 0, totalTax: 0, totalQuantity: 0, transactionCount: data.length },
      );
  return {
    "Total Sales": fmt(totals.totalSales),
    "Total Qty Sold": totals.totalQuantity.toLocaleString(),
    "Total Transactions": totals.transactionCount.toLocaleString(),
    "Total Tax Collected": fmt(totals.totalTax),
  };
}

function uniqueTaxNames(data: TaxDetailRow[]) {
  const names = new Set<string>();
  data.forEach((row) => row.taxes?.forEach((t) => t.name && names.add(t.name)));
  return Array.from(names).sort();
}

function taxDetailsColumns(data: TaxDetailRow[]) {
  const names = uniqueTaxNames(data);
  return [
    { key: "productName", label: "Product" },
    { key: "categoryName", label: "Category" },
    { key: "sku", label: "SKU" },
    { key: "purchaseUoMShortForm", label: "Unit" },
    { key: "advertisedSaleId", label: "Package ID" },
    { key: "brandName", label: "Brand" },
    { key: "supplierName", label: "Supplier" },
    { key: "supplierLicense", label: "Supplier License" },
    { key: "unitPrice", label: "Unit Price" },
    { key: "quantitySold", label: "Qty Sold" },
    { key: "totalPrice", label: "Total Price" },
    ...names.flatMap((n) => [
      { key: `tax_${n}`, label: `${n} Amount` },
      { key: `rate_${n}`, label: `${n} Rate` },
    ]),
    { key: "totalTaxApplied", label: "Total Tax" },
  ];
}

function taxDetailsRow(row: TaxDetailRow, names: string[]): (string | number)[] {
  return [
    row.productName || "-",
    row.categoryName || "-",
    row.sku || "-",
    row.purchaseUoMShortForm || "-",
    row.advertisedSaleId || "-",
    row.brandName || "-",
    row.supplierName || "-",
    row.supplierLicense || "-",
    fmt(row.unitPrice),
    row.quantitySold ?? 0,
    fmt(row.totalPrice),
    ...names.flatMap((n) => {
      const tax = row.taxes?.find((t) => t.name === n);
      return [fmt(tax?.amount || 0), pct(tax?.rate ?? null)];
    }),
    fmt(row.totalTaxApplied),
  ];
}

export const TAX_DETAILS_COLUMN_CONFIG: Record<string, PdfColumnConfig[]> = {
  Summary: [
    { key: "Total Sales", label: "Total Sales" },
    { key: "Total Qty Sold", label: "Total Qty Sold" },
    { key: "Total Transactions", label: "Total Transactions" },
    { key: "Total Tax Collected", label: "Total Tax Collected" },
  ],
  "Tax Details": [
    { key: "productName", label: "Product" },
    { key: "categoryName", label: "Category" },
    { key: "sku", label: "SKU" },
    { key: "brandName", label: "Brand" },
    { key: "unitPrice", label: "Unit Price" },
    { key: "quantitySold", label: "Qty Sold" },
    { key: "totalPrice", label: "Total Price" },
    { key: "totalTaxApplied", label: "Total Tax" },
  ],
};

interface TaxDetailsExportData {
  data: TaxDetailRow[];
  summary: TaxDetailSummary | null;
}

export function buildTaxDetailsHtml(exportData: TaxDetailsExportData, metadata: { dateRange: string }, settings: { hiddenSections: string[] }) {
  const hidden = settings?.hiddenSections || [];
  const { data, summary } = exportData;
  let html = `<div style="font-family:Arial,sans-serif;padding:20px;">
    <div style="margin-bottom:20px;">
      <h2 style="font-size:20px;font-weight:700;color:#1e293b;margin:0;">Tax Details Report</h2>
      ${metadata?.dateRange ? `<p style="color:#64748b;font-size:13px;margin:4px 0 0;">${metadata.dateRange}</p>` : ""}
    </div>`;

  if (!hidden.includes("Summary")) {
    const sumData = taxDetailsSummaryData(data, summary);
    html += section("Summary", tableHtml(["Metric", "Value"], Object.entries(sumData)));
  }

  if (!hidden.includes("Tax Details") && data.length) {
    const names = uniqueTaxNames(data);
    const cols = taxDetailsColumns(data);
    html += section("Tax Details", tableHtml(cols.map((c) => c.label), data.map((r) => taxDetailsRow(r, names))));
  }

  html += `</div>`;
  return html;
}

export function buildTaxDetailsExcelSheets(exportData: TaxDetailsExportData, settings: { hiddenSections: string[]; hiddenColumns?: Record<string, string[]> }) {
  const hidden = settings?.hiddenSections || [];
  const { data, summary } = exportData;
  const sheets: { name: string; data: any[][] }[] = [];

  if (!hidden.includes("Summary")) {
    const sumData = taxDetailsSummaryData(data, summary);
    sheets.push({ name: "Summary", data: Object.entries(sumData) });
  }

  if (!hidden.includes("Tax Details") && data.length) {
    const names = uniqueTaxNames(data);
    const hiddenCols = new Set(settings.hiddenColumns?.["Tax Details"] || []);
    const cols = taxDetailsColumns(data).filter((c) => !hiddenCols.has(c.key));
    const allCols = taxDetailsColumns(data);
    sheets.push({
      name: "Tax Details",
      data: [cols.map((c) => c.label), ...data.map((r) => {
        const fullRow = taxDetailsRow(r, names);
        return cols.map((c) => fullRow[allCols.findIndex((ac) => ac.key === c.key)]);
      })],
    });
  }

  return sheets.length > 0 ? sheets : [{ name: "No Data", data: [["No data available"]] }];
}

export function exportTaxDetailsToCsv(exportData: TaxDetailsExportData, dateRangeLabel: string, filename: string) {
  const { data, summary } = exportData;
  const names = uniqueTaxNames(data);
  const cols = taxDetailsColumns(data);
  let csv = `Tax Details Report\n${dateRangeLabel}\n\n`;

  csv += "Summary\n";
  Object.entries(taxDetailsSummaryData(data, summary)).forEach(([k, v]) => {
    csv += `${k},"${v}"\n`;
  });
  csv += "\n";

  if (data.length) {
    csv += "Tax Details\n";
    csv += cols.map((c) => c.label).join(",") + "\n";
    data.forEach((row) => {
      csv += taxDetailsRow(row, names).map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",") + "\n";
    });
  }

  downloadCsv(csv, filename);
}

/* ---------------- Tax Exemptions ---------------- */

export const TAX_EXEMPTIONS_SECTIONS = ["Summary", "Tax Exemptions"];

function taxExemptionsSummaryData(data: TaxExemptionRow[]) {
  const total = data.reduce((acc, row) => acc + (Number(row.taxAmountExempt) || 0), 0);
  return { "Total Amount Exempt": fmt(total) };
}

const TAX_EXEMPTIONS_COLUMNS: { key: keyof TaxExemptionRow | "date" | "time"; label: string }[] = [
  { key: "date", label: "Date of Sale" },
  { key: "time", label: "Time of Sale" },
  { key: "customerTypeName", label: "Customer Type" },
  { key: "taxType", label: "Tax Type" },
  { key: "exemptionReason", label: "Exemption Reason" },
  { key: "taxAmountExempt", label: "Amount Exempt" },
  { key: "employeeName", label: "Employee" },
  { key: "customerName", label: "Customer" },
  { key: "productName", label: "Product" },
];

function taxExemptionRowValues(row: TaxExemptionRow): (string | number)[] {
  const d = row.date ? new Date(row.date) : null;
  const dateStr = d ? d.toISOString().slice(0, 10) : "-";
  const timeStr = d ? d.toISOString().slice(11, 19) : "-";
  return [
    dateStr,
    timeStr,
    row.customerTypeName || "-",
    row.taxType || "-",
    row.exemptionReason || "-",
    fmt(row.taxAmountExempt),
    row.employeeName || "-",
    row.customerName || "-",
    row.productName || "-",
  ];
}

export const TAX_EXEMPTIONS_COLUMN_CONFIG: Record<string, PdfColumnConfig[]> = {
  Summary: [{ key: "Total Amount Exempt", label: "Total Amount Exempt" }],
  "Tax Exemptions": TAX_EXEMPTIONS_COLUMNS.map((c) => ({ key: c.key as string, label: c.label })),
};

export function buildTaxExemptionsHtml(data: TaxExemptionRow[], metadata: { dateRange: string }, settings: { hiddenSections: string[] }) {
  const hidden = settings?.hiddenSections || [];
  let html = `<div style="font-family:Arial,sans-serif;padding:20px;">
    <div style="margin-bottom:20px;">
      <h2 style="font-size:20px;font-weight:700;color:#1e293b;margin:0;">Tax Exemptions Report</h2>
      ${metadata?.dateRange ? `<p style="color:#64748b;font-size:13px;margin:4px 0 0;">${metadata.dateRange}</p>` : ""}
    </div>`;

  if (!hidden.includes("Summary")) {
    html += section("Summary", tableHtml(["Metric", "Value"], Object.entries(taxExemptionsSummaryData(data))));
  }

  if (!hidden.includes("Tax Exemptions") && data.length) {
    html += section("Tax Exemptions", tableHtml(TAX_EXEMPTIONS_COLUMNS.map((c) => c.label), data.map(taxExemptionRowValues)));
  }

  html += `</div>`;
  return html;
}

export function buildTaxExemptionsExcelSheets(data: TaxExemptionRow[], settings: { hiddenSections: string[]; hiddenColumns?: Record<string, string[]> }) {
  const hidden = settings?.hiddenSections || [];
  const sheets: { name: string; data: any[][] }[] = [];

  if (!hidden.includes("Summary")) {
    sheets.push({ name: "Summary", data: Object.entries(taxExemptionsSummaryData(data)) });
  }

  if (!hidden.includes("Tax Exemptions") && data.length) {
    const hiddenCols = new Set(settings.hiddenColumns?.["Tax Exemptions"] || []);
    const indices = TAX_EXEMPTIONS_COLUMNS.map((c, i) => ({ c, i })).filter(({ c }) => !hiddenCols.has(c.key as string));
    sheets.push({
      name: "Tax Exemptions",
      data: [indices.map(({ c }) => c.label), ...data.map((row) => {
        const full = taxExemptionRowValues(row);
        return indices.map(({ i }) => full[i]);
      })],
    });
  }

  return sheets.length > 0 ? sheets : [{ name: "No Data", data: [["No data available"]] }];
}

export function exportTaxExemptionsToCsv(data: TaxExemptionRow[], dateRangeLabel: string, filename: string) {
  let csv = `Tax Exemptions Report\n${dateRangeLabel}\n\n`;

  csv += "Summary\n";
  Object.entries(taxExemptionsSummaryData(data)).forEach(([k, v]) => {
    csv += `${k},"${v}"\n`;
  });
  csv += "\n";

  if (data.length) {
    csv += "Tax Exemptions\n";
    csv += TAX_EXEMPTIONS_COLUMNS.map((c) => c.label).join(",") + "\n";
    data.forEach((row) => {
      csv += taxExemptionRowValues(row).map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",") + "\n";
    });
  }

  downloadCsv(csv, filename);
}
