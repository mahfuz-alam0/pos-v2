import { format } from "date-fns";
import type { PdfColumnConfig } from "@/components/ui/pdf-export-drawer";

export const NEW_CUSTOMERS_SECTIONS = ["Summary", "New Customers"];

export const NEW_CUSTOMERS_EXCEL_COLUMN_CONFIG: Record<string, PdfColumnConfig[]> = {
  "New Customers": [
    { key: "customerName", label: "Customer Name" },
    { key: "email", label: "Email" },
    { key: "phone", label: "Phone" },
    { key: "customerTypeName", label: "Customer Type" },
    { key: "customerGroupNames", label: "Customer Groups" },
    { key: "dob", label: "Date of Birth" },
    { key: "medicalId", label: "Medical ID" },
    { key: "createdAt", label: "Created Date & Time" },
    { key: "createdEmployee", label: "Created By" },
  ],
};

function groups(item: any) {
  if (!item?.customerGroupNames?.length) return "-";
  return Array.isArray(item.customerGroupNames) ? item.customerGroupNames.join(", ") : item.customerGroupNames;
}

const COLUMN_DEFS = [
  { key: "customerName", label: "Customer Name", getValue: (i: any) => i.customerName || "N/A" },
  { key: "email", label: "Email", getValue: (i: any) => i.email || "N/A" },
  { key: "phone", label: "Phone", getValue: (i: any) => i.phone || "N/A" },
  { key: "customerTypeName", label: "Customer Type", getValue: (i: any) => i.customerTypeName || "N/A" },
  { key: "customerGroupNames", label: "Customer Groups", getValue: groups },
  { key: "dob", label: "Date of Birth", getValue: (i: any) => (i.dob ? format(new Date(i.dob), "yyyy-MM-dd") : "N/A") },
  { key: "medicalId", label: "Medical ID", getValue: (i: any) => i.medicalId || "N/A" },
  { key: "createdAt", label: "Created Date & Time", getValue: (i: any) => (i.createdAt ? format(new Date(i.createdAt), "yyyy-MM-dd HH:mm:ss") : "N/A") },
  { key: "createdEmployee", label: "Created By", getValue: (i: any) => i.createdEmployee || "N/A" },
];

export function getNewCustomersSummary(data: any[], selectedDate: { startDate?: string; endDate?: string }) {
  return {
    "Total New Customers": (data || []).length,
    "Date Range":
      selectedDate?.startDate && selectedDate?.endDate
        ? `${format(new Date(selectedDate.startDate), "yyyy-MM-dd")} to ${format(new Date(selectedDate.endDate), "yyyy-MM-dd")}`
        : "All Time",
  };
}

export function buildNewCustomersHtml(
  data: any[],
  metadata: { storeName?: string; date?: string; selectedDate?: any },
  settings: { hiddenSections?: string[]; hiddenColumns?: Record<string, string[]> },
) {
  const hiddenSections = settings?.hiddenSections || [];
  const hiddenColumns = settings?.hiddenColumns || {};

  let html = `<div style="font-family: Arial, sans-serif; padding: 20px;">
    <div style="text-align: center; margin-bottom: 30px;">
      <h1 style="margin: 0; color: #333;">New Customers Report</h1>
      <p style="margin: 5px 0; color: #666;">${metadata?.storeName || "Store"}</p>
      <p style="margin: 5px 0; color: #666;">${metadata?.date || ""}</p>
    </div>`;

  if (!hiddenSections.includes("Summary")) {
    const summary = getNewCustomersSummary(data, metadata?.selectedDate || {});
    html += `<div style="margin-bottom: 30px;"><h2 style="color: #333; border-bottom: 2px solid #4CAF50; padding-bottom: 10px;">Summary</h2>
      <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">`;
    Object.entries(summary).forEach(([label, value]) => {
      html += `<tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">${label}</td><td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${value}</td></tr>`;
    });
    html += `</table></div>`;
  }

  if (!hiddenSections.includes("New Customers")) {
    const hiddenCols = hiddenColumns["New Customers"] || [];
    const visible = COLUMN_DEFS.filter((c) => !hiddenCols.includes(c.key));

    if (visible.length) {
      html += `<div style="margin-bottom: 30px;"><h2 style="color: #333; border-bottom: 2px solid #4CAF50; padding-bottom: 10px;">New Customers</h2>
        <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
        <thead><tr style="background-color: #4CAF50; color: white;">${visible.map((c) => `<th style="padding: 10px; border: 1px solid #ddd;">${c.label}</th>`).join("")}</tr></thead>
        <tbody>`;
      (data || []).forEach((item, i) => {
        html += `<tr style="background-color: ${i % 2 === 0 ? "#f9f9f9" : "white"};">`;
        visible.forEach((c) => {
          html += `<td style="padding: 8px; border: 1px solid #ddd; text-align: ${(c as any).align || "left"};">${c.getValue(item)}</td>`;
        });
        html += `</tr>`;
      });
      html += `</tbody></table></div>`;
    }
  }

  html += `</div>`;
  return html;
}

export function buildNewCustomersExcelSheets(
  data: any[],
  _metadata: unknown,
  settings: { hiddenSections?: string[]; hiddenColumns?: Record<string, string[]> },
) {
  const hiddenSections = settings?.hiddenSections || [];
  const hiddenColumns = settings?.hiddenColumns?.["New Customers"] || [];

  if (!data?.length) return [{ name: "New Customers", data: [["No data available"]] }];
  if (hiddenSections.includes("New Customers")) {
    return [{ name: "New Customers", data: [["No sections selected"]] }];
  }

  const visible = COLUMN_DEFS.filter((c) => !hiddenColumns.includes(c.key));
  if (!visible.length) return [{ name: "New Customers", data: [["No columns selected"]] }];

  return [
    {
      name: "New Customers",
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

export function exportNewCustomersToCsv(rows: any[], filename: string) {
  let csv = COLUMN_DEFS.map((c) => c.label).join(",") + "\n";
  rows.forEach((row) => {
    csv += COLUMN_DEFS.map((c) => `"${String(c.getValue(row)).replace(/"/g, '""')}"`).join(",") + "\n";
  });
  downloadCsv(csv, filename);
}
