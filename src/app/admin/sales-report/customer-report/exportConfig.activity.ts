import { format } from "date-fns";
import type { PdfColumnConfig } from "@/components/ui/pdf-export-drawer";

export const ACTIVITY_SECTIONS = ["Summary", "Customer Activity List"];

export const ACTIVITY_EXCEL_COLUMN_CONFIG: Record<string, PdfColumnConfig[]> = {
  "Customer Activity List": [
    { key: "customerName", label: "Customer Name" },
    { key: "email", label: "Email" },
    { key: "phone", label: "Phone" },
    { key: "customerType", label: "Customer Type" },
    { key: "consumerTypes", label: "Customer Groups" },
    { key: "daysSinceLastVisit", label: "Days Since Last Visit" },
    { key: "daysVisited", label: "Times Visited" },
    { key: "averageSpent", label: "Average Spent" },
    { key: "lastVisitedAt", label: "Last Visit" },
    { key: "dateOfBirth", label: "Date of Birth" },
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
  if (!item?.consumerTypes?.length) return "-";
  return item.consumerTypes.map((t: string) => t.replace(/\s*\(MJ - System Generated\)/, "")).join(", ");
}

export function getActivitySummary(data: any[]) {
  const totals = (data || []).reduce(
    (acc, curr) => {
      acc.totalCustomers += 1;
      acc.totalDaysVisited += curr.daysVisited || 0;
      acc.totalAverageSpent += curr.averageSpent || 0;
      acc.avgDaysSinceLastVisit += curr.daysSinceLastVisit || 0;
      return acc;
    },
    { totalCustomers: 0, totalDaysVisited: 0, totalAverageSpent: 0, avgDaysSinceLastVisit: 0 },
  );

  const avgSpent = totals.totalCustomers > 0 ? totals.totalAverageSpent / totals.totalCustomers : 0;
  const avgDaysSinceVisit = totals.totalCustomers > 0 ? totals.avgDaysSinceLastVisit / totals.totalCustomers : 0;

  return {
    "Total Customers": totals.totalCustomers,
    "Total Days Visited": totals.totalDaysVisited,
    "Average Amount Spent": money(avgSpent),
    "Average Days Since Last Visit": `${avgDaysSinceVisit.toFixed(1)} days`,
  };
}

export function buildActivityHtml(
  data: any[],
  metadata: { storeName?: string; date?: string },
  settings: { hiddenSections?: string[]; hiddenColumns?: Record<string, string[]> },
) {
  const hiddenSections = settings?.hiddenSections || [];
  const hiddenColumns = settings?.hiddenColumns || {};

  let html = `<div style="font-family: Arial, sans-serif; padding: 20px;">
    <div style="text-align: center; margin-bottom: 30px;">
      <h1 style="margin: 0; color: #333;">Customer Activity List Report</h1>
      <p style="margin: 5px 0; color: #666;">${metadata?.storeName || "Store"}</p>
      <p style="margin: 5px 0; color: #666;">${metadata?.date || ""}</p>
    </div>`;

  if (!hiddenSections.includes("Summary")) {
    const summary = getActivitySummary(data);
    html += `<div style="margin-bottom: 30px;"><h2 style="color: #333; border-bottom: 2px solid #4CAF50; padding-bottom: 10px;">Summary</h2>
      <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">`;
    Object.entries(summary).forEach(([label, value]) => {
      html += `<tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">${label}</td><td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${value}</td></tr>`;
    });
    html += `</table></div>`;
  }

  if (!hiddenSections.includes("Customer Activity List")) {
    const columns = [
      { key: "customerName", label: "Customer Name", getValue: customerName },
      { key: "email", label: "Email", getValue: (i: any) => i.email || "" },
      { key: "phone", label: "Phone", getValue: (i: any) => i.phone || "" },
      { key: "customerType", label: "Customer Type", getValue: (i: any) => i.customerType || "N/A" },
      { key: "consumerTypes", label: "Customer Groups", getValue: groups },
      { key: "daysSinceLastVisit", label: "Days Since Last Visit", getValue: (i: any) => `${i.daysSinceLastVisit || 0} days`, align: "right" },
      { key: "daysVisited", label: "Times Visited", getValue: (i: any) => String(i.daysVisited || 0), align: "right" },
      { key: "averageSpent", label: "Average Spent", getValue: (i: any) => money(i.averageSpent), align: "right" },
      { key: "lastVisitedAt", label: "Last Visit", getValue: (i: any) => (i.lastVisitedAt ? format(new Date(i.lastVisitedAt), "yyyy-MM-dd HH:mm") : "Never") },
      { key: "dateOfBirth", label: "Date of Birth", getValue: (i: any) => (i.dateOfBirth ? format(new Date(i.dateOfBirth), "yyyy-MM-dd") : "N/A") },
    ];
    const hiddenCols = hiddenColumns["Customer Activity List"] || [];
    const visible = columns.filter((c) => !hiddenCols.includes(c.key));

    if (visible.length) {
      html += `<div style="margin-bottom: 30px;"><h2 style="color: #333; border-bottom: 2px solid #4CAF50; padding-bottom: 10px;">Customer Activity List</h2>
        <table style="width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 10px;">
        <thead><tr style="background-color: #4CAF50; color: white;">${visible.map((c) => `<th style="padding: 8px; border: 1px solid #ddd;">${c.label}</th>`).join("")}</tr></thead>
        <tbody>`;
      (data || []).forEach((item, i) => {
        html += `<tr style="background-color: ${i % 2 === 0 ? "#f9f9f9" : "white"};">`;
        visible.forEach((c) => {
          html += `<td style="padding: 6px; border: 1px solid #ddd; text-align: ${c.align || "left"};">${c.getValue(item)}</td>`;
        });
        html += `</tr>`;
      });
      html += `</tbody></table></div>`;
    }
  }

  html += `</div>`;
  return html;
}

export function buildActivityExcelSheets(
  data: any[],
  _metadata: unknown,
  settings: { hiddenSections?: string[]; hiddenColumns?: Record<string, string[]> },
) {
  const hiddenSections = settings?.hiddenSections || [];
  const hiddenColumns = settings?.hiddenColumns?.["Customer Activity List"] || [];

  if (!data?.length) return [{ name: "Customer Activity List", data: [["No data available"]] }];
  if (hiddenSections.includes("Customer Activity List")) {
    return [{ name: "Customer Activity List", data: [["No sections selected"]] }];
  }

  const allColumns = [
    { key: "customerName", label: "Customer Name", getValue: customerName },
    { key: "email", label: "Email", getValue: (i: any) => i.email || "-" },
    { key: "phone", label: "Phone", getValue: (i: any) => i.phone || "-" },
    { key: "customerType", label: "Customer Type", getValue: (i: any) => i.customerType || "N/A" },
    { key: "consumerTypes", label: "Customer Groups", getValue: groups },
    { key: "daysSinceLastVisit", label: "Days Since Last Visit", getValue: (i: any) => `${i.daysSinceLastVisit || 0} days` },
    { key: "daysVisited", label: "Times Visited", getValue: (i: any) => String(i.daysVisited || 0) },
    { key: "averageSpent", label: "Average Spent", getValue: (i: any) => money(i.averageSpent) },
    { key: "lastVisitedAt", label: "Last Visit", getValue: (i: any) => (i.lastVisitedAt ? format(new Date(i.lastVisitedAt), "yyyy-MM-dd HH:mm") : "Never") },
    { key: "dateOfBirth", label: "Date of Birth", getValue: (i: any) => (i.dateOfBirth ? format(new Date(i.dateOfBirth), "yyyy-MM-dd") : "N/A") },
  ];
  const visible = allColumns.filter((c) => !hiddenColumns.includes(c.key));
  if (!visible.length) return [{ name: "Customer Activity List", data: [["No columns selected"]] }];

  return [
    {
      name: "Customer Activity List",
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

export function exportActivityToCsv(rows: any[], filename: string) {
  const columns = ACTIVITY_EXCEL_COLUMN_CONFIG["Customer Activity List"];
  const getters: Record<string, (i: any) => any> = {
    customerName,
    email: (i) => i.email || "N/A",
    phone: (i) => i.phone || "N/A",
    customerType: (i) => i.customerType || "N/A",
    consumerTypes: groups,
    daysSinceLastVisit: (i) => `${i.daysSinceLastVisit || 0} days`,
    daysVisited: (i) => i.daysVisited || 0,
    averageSpent: (i) => money(i.averageSpent),
    lastVisitedAt: (i) => (i.lastVisitedAt ? format(new Date(i.lastVisitedAt), "yyyy-MM-dd HH:mm") : "Never"),
    dateOfBirth: (i) => (i.dateOfBirth ? format(new Date(i.dateOfBirth), "yyyy-MM-dd") : "N/A"),
  };

  let csv = columns.map((c) => c.label).join(",") + "\n";
  rows.forEach((row) => {
    csv += columns.map((c) => `"${String(getters[c.key](row)).replace(/"/g, '""')}"`).join(",") + "\n";
  });
  downloadCsv(csv, filename);
}
