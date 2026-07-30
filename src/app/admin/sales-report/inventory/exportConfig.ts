import { format } from "date-fns";
import type { PdfColumnConfig } from "@/components/ui/pdf-export-drawer";
import type { InventoryTransactionRow, PackageHistoryRow, InventorySnapshotRow } from "./types";

function fmt(v: any) {
  return `$${(Number(v) || 0).toFixed(2)}`;
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

/* ---------------- Inventory Transactions ---------------- */

export const TRANSACTIONS_SECTIONS = ["Summary", "Inventory Transactions"];

export const TRANSACTIONS_COLUMN_CONFIG: Record<string, PdfColumnConfig[]> = {
  Summary: [
    { key: "totalQuantity", label: "Total Quantity" },
    { key: "totalCost", label: "Total Cost" },
    { key: "totalTransactions", label: "Total Transactions" },
  ],
  "Inventory Transactions": [
    { key: "dateTime", label: "Date & Time" },
    { key: "packageId", label: "Package ID" },
    { key: "productName", label: "Product Name" },
    { key: "categoryName", label: "Category" },
    { key: "quanitiy", label: "Quantity" },
    { key: "transcationType", label: "Transaction Type" },
    { key: "roomName", label: "Room" },
    { key: "unitCost", label: "Unit Cost" },
    { key: "totalCost", label: "Total Cost" },
  ],
};

function transactionsSummary(rows: InventoryTransactionRow[]) {
  let totalQuantity = 0;
  let totalCost = 0;
  rows.forEach((r) => {
    totalQuantity += Number(r.quanitiy) || 0;
    totalCost += Number(r.totalCost) || 0;
  });
  return { "Total Quantity": totalQuantity, "Total Cost": fmt(totalCost), "Total Transactions": rows.length };
}

export function buildTransactionsHtml(
  data: InventoryTransactionRow[],
  metadata: { storeName?: string; dateRange?: string },
  settings: { hiddenSections: string[] },
) {
  const hidden = settings?.hiddenSections || [];
  let html = `<div style="font-family:Arial,sans-serif;padding:20px;">${reportHeaderHtml("Inventory Transactions Report", metadata)}`;

  if (!hidden.includes("Summary")) {
    const summary = transactionsSummary(data);
    html += section(
      "Summary",
      tableHtml(["Metric", "Value"], Object.entries(summary).map(([k, v]) => [k, v as string | number])),
    );
  }

  if (!hidden.includes("Inventory Transactions") && data.length) {
    const rows = data.map((r) => [
      format(new Date(r.dateTime), "yyyy-MM-dd HH:mm:ss"),
      r.packageId,
      r.productName,
      r.categoryName || "-",
      r.quanitiy,
      r.transcationType,
      r.roomName || "-",
      fmt(r.unitCost),
      fmt(r.totalCost),
    ]);
    html += section(
      "Inventory Transactions",
      tableHtml(["Date & Time", "Package ID", "Product Name", "Category", "Quantity", "Transaction Type", "Room", "Unit Cost", "Total Cost"], rows),
    );
  }

  html += `</div>`;
  return html;
}

export function buildTransactionsExcelSheets(data: InventoryTransactionRow[], settings: { hiddenSections: string[]; hiddenColumns?: Record<string, string[]> }) {
  const hidden = settings?.hiddenSections || [];
  const sheets: { name: string; data: any[][] }[] = [];

  if (!hidden.includes("Summary")) {
    const summary = transactionsSummary(data);
    sheets.push({ name: "Summary", data: [["Metric", "Value"], ...Object.entries(summary)] });
  }

  if (!hidden.includes("Inventory Transactions") && data.length) {
    sheets.push({
      name: "Transactions",
      data: [
        ["Date & Time", "Package ID", "Product Name", "Category", "Quantity", "Transaction Type", "Room", "Unit Cost", "Total Cost"],
        ...data.map((r) => [
          format(new Date(r.dateTime), "yyyy-MM-dd HH:mm:ss"),
          r.packageId,
          r.productName,
          r.categoryName || "-",
          r.quanitiy,
          r.transcationType,
          r.roomName || "-",
          fmt(r.unitCost),
          fmt(r.totalCost),
        ]),
      ],
    });
  }

  return sheets.length > 0 ? sheets : [{ name: "No Data", data: [["No data available"]] }];
}

export function exportTransactionsToCsv(data: InventoryTransactionRow[], dateRangeLabel: string, filename: string) {
  const summary = transactionsSummary(data);
  let csv = `Inventory Transactions Report\n${dateRangeLabel}\n\nSummary\n`;
  Object.entries(summary).forEach(([k, v]) => (csv += `${csvEscape(k)},${csvEscape(v)}\n`));
  csv += `\nInventory Transactions\n`;
  csv += ["Date & Time", "Package ID", "Product Name", "Category", "Quantity", "Transaction Type", "Room", "Unit Cost", "Total Cost"].join(",") + "\n";
  data.forEach((r) => {
    csv +=
      [
        format(new Date(r.dateTime), "yyyy-MM-dd HH:mm:ss"),
        r.packageId,
        r.productName,
        r.categoryName || "-",
        r.quanitiy,
        r.transcationType,
        r.roomName || "-",
        fmt(r.unitCost),
        fmt(r.totalCost),
      ]
        .map(csvEscape)
        .join(",") + "\n";
  });
  downloadCsv(csv, filename);
}

/* ---------------- Package History ---------------- */

export const PACKAGE_HISTORY_SECTIONS = ["Summary", "Package History"];

export const PACKAGE_HISTORY_COLUMN_CONFIG: Record<string, PdfColumnConfig[]> = {
  Summary: [
    { key: "totalQuantityChange", label: "Total Quantity Change" },
    { key: "totalPackageTotal", label: "Total Package Total" },
    { key: "totalTransactions", label: "Total Transactions" },
  ],
  "Package History": [
    { key: "productName", label: "Product" },
    { key: "productSku", label: "SKU" },
    { key: "location", label: "Location" },
    { key: "transactionId", label: "Transaction ID" },
    { key: "transactionType", label: "Transaction Type" },
    { key: "packageQuantityChange", label: "Quantity Change" },
    { key: "packageTotal", label: "Package Total" },
    { key: "roomName", label: "Room" },
  ],
};

function packageHistorySummary(rows: PackageHistoryRow[]) {
  const totalQuantityChange = rows.reduce((sum, r) => sum + (r.packageQuantityChange || 0), 0);
  const totalPackageTotal = rows.reduce((sum, r) => sum + (r.packageTotal || 0), 0);
  return {
    "Total Quantity Change": totalQuantityChange > 0 ? `+${totalQuantityChange.toFixed(2)}` : totalQuantityChange.toFixed(2),
    "Total Package Total": totalPackageTotal.toFixed(2),
    "Total Transactions": rows.length,
  };
}

export function buildPackageHistoryHtml(
  data: PackageHistoryRow[],
  metadata: { storeName?: string; dateRange?: string },
  settings: { hiddenSections: string[] },
) {
  const hidden = settings?.hiddenSections || [];
  let html = `<div style="font-family:Arial,sans-serif;padding:20px;">${reportHeaderHtml("Package History Report", metadata)}`;

  if (!hidden.includes("Summary")) {
    const summary = packageHistorySummary(data);
    html += section(
      "Summary",
      tableHtml(["Metric", "Value"], Object.entries(summary).map(([k, v]) => [k, v as string | number])),
    );
  }

  if (!hidden.includes("Package History") && data.length) {
    const rows = data.map((r) => [
      r.productName,
      r.productSku || "-",
      r.location?.country || "-",
      r.transactionId,
      r.transactionType,
      r.packageQuantityChange > 0 ? `+${r.packageQuantityChange}` : r.packageQuantityChange,
      r.packageTotal,
      r.roomName || "-",
    ]);
    html += section("Package History", tableHtml(["Product", "SKU", "Location", "Transaction ID", "Transaction Type", "Quantity Change", "Package Total", "Room"], rows));
  }

  html += `</div>`;
  return html;
}

export function buildPackageHistoryExcelSheets(data: PackageHistoryRow[], settings: { hiddenSections: string[]; hiddenColumns?: Record<string, string[]> }) {
  const hidden = settings?.hiddenSections || [];
  const sheets: { name: string; data: any[][] }[] = [];

  if (!hidden.includes("Summary")) {
    const summary = packageHistorySummary(data);
    sheets.push({ name: "Summary", data: [["Metric", "Value"], ...Object.entries(summary)] });
  }

  if (!hidden.includes("Package History") && data.length) {
    sheets.push({
      name: "Package History",
      data: [
        ["Product", "SKU", "Location", "Transaction ID", "Transaction Type", "Quantity Change", "Package Total", "Room"],
        ...data.map((r) => [
          r.productName,
          r.productSku || "-",
          r.location?.country || "-",
          r.transactionId,
          r.transactionType,
          r.packageQuantityChange > 0 ? `+${r.packageQuantityChange}` : r.packageQuantityChange,
          r.packageTotal,
          r.roomName || "-",
        ]),
      ],
    });
  }

  return sheets.length > 0 ? sheets : [{ name: "No Data", data: [["No data available"]] }];
}

export function exportPackageHistoryToCsv(data: PackageHistoryRow[], filename: string) {
  const summary = packageHistorySummary(data);
  let csv = `Package History Report\n\nSummary\n`;
  Object.entries(summary).forEach(([k, v]) => (csv += `${csvEscape(k)},${csvEscape(v)}\n`));
  csv += `\nPackage History\n`;
  csv += ["Product", "SKU", "Location", "Transaction ID", "Transaction Type", "Quantity Change", "Package Total", "Room"].join(",") + "\n";
  data.forEach((r) => {
    csv +=
      [
        r.productName,
        r.productSku || "-",
        r.location?.country || "-",
        r.transactionId,
        r.transactionType,
        r.packageQuantityChange > 0 ? `+${r.packageQuantityChange}` : r.packageQuantityChange,
        r.packageTotal,
        r.roomName || "-",
      ]
        .map(csvEscape)
        .join(",") + "\n";
  });
  downloadCsv(csv, filename);
}

/* ---------------- Inventory Snapshot ---------------- */

export const SNAPSHOT_SECTIONS = ["Summary", "Inventory Snapshot"];

export const SNAPSHOT_COLUMN_CONFIG: Record<string, PdfColumnConfig[]> = {
  Summary: [
    { key: "totalItems", label: "Total Items" },
    { key: "totalCurrentQty", label: "Total Current Qty" },
    { key: "totalCOG", label: "Total COG" },
    { key: "totalRetailValue", label: "Total Est. Retail Value" },
  ],
  "Inventory Snapshot": [
    { key: "productName", label: "Product" },
    { key: "category", label: "Category" },
    { key: "containsMJ", label: "Contains MJ" },
    { key: "currentQty", label: "Current Qty" },
    { key: "unitWeight", label: "Unit Weight" },
    { key: "netWeight", label: "Net Weight" },
    { key: "costPerItem", label: "Cost Per Item" },
    { key: "cog", label: "COG (Qty * CPI)" },
    { key: "salesPrice", label: "Sales Price" },
    { key: "retailValue", label: "Est. Retail Value" },
  ],
};

function snapshotSummary(rows: InventorySnapshotRow[]) {
  const totalCOG = rows.reduce((sum, r) => sum + (Number(r.cog) || 0), 0);
  const totalRetailValue = rows.reduce((sum, r) => sum + (Number(r.retailValue) || 0), 0);
  const totalCurrentQty = rows.reduce((sum, r) => sum + (Number(r.currentQty) || 0), 0);
  return {
    "Total Items": rows.length,
    "Total Current Qty": `${totalCurrentQty.toFixed(2)}/ea`,
    "Total COG": fmt(totalCOG),
    "Total Est. Retail Value": fmt(totalRetailValue),
  };
}

export function buildSnapshotHtml(
  data: InventorySnapshotRow[],
  metadata: { storeName?: string; dateRange?: string },
  settings: { hiddenSections: string[] },
) {
  const hidden = settings?.hiddenSections || [];
  let html = `<div style="font-family:Arial,sans-serif;padding:20px;">${reportHeaderHtml("Inventory Snapshot Report", metadata)}`;

  if (!hidden.includes("Summary")) {
    const summary = snapshotSummary(data);
    html += section(
      "Summary",
      tableHtml(["Metric", "Value"], Object.entries(summary).map(([k, v]) => [k, v as string | number])),
    );
  }

  if (!hidden.includes("Inventory Snapshot") && data.length) {
    const rows = data.map((r) => [
      r.productName,
      r.category,
      r.containsMJ ? "Yes" : "No",
      `${(r.currentQty || 0).toFixed(2)}/ea`,
      r.unitWeight ? `${r.unitWeight.toFixed(2)}g` : "N/A",
      r.netWeight ? `${r.netWeight.toFixed(2)}g` : "N/A",
      fmt(r.costPerItem),
      fmt(r.cog),
      fmt(r.salesPrice),
      fmt(r.retailValue),
    ]);
    html += section(
      "Inventory Snapshot",
      tableHtml(["Product", "Category", "Contains MJ", "Current Qty", "Unit Weight", "Net Weight", "Cost Per Item", "COG (Qty * CPI)", "Sales Price", "Est. Retail Value"], rows),
    );
  }

  html += `</div>`;
  return html;
}

export function buildSnapshotExcelSheets(data: InventorySnapshotRow[], settings: { hiddenSections: string[]; hiddenColumns?: Record<string, string[]> }) {
  const hidden = settings?.hiddenSections || [];
  const sheets: { name: string; data: any[][] }[] = [];

  if (!hidden.includes("Summary")) {
    const summary = snapshotSummary(data);
    sheets.push({ name: "Summary", data: [["Metric", "Value"], ...Object.entries(summary)] });
  }

  if (!hidden.includes("Inventory Snapshot") && data.length) {
    sheets.push({
      name: "Inventory Snapshot",
      data: [
        ["Product", "Category", "Contains MJ", "Current Qty", "Unit Weight", "Net Weight", "Cost Per Item", "COG (Qty * CPI)", "Sales Price", "Est. Retail Value"],
        ...data.map((r) => [
          r.productName,
          r.category,
          r.containsMJ ? "Yes" : "No",
          `${(r.currentQty || 0).toFixed(2)}/ea`,
          r.unitWeight ? `${r.unitWeight.toFixed(2)}g` : "N/A",
          r.netWeight ? `${r.netWeight.toFixed(2)}g` : "N/A",
          fmt(r.costPerItem),
          fmt(r.cog),
          fmt(r.salesPrice),
          fmt(r.retailValue),
        ]),
      ],
    });
  }

  return sheets.length > 0 ? sheets : [{ name: "No Data", data: [["No data available"]] }];
}

export function exportSnapshotToCsv(data: InventorySnapshotRow[], dateRangeLabel: string, filename: string) {
  const summary = snapshotSummary(data);
  let csv = `Inventory Snapshot Report\n${dateRangeLabel}\n\nSummary\n`;
  Object.entries(summary).forEach(([k, v]) => (csv += `${csvEscape(k)},${csvEscape(v)}\n`));
  csv += `\nInventory Snapshot\n`;
  csv += ["Product", "Category", "Contains MJ", "Current Qty", "Unit Weight", "Net Weight", "Cost Per Item", "COG (Qty * CPI)", "Sales Price", "Est. Retail Value"].join(",") + "\n";
  data.forEach((r) => {
    csv +=
      [
        r.productName,
        r.category,
        r.containsMJ ? "Yes" : "No",
        `${(r.currentQty || 0).toFixed(2)}/ea`,
        r.unitWeight ? `${r.unitWeight.toFixed(2)}g` : "N/A",
        r.netWeight ? `${r.netWeight.toFixed(2)}g` : "N/A",
        fmt(r.costPerItem),
        fmt(r.cog),
        fmt(r.salesPrice),
        fmt(r.retailValue),
      ]
        .map(csvEscape)
        .join(",") + "\n";
  });
  downloadCsv(csv, filename);
}
