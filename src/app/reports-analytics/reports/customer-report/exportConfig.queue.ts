import { format } from "date-fns";
import type { PdfColumnConfig } from "@/components/ui/pdf-export-drawer";

export const QUEUE_SECTIONS = ["Summary", "Customer Queue"];

export const QUEUE_EXCEL_COLUMN_CONFIG: Record<string, PdfColumnConfig[]> = {
  "Customer Queue": [
    { key: "firstName", label: "First Name" },
    { key: "lastName", label: "Last Name" },
    { key: "enqueued", label: "Enqueued" },
    { key: "dequeued", label: "Dequeued" },
    { key: "isOrderPlaced", label: "Order Placed" },
    { key: "queuedInSeconds", label: "Queued (Seconds)" },
  ],
};

function dt(v: any) {
  return v ? format(new Date(v), "yyyy-MM-dd HH:mm:ss") : "N/A";
}

function orderPlacedLabel(v: any) {
  return v === undefined || v === null ? "N/A" : v ? "Yes" : "No";
}

const COLUMN_DEFS = [
  { key: "firstName", label: "First Name", getValue: (i: any) => i.firstName || "-" },
  { key: "lastName", label: "Last Name", getValue: (i: any) => i.lastName || "-" },
  { key: "enqueued", label: "Enqueued", getValue: (i: any) => dt(i.enqueued) },
  { key: "dequeued", label: "Dequeued", getValue: (i: any) => dt(i.dequeued) },
  { key: "isOrderPlaced", label: "Order Placed", getValue: (i: any) => orderPlacedLabel(i.isOrderPlaced) },
  { key: "queuedInSeconds", label: "Queued (Seconds)", getValue: (i: any) => (i.queuedInSeconds || 0).toFixed(2), align: "right" },
];

export function getQueueSummary(data: any[], selectedDate: { startDate?: string; endDate?: string }) {
  const totals = (data || []).reduce(
    (acc, curr) => {
      acc.totalCustomers += 1;
      acc.totalQueueTime += curr.queuedInSeconds || 0;
      acc.maxQueueTime = Math.max(acc.maxQueueTime || 0, curr.queuedInSeconds || 0);
      return acc;
    },
    { totalCustomers: 0, totalQueueTime: 0, maxQueueTime: 0 },
  );
  const avgQueueTime = totals.totalCustomers > 0 ? (totals.totalQueueTime / totals.totalCustomers).toFixed(2) : "0";

  return {
    "Total Customers": totals.totalCustomers,
    "Total Customers in Queue": totals.totalCustomers,
    "Average Queue Time": `${avgQueueTime} seconds`,
    "Max Queue Time": `${totals.maxQueueTime.toFixed(2)} seconds`,
    "Date Range":
      selectedDate?.startDate && selectedDate?.endDate
        ? `${format(new Date(selectedDate.startDate), "yyyy-MM-dd")} to ${format(new Date(selectedDate.endDate), "yyyy-MM-dd")}`
        : "All Time",
  };
}

export function buildQueueHtml(
  data: any[],
  metadata: { storeName?: string; date?: string; selectedDate?: any },
  settings: { hiddenSections?: string[]; hiddenColumns?: Record<string, string[]> },
) {
  const hiddenSections = settings?.hiddenSections || [];
  const hiddenColumns = settings?.hiddenColumns || {};

  let html = `<div style="font-family: Arial, sans-serif; padding: 20px;">
    <div style="text-align: center; margin-bottom: 30px;">
      <h1 style="margin: 0; color: #333;">Customer Queue Report</h1>
      <p style="margin: 5px 0; color: #666;">${metadata?.storeName || "Store"}</p>
      <p style="margin: 5px 0; color: #666;">${metadata?.date || ""}</p>
    </div>`;

  if (!hiddenSections.includes("Summary")) {
    const summary = getQueueSummary(data, metadata?.selectedDate || {});
    html += `<div style="margin-bottom: 30px;"><h2 style="color: #333; border-bottom: 2px solid #4CAF50; padding-bottom: 10px;">Summary</h2>
      <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">`;
    Object.entries(summary).forEach(([label, value]) => {
      html += `<tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">${label}</td><td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${value}</td></tr>`;
    });
    html += `</table></div>`;
  }

  if (!hiddenSections.includes("Customer Queue")) {
    const hiddenCols = hiddenColumns["Customer Queue"] || [];
    const visible = COLUMN_DEFS.filter((c) => !hiddenCols.includes(c.key));

    if (visible.length) {
      html += `<div style="margin-bottom: 30px;"><h2 style="color: #333; border-bottom: 2px solid #4CAF50; padding-bottom: 10px;">Customer Queue</h2>
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

export function buildQueueExcelSheets(
  data: any[],
  _metadata: unknown,
  settings: { hiddenSections?: string[]; hiddenColumns?: Record<string, string[]> },
) {
  const hiddenSections = settings?.hiddenSections || [];
  const hiddenColumns = settings?.hiddenColumns?.["Customer Queue"] || [];

  if (!data?.length) return [{ name: "Customer Queue", data: [["No data available"]] }];
  if (hiddenSections.includes("Customer Queue")) {
    return [{ name: "Customer Queue", data: [["No sections selected"]] }];
  }

  const visible = COLUMN_DEFS.filter((c) => !hiddenColumns.includes(c.key));
  if (!visible.length) return [{ name: "Customer Queue", data: [["No columns selected"]] }];

  return [
    {
      name: "Customer Queue",
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

export function exportQueueToCsv(rows: any[], filename: string) {
  let csv = COLUMN_DEFS.map((c) => c.label).join(",") + "\n";
  rows.forEach((row) => {
    csv += COLUMN_DEFS.map((c) => `"${String(c.getValue(row)).replace(/"/g, '""')}"`).join(",") + "\n";
  });
  downloadCsv(csv, filename);
}
