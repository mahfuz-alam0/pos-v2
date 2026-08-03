import { format } from "date-fns";
import type { PdfColumnConfig } from "@/components/ui/pdf-export-drawer";
import type { LoyaltyAdjustmentRow, LoyaltyRedemptionRow } from "./types";

function money(v: any) {
  const n = Number(v);
  return `$${Number.isFinite(n) ? n.toFixed(2) : "0.00"}`;
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

/* ---------------- Loyalty Adjustments ---------------- */

export const ADJUSTMENTS_SECTIONS = ["Summary", "Loyalty Adjustments"];

export const ADJUSTMENTS_EXCEL_COLUMN_CONFIG: Record<string, PdfColumnConfig[]> = {
  "Loyalty Adjustments": [
    { key: "date", label: "Date" },
    { key: "addRemove", label: "Add/Remove" },
    { key: "pointAmount", label: "Point Amount" },
    { key: "employee", label: "Employee" },
    { key: "customer", label: "Customer" },
    { key: "reason", label: "Reason" },
  ],
};

function adjustmentCols() {
  return [
    { key: "date", label: "Date", getValue: (i: LoyaltyAdjustmentRow) => format(new Date(i.date), "yyyy-MM-dd HH:mm:ss") },
    { key: "addRemove", label: "Add/Remove", getValue: (i: LoyaltyAdjustmentRow) => (i.action === "add" ? "Add" : "Remove") },
    { key: "pointAmount", label: "Point Amount", getValue: (i: LoyaltyAdjustmentRow) => String(i.points ?? 0) },
    { key: "employee", label: "Employee", getValue: (i: LoyaltyAdjustmentRow) => i.employeeName || "" },
    { key: "customer", label: "Customer", getValue: (i: LoyaltyAdjustmentRow) => i.customerName || "" },
    { key: "reason", label: "Reason", getValue: (i: LoyaltyAdjustmentRow) => i.reason || "" },
  ];
}

export function getAdjustmentsSummary(data: LoyaltyAdjustmentRow[]) {
  const totalPoints = (data || []).reduce((sum, item) => sum + (item.action === "add" ? item.points : -item.points), 0);
  return {
    "Total Points": totalPoints,
    "Total Adjustments": data?.length || 0,
  };
}

export function buildAdjustmentsHtml(
  data: LoyaltyAdjustmentRow[],
  metadata: { storeName?: string; date?: string; dateRange?: string },
  settings: { hiddenSections?: string[]; hiddenColumns?: Record<string, string[]> },
) {
  const hiddenSections = settings?.hiddenSections || [];
  const hiddenColumns = settings?.hiddenColumns || {};

  let html = `<div style="font-family: Arial, sans-serif; padding: 20px;">
    <div style="text-align: center; margin-bottom: 30px;">
      <h1 style="margin: 0; color: #333;">Loyalty Adjustments Report</h1>
      <p style="margin: 5px 0; color: #666;">${metadata?.storeName || "Store"}</p>
      <p style="margin: 5px 0; color: #666;">${metadata?.dateRange || metadata?.date || ""}</p>
    </div>`;

  if (!hiddenSections.includes("Summary")) {
    const summary = getAdjustmentsSummary(data);
    html += `<div style="margin-bottom: 30px;"><h2 style="color: #333; border-bottom: 2px solid #4CAF50; padding-bottom: 10px;">Summary</h2>
      <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">`;
    Object.entries(summary).forEach(([label, value]) => {
      html += `<tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">${label}</td><td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${value}</td></tr>`;
    });
    html += `</table></div>`;
  }

  if (!hiddenSections.includes("Loyalty Adjustments")) {
    const columns = adjustmentCols();
    const hiddenCols = hiddenColumns["Loyalty Adjustments"] || [];
    const visible = columns.filter((c) => !hiddenCols.includes(c.key));

    if (visible.length) {
      html += `<div style="margin-bottom: 30px;"><h2 style="color: #333; border-bottom: 2px solid #4CAF50; padding-bottom: 10px;">Loyalty Adjustments</h2>
        <table style="width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 10px;">
        <thead><tr style="background-color: #4CAF50; color: white;">${visible.map((c) => `<th style="padding: 8px; border: 1px solid #ddd;">${c.label}</th>`).join("")}</tr></thead>
        <tbody>`;
      (data || []).forEach((item, i) => {
        html += `<tr style="background-color: ${i % 2 === 0 ? "#f9f9f9" : "white"};">`;
        visible.forEach((c) => {
          html += `<td style="padding: 6px; border: 1px solid #ddd;">${c.getValue(item)}</td>`;
        });
        html += `</tr>`;
      });
      html += `</tbody></table></div>`;
    }
  }

  html += `</div>`;
  return html;
}

export function buildAdjustmentsExcelSheets(
  data: LoyaltyAdjustmentRow[],
  _metadata: unknown,
  settings: { hiddenSections?: string[]; hiddenColumns?: Record<string, string[]> },
) {
  const hiddenSections = settings?.hiddenSections || [];
  const hiddenColumns = settings?.hiddenColumns?.["Loyalty Adjustments"] || [];

  if (!data?.length) return [{ name: "Loyalty Adjustments", data: [["No data available"]] }];
  if (hiddenSections.includes("Loyalty Adjustments")) {
    return [{ name: "Loyalty Adjustments", data: [["No sections selected"]] }];
  }

  const columns = adjustmentCols();
  const visible = columns.filter((c) => !hiddenColumns.includes(c.key));
  if (!visible.length) return [{ name: "Loyalty Adjustments", data: [["No columns selected"]] }];

  return [
    {
      name: "Loyalty Adjustments",
      data: [visible.map((c) => c.label), ...data.map((item) => visible.map((c) => c.getValue(item)))],
    },
  ];
}

export function exportAdjustmentsToCsv(rows: LoyaltyAdjustmentRow[], filename: string) {
  const columns = adjustmentCols();
  let csv = columns.map((c) => c.label).join(",") + "\n";
  rows.forEach((row) => {
    csv += columns.map((c) => `"${String(c.getValue(row)).replace(/"/g, '""')}"`).join(",") + "\n";
  });
  downloadCsv(csv, filename);
}

/* ---------------- Loyalty Redemption Values ---------------- */

export const REDEMPTION_SECTIONS = ["Summary", "Loyalty Redemption Values"];

export const REDEMPTION_EXCEL_COLUMN_CONFIG: Record<string, PdfColumnConfig[]> = {
  "Loyalty Redemption Values": [
    { key: "day", label: "Day" },
    { key: "location", label: "Location" },
    { key: "discountAmount", label: "Discount Amount" },
    { key: "discountRateType", label: "Discount Rate Type" },
    { key: "notes", label: "Notes" },
  ],
};

function redemptionCols() {
  return [
    { key: "day", label: "Day", getValue: (i: LoyaltyRedemptionRow) => (i.createdAt ? format(new Date(i.createdAt), "yyyy-MM-dd") : "N/A") },
    { key: "location", label: "Location", getValue: (i: LoyaltyRedemptionRow) => (typeof i.shopId === "object" ? i.shopId?.name : i.shopId) || "N/A" },
    { key: "discountAmount", label: "Discount Amount", getValue: (i: LoyaltyRedemptionRow) => money(i.discountAmount) },
    { key: "discountRateType", label: "Discount Rate Type", getValue: (i: LoyaltyRedemptionRow) => i.discountRateType || "N/A" },
    { key: "notes", label: "Notes", getValue: (i: LoyaltyRedemptionRow) => i.notes || "-" },
  ];
}

export function getRedemptionSummary(data: LoyaltyRedemptionRow[]) {
  const totalDiscountAmount = (data || []).reduce((sum, item) => sum + (Number(item.discountAmount) || 0), 0);
  return {
    "Total Discount Amount": money(totalDiscountAmount),
    "Total Redemptions": data?.length || 0,
  };
}

export function buildRedemptionHtml(
  data: LoyaltyRedemptionRow[],
  metadata: { storeName?: string; date?: string; dateRange?: string },
  settings: { hiddenSections?: string[]; hiddenColumns?: Record<string, string[]> },
) {
  const hiddenSections = settings?.hiddenSections || [];
  const hiddenColumns = settings?.hiddenColumns || {};

  let html = `<div style="font-family: Arial, sans-serif; padding: 20px;">
    <div style="text-align: center; margin-bottom: 30px;">
      <h1 style="margin: 0; color: #333;">Loyalty Redemption Values Report</h1>
      <p style="margin: 5px 0; color: #666;">${metadata?.storeName || "Store"}</p>
      <p style="margin: 5px 0; color: #666;">${metadata?.dateRange || metadata?.date || ""}</p>
    </div>`;

  if (!hiddenSections.includes("Summary")) {
    const summary = getRedemptionSummary(data);
    html += `<div style="margin-bottom: 30px;"><h2 style="color: #333; border-bottom: 2px solid #4CAF50; padding-bottom: 10px;">Summary</h2>
      <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">`;
    Object.entries(summary).forEach(([label, value]) => {
      html += `<tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">${label}</td><td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${value}</td></tr>`;
    });
    html += `</table></div>`;
  }

  if (!hiddenSections.includes("Loyalty Redemption Values")) {
    const columns = redemptionCols();
    const hiddenCols = hiddenColumns["Loyalty Redemption Values"] || [];
    const visible = columns.filter((c) => !hiddenCols.includes(c.key));

    if (visible.length) {
      html += `<div style="margin-bottom: 30px;"><h2 style="color: #333; border-bottom: 2px solid #4CAF50; padding-bottom: 10px;">Loyalty Redemption Values</h2>
        <table style="width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 10px;">
        <thead><tr style="background-color: #4CAF50; color: white;">${visible.map((c) => `<th style="padding: 8px; border: 1px solid #ddd;">${c.label}</th>`).join("")}</tr></thead>
        <tbody>`;
      (data || []).forEach((item, i) => {
        html += `<tr style="background-color: ${i % 2 === 0 ? "#f9f9f9" : "white"};">`;
        visible.forEach((c) => {
          html += `<td style="padding: 6px; border: 1px solid #ddd;">${c.getValue(item)}</td>`;
        });
        html += `</tr>`;
      });
      html += `</tbody></table></div>`;
    }
  }

  html += `</div>`;
  return html;
}

export function buildRedemptionExcelSheets(
  data: LoyaltyRedemptionRow[],
  _metadata: unknown,
  settings: { hiddenSections?: string[]; hiddenColumns?: Record<string, string[]> },
) {
  const hiddenSections = settings?.hiddenSections || [];
  const hiddenColumns = settings?.hiddenColumns?.["Loyalty Redemption Values"] || [];

  if (!data?.length) return [{ name: "Loyalty Redemption Values", data: [["No data available"]] }];
  if (hiddenSections.includes("Loyalty Redemption Values")) {
    return [{ name: "Loyalty Redemption Values", data: [["No sections selected"]] }];
  }

  const columns = redemptionCols();
  const visible = columns.filter((c) => !hiddenColumns.includes(c.key));
  if (!visible.length) return [{ name: "Loyalty Redemption Values", data: [["No columns selected"]] }];

  return [
    {
      name: "Loyalty Redemption Values",
      data: [visible.map((c) => c.label), ...data.map((item) => visible.map((c) => c.getValue(item)))],
    },
  ];
}

export function exportRedemptionToCsv(rows: LoyaltyRedemptionRow[], filename: string) {
  const columns = redemptionCols();
  let csv = columns.map((c) => c.label).join(",") + "\n";
  rows.forEach((row) => {
    csv += columns.map((c) => `"${String(c.getValue(row)).replace(/"/g, '""')}"`).join(",") + "\n";
  });
  downloadCsv(csv, filename);
}
