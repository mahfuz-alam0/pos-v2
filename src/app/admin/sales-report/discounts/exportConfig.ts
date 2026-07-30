import * as XLSX from "xlsx";
import type { PdfColumnConfig } from "@/components/ui/pdf-export-drawer";
import type { DiscountsExportData } from "./types";

export const SECTIONS = [
  "Item Discounts Applied",
  "Discounts by Category",
  "Discounts by Product",
  "Discounts by Employee",
  "Discounts by Brand",
];

export const EXCEL_COLUMN_CONFIG: Record<string, PdfColumnConfig[]> = {
  "Item Discounts Applied": [
    { key: "discountType", label: "Discount Type" },
    { key: "netSales", label: "Net Sales" },
    { key: "noOfItemsDiscounted", label: "# Items Discounted" },
    { key: "totalItemDiscounts", label: "Total Item Discounts" },
    { key: "avgItemDiscount", label: "Avg Item Discount" },
    { key: "itemDiscountPercent", label: "Item Discount %" },
    { key: "newOrderPercent", label: "New Order %" },
    { key: "winbackOrderPercent", label: "Winback Order %" },
    { key: "noOfOrdersDiscounted", label: "# Orders Discounted" },
  ],
  "Discounts by Category": [
    { key: "categoryName", label: "Category" },
    { key: "noOfItemsDiscounted", label: "# Items Discounted" },
    { key: "noOfOrdersDiscounted", label: "# Orders Discounted" },
    { key: "itemDiscountPercent", label: "Item Discount %" },
    { key: "avgItemDiscount", label: "Avg Item Discount" },
  ],
  "Discounts by Product": [
    { key: "productName", label: "Product" },
    { key: "noOfItemsDiscounted", label: "# Items Discounted" },
    { key: "noOfOrdersDiscounted", label: "# Orders Discounted" },
    { key: "itemDiscountPercent", label: "Item Discount %" },
    { key: "avgItemDiscount", label: "Avg Item Discount" },
  ],
  "Discounts by Employee": [
    { key: "employeeName", label: "Employee" },
    { key: "noOfItemsDiscounted", label: "# Items Discounted" },
    { key: "noOfOrdersDiscounted", label: "# Orders Discounted" },
    { key: "itemDiscountPercent", label: "Item Discount %" },
    { key: "avgItemDiscount", label: "Avg Item Discount" },
  ],
  "Discounts by Brand": [
    { key: "brandName", label: "Brand" },
    { key: "netSales", label: "Net Sales" },
    { key: "noOfItemsDiscounted", label: "# Items Discounted" },
    { key: "noOfOrdersDiscounted", label: "# Orders Discounted" },
    { key: "totalItemDiscountAmount", label: "Total Discount Amount" },
    { key: "avgItemDiscount", label: "Avg Item Discount" },
    { key: "itemDiscountPercent", label: "Item Discount %" },
  ],
};

function fmt(v: any) {
  return `$${(Number(v) || 0).toFixed(2)}`;
}
function pct(v: any) {
  return `${(Number(v) || 0).toFixed(1)}%`;
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

export function buildDiscountsHtml(
  data: DiscountsExportData,
  metadata: ExportMetadata,
  settings: { hiddenSections: string[] },
) {
  const hidden = settings?.hiddenSections || [];
  const dateRange = metadata?.dateRange || "";
  let html = `<div style="font-family:Arial,sans-serif;padding:20px;">
    <div style="margin-bottom:20px;">
      <h2 style="font-size:20px;font-weight:700;color:#1e293b;margin:0;">Discounts Report</h2>
      ${dateRange ? `<p style="color:#64748b;font-size:13px;margin:4px 0 0;">${dateRange}</p>` : ""}
    </div>`;

  if (!hidden.includes("Item Discounts Applied") && data.itemDiscountsData?.length) {
    const rows = data.itemDiscountsData.map((r) => [
      (r.discountType || "").replace(/_/g, " "),
      fmt(r.netSales),
      r.noOfItemsDiscounted ?? 0,
      fmt((r.avgItemDiscount || 0) * (r.noOfItemsDiscounted || 0)),
      fmt(r.avgItemDiscount),
      pct(r.itemDiscountPercent),
      pct(r.newOrderPercent),
      pct(r.winbackOrderPercent),
      r.noOfOrdersDiscounted ?? 0,
    ]);
    html += section(
      "Item Discounts Applied",
      tableHtml(
        ["Discount Type", "Net Sales", "# Items Discounted", "Total Item Discounts", "Avg Item Discount", "Item Discount %", "New Order %", "Winback Order %", "# Orders Discounted"],
        rows,
      ),
    );
  }

  if (!hidden.includes("Discounts by Category") && data.categoryDiscountsData?.length) {
    const rows = data.categoryDiscountsData.map((r) => [
      r.categoryName,
      r.noOfItemsDiscounted ?? 0,
      r.noOfOrdersDiscounted ?? 0,
      pct(r.itemDiscountPercent),
      fmt(r.avgItemDiscount),
    ]);
    html += section("Discounts by Category", tableHtml(["Category", "# Items Discounted", "# Orders Discounted", "Item Discount %", "Avg Item Discount"], rows));
  }

  if (!hidden.includes("Discounts by Product") && data.productDiscountsData?.length) {
    const rows = data.productDiscountsData.map((r) => [
      r.productName,
      r.noOfItemsDiscounted ?? 0,
      r.noOfOrdersDiscounted ?? 0,
      pct(r.itemDiscountPercent),
      fmt(r.avgItemDiscount),
    ]);
    html += section("Discounts by Product", tableHtml(["Product", "# Items Discounted", "# Orders Discounted", "Item Discount %", "Avg Item Discount"], rows));
  }

  if (!hidden.includes("Discounts by Employee") && data.employeeDiscountsData?.length) {
    const rows = data.employeeDiscountsData.map((r) => [
      r.employeeName,
      r.noOfItemsDiscounted ?? 0,
      r.noOfOrdersDiscounted ?? 0,
      pct(r.itemDiscountPercent),
      fmt(r.avgItemDiscount),
    ]);
    html += section("Discounts by Employee", tableHtml(["Employee", "# Items Discounted", "# Orders Discounted", "Item Discount %", "Avg Item Discount"], rows));
  }

  if (!hidden.includes("Discounts by Brand") && data.brandDiscountsData?.length) {
    const rows = data.brandDiscountsData.map((r) => [
      r.brandName,
      fmt(r.netSales),
      r.noOfItemsDiscounted ?? 0,
      r.noOfOrdersDiscounted ?? 0,
      fmt(r.totalItemDiscountAmount),
      fmt(r.avgItemDiscount),
      pct(r.itemDiscountPercent),
    ]);
    html += section("Discounts by Brand", tableHtml(["Brand", "Net Sales", "# Items Discounted", "# Orders Discounted", "Total Discount Amount", "Avg Item Discount", "Item Discount %"], rows));
  }

  html += `</div>`;
  return html;
}

function buildSheet(
  sectionTitle: string,
  sheetName: string,
  columns: { key: string; label: string; getRow: (r: any) => (string | number) }[],
  rows: any[],
  settings: { hiddenSections: string[]; hiddenColumns?: Record<string, string[]> },
) {
  const hiddenCols = new Set(settings.hiddenColumns?.[sectionTitle] || []);
  const visibleCols = columns.filter((c) => !hiddenCols.has(c.key));
  return {
    name: sheetName,
    data: [visibleCols.map((c) => c.label), ...rows.map((r) => visibleCols.map((c) => c.getRow(r)))],
  };
}

export function buildDiscountsExcelSheets(data: DiscountsExportData, settings: { hiddenSections: string[]; hiddenColumns?: Record<string, string[]> }) {
  const hidden = settings?.hiddenSections || [];
  const sheets: { name: string; data: any[][] }[] = [];

  if (!hidden.includes("Item Discounts Applied") && data.itemDiscountsData?.length) {
    sheets.push(
      buildSheet(
        "Item Discounts Applied",
        "Item Discounts",
        [
          { key: "discountType", label: "Discount Type", getRow: (r) => (r.discountType || "").replace(/_/g, " ") },
          { key: "netSales", label: "Net Sales", getRow: (r) => fmt(r.netSales) },
          { key: "noOfItemsDiscounted", label: "# Items Discounted", getRow: (r) => r.noOfItemsDiscounted ?? 0 },
          { key: "totalItemDiscounts", label: "Total Item Discounts", getRow: (r) => fmt((r.avgItemDiscount || 0) * (r.noOfItemsDiscounted || 0)) },
          { key: "avgItemDiscount", label: "Avg Item Discount", getRow: (r) => fmt(r.avgItemDiscount) },
          { key: "itemDiscountPercent", label: "Item Discount %", getRow: (r) => pct(r.itemDiscountPercent) },
          { key: "newOrderPercent", label: "New Order %", getRow: (r) => pct(r.newOrderPercent) },
          { key: "winbackOrderPercent", label: "Winback Order %", getRow: (r) => pct(r.winbackOrderPercent) },
          { key: "noOfOrdersDiscounted", label: "# Orders Discounted", getRow: (r) => r.noOfOrdersDiscounted ?? 0 },
        ],
        data.itemDiscountsData,
        settings,
      ),
    );
  }

  if (!hidden.includes("Discounts by Category") && data.categoryDiscountsData?.length) {
    sheets.push(
      buildSheet(
        "Discounts by Category",
        "By Category",
        [
          { key: "categoryName", label: "Category", getRow: (r) => r.categoryName },
          { key: "noOfItemsDiscounted", label: "# Items Discounted", getRow: (r) => r.noOfItemsDiscounted ?? 0 },
          { key: "noOfOrdersDiscounted", label: "# Orders Discounted", getRow: (r) => r.noOfOrdersDiscounted ?? 0 },
          { key: "itemDiscountPercent", label: "Item Discount %", getRow: (r) => pct(r.itemDiscountPercent) },
          { key: "avgItemDiscount", label: "Avg Item Discount", getRow: (r) => fmt(r.avgItemDiscount) },
        ],
        data.categoryDiscountsData,
        settings,
      ),
    );
  }

  if (!hidden.includes("Discounts by Product") && data.productDiscountsData?.length) {
    sheets.push(
      buildSheet(
        "Discounts by Product",
        "By Product",
        [
          { key: "productName", label: "Product", getRow: (r) => r.productName },
          { key: "noOfItemsDiscounted", label: "# Items Discounted", getRow: (r) => r.noOfItemsDiscounted ?? 0 },
          { key: "noOfOrdersDiscounted", label: "# Orders Discounted", getRow: (r) => r.noOfOrdersDiscounted ?? 0 },
          { key: "itemDiscountPercent", label: "Item Discount %", getRow: (r) => pct(r.itemDiscountPercent) },
          { key: "avgItemDiscount", label: "Avg Item Discount", getRow: (r) => fmt(r.avgItemDiscount) },
        ],
        data.productDiscountsData,
        settings,
      ),
    );
  }

  if (!hidden.includes("Discounts by Employee") && data.employeeDiscountsData?.length) {
    sheets.push(
      buildSheet(
        "Discounts by Employee",
        "By Employee",
        [
          { key: "employeeName", label: "Employee", getRow: (r) => r.employeeName },
          { key: "noOfItemsDiscounted", label: "# Items Discounted", getRow: (r) => r.noOfItemsDiscounted ?? 0 },
          { key: "noOfOrdersDiscounted", label: "# Orders Discounted", getRow: (r) => r.noOfOrdersDiscounted ?? 0 },
          { key: "itemDiscountPercent", label: "Item Discount %", getRow: (r) => pct(r.itemDiscountPercent) },
          { key: "avgItemDiscount", label: "Avg Item Discount", getRow: (r) => fmt(r.avgItemDiscount) },
        ],
        data.employeeDiscountsData,
        settings,
      ),
    );
  }

  if (!hidden.includes("Discounts by Brand") && data.brandDiscountsData?.length) {
    sheets.push(
      buildSheet(
        "Discounts by Brand",
        "By Brand",
        [
          { key: "brandName", label: "Brand", getRow: (r) => r.brandName },
          { key: "netSales", label: "Net Sales", getRow: (r) => fmt(r.netSales) },
          { key: "noOfItemsDiscounted", label: "# Items Discounted", getRow: (r) => r.noOfItemsDiscounted ?? 0 },
          { key: "noOfOrdersDiscounted", label: "# Orders Discounted", getRow: (r) => r.noOfOrdersDiscounted ?? 0 },
          { key: "totalItemDiscountAmount", label: "Total Discount Amount", getRow: (r) => fmt(r.totalItemDiscountAmount) },
          { key: "avgItemDiscount", label: "Avg Item Discount", getRow: (r) => fmt(r.avgItemDiscount) },
          { key: "itemDiscountPercent", label: "Item Discount %", getRow: (r) => pct(r.itemDiscountPercent) },
        ],
        data.brandDiscountsData,
        settings,
      ),
    );
  }

  return sheets.length > 0 ? sheets : [{ name: "No Data", data: [["No data available"]] }];
}

export function exportSheetsToExcel(sheets: { name: string; data: any[][] }[], filename: string) {
  const wb = XLSX.utils.book_new();
  sheets.forEach((sheet) => {
    const ws = XLSX.utils.aoa_to_sheet(sheet.data);
    XLSX.utils.book_append_sheet(wb, ws, sheet.name.substring(0, 31));
  });
  XLSX.writeFile(wb, `${filename}.xlsx`);
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

export function exportDiscountsToCsv(data: DiscountsExportData, dateRangeLabel: string, filename: string) {
  const allSections = [
    {
      title: "Item Discounts Applied",
      headers: ["Discount Type", "Net Sales", "# Items Discounted", "Total Item Discounts", "Avg Item Discount", "Item Discount %", "New Order %", "Winback Order %", "# Orders Discounted"],
      rows: data.itemDiscountsData.map((r) => [(r.discountType || "").replace(/_/g, " "), fmt(r.netSales), r.noOfItemsDiscounted ?? 0, fmt((r.avgItemDiscount || 0) * (r.noOfItemsDiscounted || 0)), fmt(r.avgItemDiscount), pct(r.itemDiscountPercent), pct(r.newOrderPercent), pct(r.winbackOrderPercent), r.noOfOrdersDiscounted ?? 0]),
    },
    {
      title: "Discounts by Category",
      headers: ["Category", "# Items Discounted", "# Orders Discounted", "Item Discount %", "Avg Item Discount"],
      rows: data.categoryDiscountsData.map((r) => [r.categoryName, r.noOfItemsDiscounted ?? 0, r.noOfOrdersDiscounted ?? 0, pct(r.itemDiscountPercent), fmt(r.avgItemDiscount)]),
    },
    {
      title: "Discounts by Product",
      headers: ["Product", "# Items Discounted", "# Orders Discounted", "Item Discount %", "Avg Item Discount"],
      rows: data.productDiscountsData.map((r) => [r.productName, r.noOfItemsDiscounted ?? 0, r.noOfOrdersDiscounted ?? 0, pct(r.itemDiscountPercent), fmt(r.avgItemDiscount)]),
    },
    {
      title: "Discounts by Employee",
      headers: ["Employee", "# Items Discounted", "# Orders Discounted", "Item Discount %", "Avg Item Discount"],
      rows: data.employeeDiscountsData.map((r) => [r.employeeName, r.noOfItemsDiscounted ?? 0, r.noOfOrdersDiscounted ?? 0, pct(r.itemDiscountPercent), fmt(r.avgItemDiscount)]),
    },
    {
      title: "Discounts by Brand",
      headers: ["Brand", "Net Sales", "# Items Discounted", "# Orders Discounted", "Total Discount Amount", "Avg Item Discount", "Item Discount %"],
      rows: data.brandDiscountsData.map((r) => [r.brandName, fmt(r.netSales), r.noOfItemsDiscounted ?? 0, r.noOfOrdersDiscounted ?? 0, fmt(r.totalItemDiscountAmount), fmt(r.avgItemDiscount), pct(r.itemDiscountPercent)]),
    },
  ];

  let csv = `Discounts Report\n${dateRangeLabel}\n\n`;
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
