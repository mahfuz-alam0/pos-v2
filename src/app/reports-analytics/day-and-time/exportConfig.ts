import type { PdfColumnConfig } from "@/components/ui/pdf-export-drawer";
import type { DayAndTimeExportData } from "./types";

export const SECTIONS = ["Day of Week", "Hour of Day"];

export const EXCEL_COLUMN_CONFIG: Record<string, PdfColumnConfig[]> = {
  "Day of Week": [
    { key: "day", label: "Day" },
    { key: "revenue", label: "Revenue" },
    { key: "avgSales", label: "Avg Sales" },
    { key: "aov", label: "AOV" },
    { key: "orderCount", label: "Order Count" },
    { key: "avgProfit", label: "Avg Profit" },
  ],
  "Hour of Day": [
    { key: "hour", label: "Hour" },
    { key: "revenue", label: "Revenue" },
    { key: "orderCount", label: "Order Count" },
    { key: "avgProfit", label: "Avg Profit" },
    { key: "avgSales", label: "Avg Sales" },
    { key: "aov", label: "AOV" },
  ],
};

function fmt(v: any) {
  return `$${(Number(v) || 0).toFixed(2)}`;
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

interface ExportMetadata {
  dateRange: string;
}

export function buildDayAndTimeHtml(
  data: DayAndTimeExportData,
  metadata: ExportMetadata,
  settings: { hiddenSections: string[] },
) {
  const hidden = settings?.hiddenSections || [];
  const dateRange = metadata?.dateRange || "";
  let html = `<div style="font-family:Arial,sans-serif;padding:20px;">
    <div style="margin-bottom:20px;">
      <h2 style="font-size:20px;font-weight:700;color:#1e293b;margin:0;">Day & Time Report</h2>
      ${dateRange ? `<p style="color:#64748b;font-size:13px;margin:4px 0 0;">${dateRange}</p>` : ""}
    </div>`;

  if (!hidden.includes("Day of Week") && data.dayOfWeekData?.length) {
    const rows = data.dayOfWeekData.map((r) => [
      r.day,
      fmt(r.revenue),
      fmt(r.avgSales),
      fmt(r.aov),
      r.orderCount ?? 0,
      fmt(r.avgProfit),
    ]);
    html += section("Day of Week", tableHtml(["Day", "Revenue", "Avg Sales", "AOV", "Order Count", "Avg Profit"], rows));
  }

  if (!hidden.includes("Hour of Day") && data.hourOfDayData?.length) {
    const rows = data.hourOfDayData.map((r) => [
      r.hour,
      fmt(r.revenue),
      r.orderCount ?? 0,
      fmt(r.avgProfit),
      fmt(r.avgSales),
      fmt(r.aov),
    ]);
    html += section("Hour of Day", tableHtml(["Hour", "Revenue", "Order Count", "Avg Profit", "Avg Sales", "AOV"], rows));
  }

  html += `</div>`;
  return html;
}

export function buildDayAndTimeExcelSheets(data: DayAndTimeExportData, _metadata: ExportMetadata, settings: { hiddenSections: string[] }) {
  const hidden = settings?.hiddenSections || [];
  const sheets: { name: string; data: any[][] }[] = [];

  if (!hidden.includes("Day of Week") && data.dayOfWeekData?.length) {
    sheets.push({
      name: "Day of Week",
      data: [
        ["Day", "Revenue", "Avg Sales", "AOV", "Order Count", "Avg Profit"],
        ...data.dayOfWeekData.map((r) => [r.day, fmt(r.revenue), fmt(r.avgSales), fmt(r.aov), r.orderCount ?? 0, fmt(r.avgProfit)]),
      ],
    });
  }

  if (!hidden.includes("Hour of Day") && data.hourOfDayData?.length) {
    sheets.push({
      name: "Hour of Day",
      data: [
        ["Hour", "Revenue", "Order Count", "Avg Profit", "Avg Sales", "AOV"],
        ...data.hourOfDayData.map((r) => [r.hour, fmt(r.revenue), r.orderCount ?? 0, fmt(r.avgProfit), fmt(r.avgSales), fmt(r.aov)]),
      ],
    });
  }

  return sheets.length > 0 ? sheets : [{ name: "No Data", data: [["No data available"]] }];
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

export function exportDayAndTimeToCsv(data: DayAndTimeExportData, dateRangeLabel: string, filename: string) {
  const allSections = [
    {
      title: "Day of Week",
      headers: ["Day", "Revenue", "Avg Sales", "AOV", "Order Count", "Avg Profit"],
      rows: data.dayOfWeekData.map((r) => [r.day, fmt(r.revenue), fmt(r.avgSales), fmt(r.aov), r.orderCount ?? 0, fmt(r.avgProfit)]),
    },
    {
      title: "Hour of Day",
      headers: ["Hour", "Revenue", "Order Count", "Avg Profit", "Avg Sales", "AOV"],
      rows: data.hourOfDayData.map((r) => [r.hour, fmt(r.revenue), r.orderCount ?? 0, fmt(r.avgProfit), fmt(r.avgSales), fmt(r.aov)]),
    },
  ];

  let csv = `Day & Time Report\n${dateRangeLabel}\n\n`;
  allSections.forEach((sec) => {
    if (!sec.rows.length) return;
    csv += `${sec.title}\n`;
    csv += sec.headers.join(",") + "\n";
    sec.rows.forEach((row) => {
      csv += row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",") + "\n";
    });
    csv += "\n";
  });

  downloadCsv(csv, filename);
}
