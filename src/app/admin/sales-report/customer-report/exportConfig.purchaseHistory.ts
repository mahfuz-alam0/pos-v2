import { format } from "date-fns";
import type { PdfColumnConfig } from "@/components/ui/pdf-export-drawer";

export const PURCHASE_HISTORY_SECTIONS = ["Summary", "Customer Purchase History"];

export const PURCHASE_HISTORY_EXCEL_COLUMN_CONFIG: Record<string, PdfColumnConfig[]> = {
  "Customer Purchase History": [
    { key: "shopName", label: "Store" },
    { key: "customer", label: "Customer" },
    { key: "email", label: "Email" },
    { key: "phone", label: "Phone" },
    { key: "customerType", label: "Customer Type" },
    { key: "groups", label: "Customer Groups" },
    { key: "medicalLicense", label: "Medical License" },
    { key: "dateOfBirth", label: "Date of Birth" },
    { key: "categoryName", label: "Category" },
    { key: "productName", label: "Product Name" },
    { key: "SKU", label: "SKU" },
    { key: "unit", label: "Unit" },
    { key: "quantity", label: "Quantity" },
    { key: "saleAmount", label: "Sale Amount" },
    { key: "totalNetWeight", label: "Total Net Weight" },
    { key: "delivery", label: "Delivery" },
    { key: "dateOfPurchase", label: "Date of Purchase" },
  ],
};

function money(v: any) {
  const n = Number(v);
  return `$${Number.isFinite(n) ? n.toFixed(2) : "0.00"}`;
}

function customerName(item: any) {
  return `${item?.firstName || ""} ${item?.lastName || ""}`.trim() || "N/A";
}

function groups(item: any) {
  if (!Array.isArray(item?.groups)) return "-";
  return item.groups
    .map((g: string) => (g.includes("(MJ - System Generated)") ? g.split("(")[0].trim() : g))
    .join(", ");
}

export function getPurchaseHistorySummary(data: any[], selectedDate: { startDate?: string; endDate?: string }) {
  const totals = (data || []).reduce(
    (acc, curr) => {
      acc.totalQuantity += curr.quantity || 0;
      acc.totalAmount += curr.saleAmount || 0;
      acc.totalCustomers += 1;
      return acc;
    },
    { totalQuantity: 0, totalAmount: 0, totalCustomers: 0 },
  );

  return {
    "Total Customers": totals.totalCustomers,
    "Total Quantity Purchased": totals.totalQuantity,
    "Total Purchase Amount": money(totals.totalAmount),
    "Date Range":
      selectedDate?.startDate && selectedDate?.endDate
        ? `${format(new Date(selectedDate.startDate), "yyyy-MM-dd")} to ${format(new Date(selectedDate.endDate), "yyyy-MM-dd")}`
        : "All Time",
  };
}

const COLUMN_DEFS = [
  { key: "shopName", label: "Store", getValue: (i: any) => i.shopName || "-" },
  { key: "customer", label: "Customer", getValue: customerName },
  { key: "email", label: "Email", getValue: (i: any) => i.email || "" },
  { key: "phone", label: "Phone", getValue: (i: any) => i.phone || "" },
  { key: "customerType", label: "Customer Type", getValue: (i: any) => i.customerType || "" },
  { key: "groups", label: "Customer Groups", getValue: groups },
  { key: "medicalLicense", label: "Medical License", getValue: (i: any) => i.medicalLicense || "" },
  { key: "dateOfBirth", label: "Date of Birth", getValue: (i: any) => (i.dateOfBirth ? format(new Date(i.dateOfBirth), "yyyy-MM-dd") : "N/A") },
  { key: "categoryName", label: "Category", getValue: (i: any) => i.categoryName || "" },
  { key: "productName", label: "Product Name", getValue: (i: any) => i.productName || "" },
  { key: "SKU", label: "SKU", getValue: (i: any) => i.SKU || "" },
  { key: "unit", label: "Unit", getValue: (i: any) => i.unit || "" },
  { key: "quantity", label: "Quantity", getValue: (i: any) => String(i.quantity || 0), align: "right" },
  { key: "saleAmount", label: "Sale Amount", getValue: (i: any) => money(i.saleAmount), align: "right" },
  { key: "totalNetWeight", label: "Total Net Weight", getValue: (i: any) => i.totalNetWeight ?? 0 },
  { key: "delivery", label: "Delivery", getValue: (i: any) => i.delivery || "" },
  { key: "dateOfPurchase", label: "Date of Purchase", getValue: (i: any) => (i.dateOfPurchase ? format(new Date(i.dateOfPurchase), "yyyy-MM-dd HH:mm:ss") : "N/A") },
];

export function buildPurchaseHistoryHtml(
  data: any[],
  metadata: { storeName?: string; date?: string; selectedDate?: any },
  settings: { hiddenSections?: string[]; hiddenColumns?: Record<string, string[]> },
) {
  const hiddenSections = settings?.hiddenSections || [];
  const hiddenColumns = settings?.hiddenColumns || {};

  let html = `<div style="font-family: Arial, sans-serif; padding: 20px;">
    <div style="text-align: center; margin-bottom: 30px;">
      <h1 style="margin: 0; color: #333;">Customer Purchase History Report</h1>
      <p style="margin: 5px 0; color: #666;">${metadata?.storeName || "Store"}</p>
      <p style="margin: 5px 0; color: #666;">${metadata?.date || ""}</p>
    </div>`;

  if (!hiddenSections.includes("Summary")) {
    const summary = getPurchaseHistorySummary(data, metadata?.selectedDate || {});
    html += `<div style="margin-bottom: 30px;"><h2 style="color: #333; border-bottom: 2px solid #4CAF50; padding-bottom: 10px;">Summary</h2>
      <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">`;
    Object.entries(summary).forEach(([label, value]) => {
      html += `<tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">${label}</td><td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${value}</td></tr>`;
    });
    html += `</table></div>`;
  }

  if (!hiddenSections.includes("Customer Purchase History")) {
    const hiddenCols = hiddenColumns["Customer Purchase History"] || [];
    const visible = COLUMN_DEFS.filter((c) => !hiddenCols.includes(c.key));

    if (visible.length) {
      html += `<div style="margin-bottom: 30px;"><h2 style="color: #333; border-bottom: 2px solid #4CAF50; padding-bottom: 10px;">Customer Purchase History</h2>
        <table style="width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 9px;">
        <thead><tr style="background-color: #4CAF50; color: white;">${visible.map((c) => `<th style="padding: 6px; border: 1px solid #ddd;">${c.label}</th>`).join("")}</tr></thead>
        <tbody>`;
      (data || []).forEach((item, i) => {
        html += `<tr style="background-color: ${i % 2 === 0 ? "#f9f9f9" : "white"};">`;
        visible.forEach((c) => {
          html += `<td style="padding: 5px; border: 1px solid #ddd; text-align: ${(c as any).align || "left"};">${c.getValue(item)}</td>`;
        });
        html += `</tr>`;
      });
      html += `</tbody></table></div>`;
    }
  }

  html += `</div>`;
  return html;
}

export function buildPurchaseHistoryExcelSheets(
  data: any[],
  _metadata: unknown,
  settings: { hiddenSections?: string[]; hiddenColumns?: Record<string, string[]> },
) {
  const hiddenSections = settings?.hiddenSections || [];
  const hiddenColumns = settings?.hiddenColumns?.["Customer Purchase History"] || [];

  if (!data?.length) return [{ name: "Customer Purchase History", data: [["No data available"]] }];
  if (hiddenSections.includes("Customer Purchase History")) {
    return [{ name: "Customer Purchase History", data: [["No sections selected"]] }];
  }

  const visible = COLUMN_DEFS.filter((c) => !hiddenColumns.includes(c.key));
  if (!visible.length) return [{ name: "Customer Purchase History", data: [["No columns selected"]] }];

  return [
    {
      name: "Customer Purchase History",
      data: [visible.map((c) => c.label), ...data.map((item) => visible.map((c) => c.getValue(item)))],
    },
  ];
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

export function exportPurchaseHistoryToCsv(rows: any[], filename: string) {
  let csv = COLUMN_DEFS.map((c) => c.label).join(",") + "\n";
  rows.forEach((row) => {
    csv += COLUMN_DEFS.map((c) => `"${String(c.getValue(row)).replace(/"/g, '""')}"`).join(",") + "\n";
  });
  downloadCsv(csv, filename);
}
