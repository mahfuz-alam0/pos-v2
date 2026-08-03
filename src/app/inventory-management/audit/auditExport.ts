import * as XLSX from "xlsx";
import { format } from "date-fns";

import type { AuditPackageRow } from "./types";

function csvCell(value: string) {
  return `"${(value ?? "").replace(/"/g, '""')}"`;
}

export function exportAuditToCSV(data: AuditPackageRow[], locationMap: Record<string, string>) {
  const csvData = [
    `Inventory Audit Report - ${format(new Date(), "yyyy-MM-dd")}`,
    `Generated: ${format(new Date(), "yyyy-MM-dd HH:mm:ss")}`,
    `Total Records: ${data.length}`,
    "",
    "Product,Brand,Category,Supplier,Package ID,Metrc Tag,Total Pkg Qty,Metrc Qty,Location,Location Qty,UOM",
    ...data.map((item) =>
      [
        csvCell(item.name || ""),
        csvCell(typeof item.productBrand === "object" ? item.productBrand?.name || "" : item.productBrand || ""),
        csvCell(typeof item.productCategory === "object" ? item.productCategory?.name || "" : item.productCategory || ""),
        csvCell(item.supplierName || ""),
        csvCell(item.advertisedId || ""),
        csvCell(item.metrcTag || ""),
        item.quantityLeft || 0,
        item.metrQuantity ?? "",
        csvCell(item.rowLocationId ? locationMap[item.rowLocationId] || "" : ""),
        item.rowLocationQty ?? "",
        csvCell(item.uoMShortForm || "ea"),
      ].join(",")
    ),
  ].join("\n");

  const filename = `Audit_Report_${format(new Date(), "yyyy-MM-dd_HH-mm-ss")}.csv`;
  const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportAuditToXLS(data: AuditPackageRow[], locationMap: Record<string, string>) {
  const wb = XLSX.utils.book_new();

  const summaryData = [
    ["Inventory Audit Report"],
    ["Generated:", format(new Date(), "yyyy-MM-dd HH:mm:ss")],
    ["Total Records:", data.length],
    [],
  ];
  const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, summaryWs, "Summary");

  const auditData = [
    [
      "Product",
      "Brand",
      "Category",
      "Supplier",
      "Package ID",
      "Metrc Tag",
      "Total Pkg Qty",
      "Metrc Qty",
      "Location",
      "Location Qty",
      "UOM",
    ],
    ...data.map((item) => [
      item.name || "",
      typeof item.productBrand === "object" ? item.productBrand?.name || "" : item.productBrand || "",
      typeof item.productCategory === "object" ? item.productCategory?.name || "" : item.productCategory || "",
      item.supplierName || "",
      item.advertisedId || "",
      item.metrcTag || "",
      item.quantityLeft || 0,
      item.metrQuantity ?? "",
      item.rowLocationId ? locationMap[item.rowLocationId] || "" : "",
      item.rowLocationQty ?? "",
      item.uoMShortForm || "ea",
    ]),
  ];
  const auditWs = XLSX.utils.aoa_to_sheet(auditData);
  XLSX.utils.book_append_sheet(wb, auditWs, "Audit Data");

  const filename = `Audit_Report_${format(new Date(), "yyyy-MM-dd_HH-mm-ss")}.xlsx`;
  XLSX.writeFile(wb, filename);
}
