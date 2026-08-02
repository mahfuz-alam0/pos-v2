import type { PdfColumnConfig } from "@/components/ui/pdf-export-drawer";

export const SECTIONS = ["Inventory Reorder"];

export const EXCEL_COLUMN_CONFIG: Record<string, PdfColumnConfig[]> = {
  "Inventory Reorder": [
    { key: "productName", label: "Product" },
    { key: "categoryName", label: "Category" },
    { key: "supplierName", label: "Supplier" },
    { key: "qtyOnHand", label: "Qty On Hand" },
    { key: "parValue", label: "PAR Level" },
    { key: "avgSalesPerDay", label: "Avg Sales/Day" },
    { key: "daysRemaining", label: "Days Remaining" },
    { key: "qtyNeeded", label: "Reorder Qty" },
  ],
};

function daysLabel(v: any) {
  if (v === 0 || v === "0") return "Out of Stock";
  return v != null ? `${Number(v).toFixed(2)} days` : "-";
}

function num(v: any) {
  return v != null ? Number(v).toFixed(2) : "-";
}

export function buildInventoryReorderHtml(
  exportData: { tableData: any[] },
  metadata: { filterInfo?: string },
  settings: { hiddenSections: string[] },
) {
  const hidden = settings?.hiddenSections || [];
  const rows = exportData.tableData || [];

  const thStyle = `style="background:#f8f9fa;padding:8px 12px;text-align:left;font-size:12px;font-weight:600;color:#374151;border:1px solid #e5e7eb;"`;
  const tdStyle = `style="padding:7px 12px;font-size:12px;color:#374151;border:1px solid #e5e7eb;"`;

  const filterInfo = metadata?.filterInfo || "";
  let html = `<div style="font-family:Arial,sans-serif;padding:20px;">
    <div style="margin-bottom:20px;">
      <h2 style="font-size:20px;font-weight:700;color:#1e293b;margin:0;">Inventory Reorder — Supply Tracker</h2>
      ${filterInfo ? `<p style="color:#64748b;font-size:13px;margin:4px 0 0;">${filterInfo}</p>` : ""}
    </div>`;

  if (!hidden.includes("Inventory Reorder") && rows.length) {
    html += `<div style="margin-bottom:24px;">
      <h3 style="font-size:14px;font-weight:700;color:#1e293b;margin:0 0 8px 0;padding-bottom:6px;border-bottom:2px solid #e2e8f0;">Inventory Reorder</h3>
      <table style="width:100%;border-collapse:collapse;margin-top:8px;">
        <thead><tr>
          ${["Product", "Category", "Supplier", "Qty On Hand", "PAR Level", "Avg Sales/Day", "Days Remaining", "Reorder Qty"]
            .map((h) => `<th ${thStyle}>${h}</th>`)
            .join("")}
        </tr></thead>
        <tbody>${rows
          .map(
            (r, i) => `<tr style="background:${i % 2 === 0 ? "#fff" : "#f9fafb"};">
            <td ${tdStyle}>${r.productName || ""}</td>
            <td ${tdStyle}>${r.categoryName || ""}</td>
            <td ${tdStyle}>${r.supplierName || ""}</td>
            <td ${tdStyle}>${num(r.qtyOnHand)}</td>
            <td ${tdStyle}>${num(r.parValue)}</td>
            <td ${tdStyle}>${num(r.avgSalesPerDay)}</td>
            <td ${tdStyle}>${daysLabel(r.daysRemaining)}</td>
            <td ${tdStyle}>${r.qtyNeeded > 0 ? num(r.qtyNeeded) : "-"}</td>
          </tr>`,
          )
          .join("")}</tbody>
      </table>
    </div>`;
  }

  html += `</div>`;
  return html;
}

export function buildInventoryReorderExcelSheets(
  exportData: { tableData: any[] },
  _metadata: unknown,
  settings: { hiddenSections: string[] },
) {
  const hidden = settings?.hiddenSections || [];
  const rows = exportData.tableData || [];
  if (hidden.includes("Inventory Reorder") || !rows.length) {
    return [{ name: "No Data", data: [["No data available"]] }];
  }
  return [
    {
      name: "Inventory Reorder",
      data: [
        ["Product", "Category", "Supplier", "Qty On Hand", "PAR Level", "Avg Sales/Day", "Days Remaining", "Reorder Qty"],
        ...rows.map((r) => [
          r.productName || "",
          r.categoryName || "",
          r.supplierName || "",
          num(r.qtyOnHand),
          num(r.parValue),
          num(r.avgSalesPerDay),
          daysLabel(r.daysRemaining),
          r.qtyNeeded > 0 ? num(r.qtyNeeded) : "-",
        ]),
      ],
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

export function exportInventoryReorderToCsv(rows: any[], filterInfo: string, filename: string) {
  const headers = ["Product", "Category", "Supplier", "Qty On Hand", "PAR Level", "Avg Sales/Day", "Days Remaining", "Reorder Qty"];
  let csv = `Supply Tracker — Inventory Reorder\n${filterInfo}\n\n`;
  csv += headers.join(",") + "\n";
  rows.forEach((r) => {
    const row = [
      r.productName || "",
      r.categoryName || "",
      r.supplierName || "",
      num(r.qtyOnHand),
      num(r.parValue),
      num(r.avgSalesPerDay),
      daysLabel(r.daysRemaining),
      r.qtyNeeded > 0 ? num(r.qtyNeeded) : "-",
    ];
    csv += row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",") + "\n";
  });
  downloadCsv(csv, filename);
}
