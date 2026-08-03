import type { PackageRow } from "./types";

function statusLabel(row: PackageRow) {
  return row.isActive ? "Active" : "Inactive";
}

function fmtDate(value?: string) {
  if (!value) return "-";
  const d = new Date(value);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  return `${mm}.${dd}.${yy}`;
}

// Column set/order matches old app's exportToCSV/exportToXLS (Packages/index.js:3328-3339, 3415-3431).
const HEADERS = [
  "Package ID",
  "Package Name",
  "Original Brand",
  "Original Category",
  "Original Qty",
  "Qty Left",
  "Metrc Qty",
  "Status",
  "Source",
  "Age",
  "Last Adj.",
];

function toCsvRow(item: PackageRow) {
  return [
    `"${item.advertisedId ?? ""}"`,
    `"${item.name ?? ""}"`,
    `"${item.brand?.name ?? "-"}"`,
    `"${item.category?.name ?? "-"}"`,
    `${item.originalQuantity ?? "-"} ${item.uoMShortForm ?? ""}`,
    `${item.quantityLeft ?? "-"} ${item.uoMShortForm ?? ""}`,
    `${item.metrQuantity ?? "-"} ${item.uoMShortForm ?? ""}`,
    statusLabel(item),
    `"${item.source ?? "-"}"`,
    `"${fmtDate(item.createdAt)}"`,
    `"${fmtDate(item.updatedAt || item.createdAt)}"`,
  ].join(",");
}

export function exportPackagesToCSV(rows: PackageRow[]) {
  const csvContent = [HEADERS.join(","), ...rows.map((r) => toCsvRow(r))].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `packages_data_${new Date().toISOString().split("T")[0]}.csv`;
  link.click();
}

export async function exportPackagesToXLS(rows: PackageRow[]) {
  const XLSX = await import("xlsx");
  const excelData = rows.map((item) => ({
    "Package ID": item.advertisedId ?? "",
    "Package Name": item.name ?? "",
    "Original Brand": item.brand?.name ?? "-",
    "Original Category": item.category?.name ?? "-",
    "Original Qty": `${item.originalQuantity ?? "-"} ${item.uoMShortForm ?? ""}`,
    "Qty Left": `${item.quantityLeft ?? "-"} ${item.uoMShortForm ?? ""}`,
    "Metrc Qty": `${item.metrQuantity ?? "-"} ${item.uoMShortForm ?? ""}`,
    Status: statusLabel(item),
    Source: item.source ?? "-",
    Age: fmtDate(item.createdAt),
    "Last Adj.": fmtDate(item.updatedAt || item.createdAt),
  }));
  const worksheet = XLSX.utils.json_to_sheet(excelData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Packages Data");
  XLSX.writeFile(workbook, `packages_data_${new Date().toISOString().split("T")[0]}.xlsx`);
}
