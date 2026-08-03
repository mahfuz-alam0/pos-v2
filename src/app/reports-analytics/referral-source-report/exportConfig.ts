import type { PdfColumnConfig } from "@/components/ui/pdf-export-drawer";

export const SECTIONS = ["Referral Source"];

export const EXCEL_COLUMN_CONFIG: Record<string, PdfColumnConfig[]> = {
  "Referral Source": [
    { key: "label", label: "Referral Source" },
    { key: "count", label: "Total Customers" },
    { key: "percentage", label: "Percentage" },
  ],
};

function pct(count: number, total: number) {
  return total > 0 ? `${((count / total) * 100).toFixed(1)}%` : "N/A";
}

export function buildReferralSourceHtml(
  data: { referralData: any[]; total: number },
  _metadata: unknown,
  settings: { hiddenSections: string[] },
) {
  const hidden = settings?.hiddenSections || [];
  const rows = data.referralData || [];
  const total = data.total || 0;

  const thStyle = `style="background:#f8f9fa;padding:8px 12px;text-align:left;font-size:12px;font-weight:600;color:#374151;border:1px solid #e5e7eb;"`;
  const tdStyle = `style="padding:7px 12px;font-size:12px;color:#374151;border:1px solid #e5e7eb;"`;

  let html = `<div style="font-family:Arial,sans-serif;padding:20px;">
    <div style="margin-bottom:20px;">
      <h2 style="font-size:20px;font-weight:700;color:#1e293b;margin:0;">Referral Source Report</h2>
    </div>`;

  if (!hidden.includes("Referral Source") && rows.length) {
    const tableRows = rows
      .map(
        (r, i) => `<tr style="background:${i % 2 === 0 ? "#fff" : "#f9fafb"};">
        <td ${tdStyle}>${r.label || "N/A"}</td>
        <td ${tdStyle}>${r.count ?? 0}</td>
        <td ${tdStyle}>${pct(r.count, total)}</td>
      </tr>`,
      )
      .join("");
    html += `<div style="margin-bottom:24px;">
      <h3 style="font-size:14px;font-weight:700;color:#1e293b;margin:0 0 8px 0;padding-bottom:6px;border-bottom:2px solid #e2e8f0;">Referral Source</h3>
      <table style="width:100%;border-collapse:collapse;margin-top:8px;">
        <thead><tr>
          <th ${thStyle}>Referral Source</th>
          <th ${thStyle}>Total Customers</th>
          <th ${thStyle}>Percentage</th>
        </tr></thead>
        <tbody>${tableRows}</tbody>
      </table>
    </div>`;
  }

  html += `</div>`;
  return html;
}

export function buildReferralSourceExcelSheets(
  data: { referralData: any[]; total: number },
  _metadata: unknown,
  settings: { hiddenSections: string[] },
) {
  const hidden = settings?.hiddenSections || [];
  const rows = data.referralData || [];
  const total = data.total || 0;
  if (hidden.includes("Referral Source") || !rows.length) {
    return [{ name: "No Data", data: [["No data available"]] }];
  }
  return [
    {
      name: "Referral Source",
      data: [
        ["Referral Source", "Total Customers", "Percentage"],
        ...rows.map((r) => [r.label || "N/A", r.count ?? 0, pct(r.count, total)]),
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

export function exportReferralSourceToCsv(rows: any[], total: number, filename: string) {
  let csv = `Referral Source Report\n\nReferral Source,Total Customers,Percentage\n`;
  rows.forEach((r) => {
    csv += `"${String(r.label || "N/A").replace(/"/g, '""')}","${r.count ?? 0}","${pct(r.count, total)}"\n`;
  });
  downloadCsv(csv, filename);
}
