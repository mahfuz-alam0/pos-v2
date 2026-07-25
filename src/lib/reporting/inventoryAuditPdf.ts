import { format } from "date-fns";

import type { PdfExportSettings } from "@/components/ui/pdf-export-drawer";

interface AuditPdfMetadata {
  store?: string;
  licenseNumber?: string;
  dateCreated?: string;
  totalItems?: number;
}

export function getAuditMetadata(storeInfo: any = {}, totalItems = 0): AuditPdfMetadata {
  return {
    store: storeInfo?.name || storeInfo?.storeName || "N/A",
    licenseNumber: storeInfo?.licenseNumber || storeInfo?.license || "N/A",
    dateCreated: format(new Date(), "MMMM dd, yyyy 'at' hh:mm a"),
    totalItems,
  };
}

function buildAuditTableHtml(auditData: any[], settings: Partial<PdfExportSettings> = {}) {
  const hiddenColumns = settings.hiddenColumns?.["Audit Items"] || [];

  const allColumns = [
    { key: "product", label: "Product", align: "left" },
    { key: "brand", label: "Brand", align: "left" },
    { key: "category", label: "Category", align: "left" },
    { key: "supplier", label: "Supplier", align: "left" },
    { key: "packageId", label: "Package ID", align: "left" },
    { key: "metrcTag", label: "Metrc Tag", align: "left" },
    { key: "totalPkgQty", label: "Total Pkg Qty", align: "right" },
    { key: "metrcQty", label: "Metrc Qty", align: "right" },
    { key: "location", label: "Location", align: "left" },
    { key: "locationQty", label: "Location Qty", align: "right" },
  ];

  const columns = allColumns.filter((col) => !hiddenColumns.includes(col.key));

  let html = `
    <h3 style="margin-top: 25px; margin-bottom: 10px; color: #2c3e50; font-weight: 600;">Audit Items</h3>
    <table style="width: 100%; border-collapse: collapse; font-size: 10px; margin-bottom: 30px;">
      <thead>
        <tr style="background-color: #f1f1f1; border-bottom: 2px solid #ccc;">
          ${columns.map((col) => `<th style="text-align: ${col.align}; padding: 8px; border: 1px solid #ddd;">${col.label}</th>`).join("")}
        </tr>
      </thead>
      <tbody>
  `;

  if (!auditData || auditData.length === 0) {
    html += `
      <tr>
        <td colspan="${columns.length}" style="padding: 20px; text-align: center; color: #999; border: 1px solid #ddd;">
          No audit data available
        </td>
      </tr>
    `;
  } else {
    auditData.forEach((item) => {
      const uom = item?.uoMShortForm || "ea";
      const metrcQty = item.metrQuantity;
      const isDiscrepancy = item.quantityLeft !== metrcQty;

      const rowData: Record<string, string> = {
        product: item.name || "N/A",
        brand: item.productBrand?.name || item.productBrand || "-",
        category: item.productCategory?.name || item.productCategory || "-",
        supplier: item.supplierName || "-",
        packageId: item.advertisedId || "N/A",
        metrcTag: item.metrcTag || "-",
        totalPkgQty: `${item.quantityLeft || 0} ${uom}`,
        metrcQty: metrcQty !== null && metrcQty !== undefined ? `${metrcQty} ${uom}` : "-",
        location: item.rowLocationId || "-",
        locationQty:
          item.rowLocationQty !== null && item.rowLocationQty !== undefined ? `${item.rowLocationQty} ${uom}` : "-",
      };

      html += "<tr>";
      columns.forEach((col) => {
        const value = rowData[col.key] || "";
        let style = `padding: 6px 8px; border: 1px solid #ddd; text-align: ${col.align};`;

        if (col.key === "metrcQty" && isDiscrepancy && metrcQty !== null && metrcQty !== undefined) {
          style += " color: red; font-weight: bold;";
        }

        html += `<td style="${style}">${value}</td>`;
      });
      html += "</tr>";
    });
  }

  html += `
      </tbody>
    </table>
  `;

  return html;
}

function buildAuditSummaryHtml(auditData: any[], settings: Partial<PdfExportSettings> = {}) {
  const hiddenColumns = settings.hiddenColumns?.["Summary Statistics"] || [];

  if (!auditData || auditData.length === 0) return "";

  const summary = {
    totalItems: auditData.length,
    activeItems: 0,
    inactiveItems: 0,
    discrepancyItems: 0,
    noDiscrepancyItems: 0,
    totalQuantity: 0,
    totalMetrcQty: 0,
  };

  auditData.forEach((item) => {
    if (item.isActive) summary.activeItems++;
    else summary.inactiveItems++;

    summary.totalQuantity += item.quantityLeft || 0;

    const metrcQty = item.metrQuantity;
    if (metrcQty !== null && metrcQty !== undefined) {
      summary.totalMetrcQty += metrcQty;
      if (item.quantityLeft !== metrcQty) summary.discrepancyItems++;
      else summary.noDiscrepancyItems++;
    }
  });

  const allStats = [
    { key: "totalItems", label: "Total Items", value: summary.totalItems },
    { key: "activeItems", label: "Active Items", value: summary.activeItems },
    { key: "inactiveItems", label: "Inactive Items", value: summary.inactiveItems },
    { key: "discrepancyItems", label: "Items with Discrepancy", value: summary.discrepancyItems },
    { key: "noDiscrepancyItems", label: "Items without Discrepancy", value: summary.noDiscrepancyItems },
    { key: "totalQuantity", label: "Total Quantity", value: summary.totalQuantity.toFixed(2) },
    { key: "totalMetrcQty", label: "Total Metrc Qty", value: summary.totalMetrcQty.toFixed(2) },
  ];

  const visibleStats = allStats.filter((stat) => !hiddenColumns.includes(stat.key));

  let html = `
    <h3 style="margin-top: 25px; margin-bottom: 10px; color: #2c3e50; font-weight: 600;">Summary Statistics</h3>
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 30px; padding: 20px; background: #f8f9fa; border-radius: 8px; border: 1px solid #e9ecef;">
  `;

  visibleStats.forEach((stat) => {
    html += `
      <div style="margin-bottom: 8px;">
        <span style="color: #666; font-weight: bold; display: inline-block; min-width: 200px;">${stat.label}:</span>
        <span style="color: #262626; font-weight: 600; font-size: 14px;">${stat.value}</span>
      </div>
    `;
  });

  html += `
    </div>
  `;

  return html;
}

export function buildAuditPdfHtml(auditData: any[], metadata: AuditPdfMetadata, settings: Partial<PdfExportSettings> = {}) {
  const hiddenSections = settings.hiddenSections || [];

  let html = `
    <div id="pdf-content" style="width: 100%; margin: 0 auto; padding: 0; font-family: Arial, sans-serif; background: white; color: #333; font-size: 12px; line-height: 1.4;">
      <div style="text-align: center; margin-bottom: 25px;">
        <h1 style="margin: 0 0 10px 0; color: #2c3e50; font-weight: bold; font-size: 28px;">Inventory Audit Report</h1>
        <hr style="border: 1px solid #ccc; margin: 15px 0;">
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 25px; margin-bottom: 30px; padding: 20px; background: #f8f9fa; border-radius: 8px; border: 1px solid #e9ecef;">
        <div>
          <div style="margin-bottom: 12px;">
            <span style="color: #666; font-weight: bold; display: inline-block; width: 130px;">Store:</span>
            <span style="color: #262626; font-weight: 500; font-size: 13px;">${metadata?.store || "N/A"}</span>
          </div>
          <div style="margin-bottom: 12px;">
            <span style="color: #666; font-weight: bold; display: inline-block; width: 130px;">Generated On:</span>
            <span style="color: #262626; font-size: 13px;">${metadata?.dateCreated || ""}</span>
          </div>
        </div>
        <div>
          <div style="margin-bottom: 12px;">
            <span style="color: #666; font-weight: bold; display: inline-block; width: 130px;">Total Items:</span>
            <span style="color: #262626; font-weight: 600; font-size: 14px;">${metadata?.totalItems || 0}</span>
          </div>
          <div style="margin-bottom: 12px;">
            <span style="color: #666; font-weight: bold; display: inline-block; width: 130px;">License Number:</span>
            <span style="color: #262626; font-size: 13px;">${metadata?.licenseNumber || "N/A"}</span>
          </div>
        </div>
      </div>
  `;

  if (!hiddenSections.includes("Audit Items")) {
    html += buildAuditTableHtml(auditData, settings);
  }

  if (!hiddenSections.includes("Summary Statistics")) {
    html += buildAuditSummaryHtml(auditData, settings);
  }

  html += `</div>`;
  return html;
}

export const AUDIT_PDF_COLUMN_CONFIG = {
  "Audit Items": [
    { key: "product", label: "Product" },
    { key: "brand", label: "Brand" },
    { key: "category", label: "Category" },
    { key: "supplier", label: "Supplier" },
    { key: "packageId", label: "Package ID" },
    { key: "metrcTag", label: "Metrc Tag" },
    { key: "totalPkgQty", label: "Total Pkg Qty" },
    { key: "metrcQty", label: "Metrc Qty" },
    { key: "location", label: "Location" },
    { key: "locationQty", label: "Location Qty" },
  ],
  "Summary Statistics": [
    { key: "totalItems", label: "Total Items" },
    { key: "activeItems", label: "Active Items" },
    { key: "inactiveItems", label: "Inactive Items" },
    { key: "discrepancyItems", label: "Items with Discrepancy" },
    { key: "noDiscrepancyItems", label: "Items without Discrepancy" },
    { key: "totalQuantity", label: "Total Quantity" },
    { key: "totalMetrcQty", label: "Total Metrc Qty" },
  ],
};

export const AUDIT_PDF_SECTIONS = ["Audit Items", "Summary Statistics"];
