import * as XLSX from "xlsx";
import { format } from "date-fns";
import type { PdfColumnConfig } from "@/components/ui/pdf-export-drawer";
import type {
  ProfitCostData,
  RevenueComparisonResult,
  SalesIntelligenceTab,
  SalesSummaryExportData,
} from "./types";

export function getExportSections(tab: SalesIntelligenceTab) {
  if (tab === "profit-cost") {
    return ["Metric Summary", "Profit & Loss", "Financial Breakdown", "Performance Trends", "Products Sold at Loss"];
  }
  if (tab === "revenue-comparison") return ["Revenue Comparison"];
  return [
    "Sales Summary",
    "Sales Transactions by Payment Method",
    "Tax Totals",
    "Sales by Category",
    "Product Tag Summary",
    "Brand Performance",
    "Product Summary",
  ];
}

export function getColumnConfig(tab: SalesIntelligenceTab): Record<string, PdfColumnConfig[]> {
  if (tab === "revenue-comparison") {
    return {
      "Revenue Comparison": [
        { key: "metric", label: "Metric" },
        { key: "value", label: "Value" },
      ],
    };
  }
  if (tab === "profit-cost") {
    return {
      "Metric Summary": [
        { key: "metric", label: "Metric" },
        { key: "value", label: "Value" },
      ],
      "Profit & Loss": [
        { key: "name", label: "Name" },
        { key: "totalRevenue", label: "Total Revenue" },
      ],
      "Financial Breakdown": [
        { key: "label", label: "Item" },
        { key: "value", label: "Amount" },
      ],
      "Performance Trends": [
        { key: "date", label: "Date" },
        { key: "aov", label: "AOV ($)" },
        { key: "margin", label: "Gross Margin %" },
        { key: "percentOfOrders", label: "% Orders w/ Discount" },
      ],
      "Products Sold at Loss": [
        { key: "storeName", label: "Store Name" },
        { key: "category", label: "Category" },
        { key: "productName", label: "Product Name" },
        { key: "items", label: "# Items" },
        { key: "netSales", label: "Net Sales" },
        { key: "effectiveDiscount", label: "Effective Discount %" },
        { key: "grossMargin", label: "Gross Margin" },
      ],
    };
  }
  return {
    "Sales Summary": [
      { key: "metric", label: "Metric" },
      { key: "marijuana", label: "Marijuana" },
      { key: "nonMarijuana", label: "Non-Marijuana" },
      { key: "total", label: "Total" },
    ],
    "Sales Transactions by Payment Method": [
      { key: "paymentMethod", label: "Payment Method" },
      { key: "amount", label: "Total Amount" },
    ],
    "Tax Totals": [
      { key: "taxName", label: "Tax Name" },
      { key: "taxRate", label: "Tax Rate %" },
      { key: "totalTax", label: "Total Tax" },
    ],
    "Sales by Category": [
      { key: "categoryName", label: "Category" },
      { key: "netSales", label: "Net Sales" },
      { key: "grossMargin", label: "Gross Margin %" },
    ],
    "Product Tag Summary": [
      { key: "tagName", label: "Product Tag" },
      { key: "netSales", label: "Net Sales" },
      { key: "grossMargin", label: "Gross Margin" },
      { key: "items", label: "# Items" },
      { key: "netSalesPercent", label: "% Net Sales" },
    ],
    "Brand Performance": [
      { key: "brandName", label: "Brand Name" },
      { key: "netSales", label: "Net Sales" },
      { key: "returnsPercentage", label: "Returns % of Sales" },
      { key: "effectiveDiscountPercent", label: "Effective Discount %" },
      { key: "grossMargin", label: "Gross Margin" },
    ],
    "Product Summary": [
      { key: "productName", label: "Product Name" },
      { key: "productSKU", label: "SKU" },
      { key: "brandName", label: "Brand" },
      { key: "categoryName", label: "Category" },
      { key: "grossSales", label: "Gross Sales" },
      { key: "totalDiscount", label: "Discounts" },
      { key: "itemsSold", label: "# Items" },
      { key: "grossProfit", label: "Gross Profit" },
    ],
  };
}

function fmt(v: any) {
  if (v === null || v === undefined) return "$0.00";
  const n = parseFloat(v);
  return n < 0 ? `-$${Math.abs(n).toFixed(2)}` : `$${Math.abs(n).toFixed(2)}`;
}
function fmtPct(v: any) {
  if (v === null || v === undefined) return "0.0%";
  const n = parseFloat(v);
  return n < 0 ? `-${Math.abs(n).toFixed(1)}%` : `${Math.abs(n).toFixed(1)}%`;
}
function renderMetricForExport(val: any, valueType: string, columnKey: string) {
  if ((valueType === "count" || valueType === "percent") && columnKey !== "total") return "-";
  if (valueType === "count") return Number(val || 0);
  if (valueType === "percent") return fmtPct(val);
  return fmt(val);
}

function th(label: string, align: "left" | "right" = "left") {
  return `<th style="padding:5px 8px;border:1px solid #e2e8f0;background:#f8fafc;font-weight:600;text-align:${align};color:#475569;">${label}</th>`;
}
function td(val: any, align: "left" | "right" = "left") {
  return `<td style="padding:5px 8px;border:1px solid #f1f5f9;text-align:${align};color:#334155;">${val ?? "-"}</td>`;
}
function tableOpen() {
  return `<table style="width:100%;border-collapse:collapse;margin-bottom:20px;font-size:11px;">`;
}
function section(title: string) {
  return `<h3 style="margin:20px 0 8px;font-size:13px;border-bottom:2px solid #0ea5e9;padding-bottom:5px;color:#1e293b;font-weight:600;">${title}</h3>`;
}
function metaCard(label: string, value: string, color = "#0ea5e9") {
  return `<div style="display:inline-block;padding:8px 14px;margin:4px;border-radius:8px;background:#f8fafc;border:1px solid #e2e8f0;min-width:140px;vertical-align:top;">
    <div style="font-size:10px;color:#64748b;font-weight:600;text-transform:uppercase;margin-bottom:3px;">${label}</div>
    <div style="font-size:15px;font-weight:700;color:${color};">${value}</div>
  </div>`;
}

interface ExportMetadata {
  store: string;
  dateCreated: string;
  dateRange: string;
}

export function buildSalesSummaryHtml(
  data: SalesSummaryExportData,
  metadata: ExportMetadata,
  settings: { hiddenSections: string[] },
) {
  const hidden = settings.hiddenSections || [];
  const { eodData = [], taxData = [], categoryData = [], tagData = [], brandData = [], productData = [], saleTransactions = [], onlineBreakdown = [] } = data;

  let html = `<div style="font-family:Arial,sans-serif;font-size:12px;color:#334155;max-width:900px;">`;
  html += `<h2 style="margin-bottom:4px;color:#1e293b;font-size:18px;">Sales Intelligence — Sales Summary</h2>`;
  html += `<p style="margin:0 0 2px;color:#64748b;font-size:11px;">Date Range: ${metadata.dateRange}</p>`;
  html += `<p style="margin:0;color:#94a3b8;font-size:10px;">Generated: ${metadata.dateCreated} | Store: ${metadata.store || "—"}</p>`;
  html += `<hr style="margin:12px 0;border:none;border-top:2px solid #e2e8f0;"/>`;

  if (!hidden.includes("Sales Summary") && eodData.length > 0) {
    html += section("Sales Summary");
    html += tableOpen();
    html += `<thead><tr>${th("Metric")}${th("Marijuana", "right")}${th("Non-Marijuana", "right")}${th("Total", "right")}</tr></thead><tbody>`;
    eodData.forEach((r) => {
      html += `<tr>${td(r.metric)}${td(renderMetricForExport(r.marijuana, r.valueType, "marijuana"), "right")}${td(renderMetricForExport(r.nonMarijuana, r.valueType, "nonMarijuana"), "right")}${td(renderMetricForExport(r.total, r.valueType, "total"), "right")}</tr>`;
    });
    html += `</tbody></table>`;
  }

  const allTransactions = [
    ...saleTransactions.map((t) => ({ paymentMethod: t.displayName || t.paymentMethod, amount: fmt(t.totalFinalPayable || 0) })),
    ...onlineBreakdown.map((m) => ({ paymentMethod: `  └ ${m.displayName || m.onlinePaymentMethod}`, amount: fmt(m.totalFinalPayable || 0) })),
  ];
  if (!hidden.includes("Sales Transactions by Payment Method") && allTransactions.length > 0) {
    html += section("Sales Transactions by Payment Method");
    html += tableOpen();
    html += `<thead><tr>${th("Payment Method")}${th("Total Amount", "right")}</tr></thead><tbody>`;
    allTransactions.forEach((r) => { html += `<tr>${td(r.paymentMethod)}${td(r.amount, "right")}</tr>`; });
    html += `</tbody></table>`;
  }

  if (!hidden.includes("Tax Totals") && taxData.length > 0) {
    html += section("Tax Totals");
    html += tableOpen();
    html += `<thead><tr>${th("Tax Name")}${th("Tax Rate %", "right")}${th("Total Tax", "right")}</tr></thead><tbody>`;
    taxData.forEach((r) => { html += `<tr>${td(r.taxName || "-")}${td(fmtPct(r.taxRate), "right")}${td(fmt(r.totalTax), "right")}</tr>`; });
    html += `</tbody></table>`;
  }

  if (!hidden.includes("Sales by Category") && categoryData.length > 0) {
    html += section("Sales by Category");
    html += tableOpen();
    html += `<thead><tr>${th("Category")}${th("Net Sales", "right")}${th("Gross Margin %", "right")}</tr></thead><tbody>`;
    categoryData.forEach((r) => { html += `<tr>${td(r.categoryName || "-")}${td(fmt(r.netSales), "right")}${td(fmtPct(r.grossMargin), "right")}</tr>`; });
    html += `</tbody></table>`;
  }

  if (!hidden.includes("Product Tag Summary") && tagData.length > 0) {
    html += section("Product Tag Summary");
    html += tableOpen();
    html += `<thead><tr>${th("Product Tag")}${th("Net Sales", "right")}${th("Gross Margin", "right")}${th("# Items", "right")}${th("% Net Sales", "right")}</tr></thead><tbody>`;
    tagData.forEach((r) => { html += `<tr>${td(r.tagName || r.name || "-")}${td(fmt(r.netSales), "right")}${td(fmtPct(r.grossMargin), "right")}${td(r.items ?? "-", "right")}${td(fmtPct(r.netSalesPercent), "right")}</tr>`; });
    html += `</tbody></table>`;
  }

  if (!hidden.includes("Brand Performance") && brandData.length > 0) {
    html += section("Brand Performance");
    html += tableOpen();
    html += `<thead><tr>${th("Brand Name")}${th("Net Sales", "right")}${th("Returns % of Sales", "right")}${th("Effective Discount %", "right")}${th("Gross Margin", "right")}</tr></thead><tbody>`;
    brandData.forEach((r) => { html += `<tr>${td(r.brandName || "-")}${td(fmt(r.netSales), "right")}${td(fmtPct(r.returnsPercentage), "right")}${td(fmtPct(r.effectiveDiscountPercent), "right")}${td(fmtPct(r.grossMargin), "right")}</tr>`; });
    html += `</tbody></table>`;
  }

  if (!hidden.includes("Product Summary") && productData.length > 0) {
    html += section("Product Summary");
    html += tableOpen();
    html += `<thead><tr>${th("Product Name")}${th("SKU")}${th("Brand")}${th("Category")}${th("Gross Sales", "right")}${th("Discounts", "right")}${th("# Items", "right")}${th("Gross Profit", "right")}</tr></thead><tbody>`;
    productData.forEach((r) => { html += `<tr>${td(r.productName || "-")}${td(r.productSKU || "-")}${td(r.brandName || "-")}${td(r.categoryName || "-")}${td(fmt(r.grossSales), "right")}${td(fmt(r.totalDiscount), "right")}${td(r.itemsSold ?? "-", "right")}${td(fmt(r.grossProfit), "right")}</tr>`; });
    html += `</tbody></table>`;
  }

  html += `</div>`;
  return html;
}

export function buildProfitCostHtml(
  data: ProfitCostData,
  metadata: ExportMetadata,
  settings: { hiddenSections: string[] },
) {
  const hidden = settings.hiddenSections || [];
  const summary = data?.summary || {};
  const grossSales = summary.grossSales || 0;
  const discounts = summary.discounts || 0;
  const returns = summary.returns || 0;
  const netSales = grossSales - discounts - returns;
  const cogs = summary.cogs || 0;
  const grossProfit = summary.grossProfit || 0;
  const grossMargin = summary.grossMargin || 0;

  let html = `<div style="font-family:Arial,sans-serif;font-size:12px;color:#334155;max-width:900px;">`;
  html += `<h2 style="margin-bottom:4px;color:#1e293b;font-size:18px;">Sales Intelligence — Profit &amp; Cost</h2>`;
  html += `<p style="margin:0 0 2px;color:#64748b;font-size:11px;">Date Range: ${metadata.dateRange}</p>`;
  html += `<p style="margin:0;color:#94a3b8;font-size:10px;">Generated: ${metadata.dateCreated} | Store: ${metadata.store || "—"}</p>`;
  html += `<hr style="margin:12px 0;border:none;border-top:2px solid #e2e8f0;"/>`;

  if (!hidden.includes("Metric Summary")) {
    html += section("Metric Summary");
    html += `<div style="margin-bottom:16px;">`;
    html += metaCard("Gross Profit", fmt(grossProfit), "#10b981");
    html += metaCard("Gross Margin", fmtPct(grossMargin), "#0ea5e9");
    html += metaCard("Net Sales", fmt(netSales), "#6366f1");
    html += metaCard("Cost of Goods (COGS)", fmt(Math.abs(cogs)), "#f43f5e");
    html += `</div>`;
  }

  if (!hidden.includes("Profit & Loss")) {
    html += section("Profit & Loss");
    html += tableOpen();
    html += `<thead><tr>${th("Name")}${th("Total Revenue", "right")}</tr></thead><tbody>`;
    [
      { name: "Gross Sales", totalRevenue: fmt(grossSales) },
      { name: "Discounts", totalRevenue: fmt(-discounts) },
      { name: "Returns", totalRevenue: fmt(-returns) },
      { name: "Net Sales", totalRevenue: fmt(netSales) },
      { name: "COGS", totalRevenue: fmt(-cogs) },
      { name: "Gross Profit", totalRevenue: fmt(grossProfit) },
    ].forEach((r) => { html += `<tr>${td(r.name)}${td(r.totalRevenue, "right")}</tr>`; });
    html += `</tbody></table>`;
  }

  if (!hidden.includes("Financial Breakdown")) {
    html += section("Financial Breakdown");
    html += tableOpen();
    html += `<thead><tr>${th("Item")}${th("Amount", "right")}</tr></thead><tbody>`;
    [
      { label: "Gross Sales", value: fmt(grossSales) },
      { label: "Discounts", value: fmt(discounts) },
      { label: "Returns", value: fmt(returns) },
      { label: "COGS", value: fmt(cogs) },
    ].forEach((r) => { html += `<tr>${td(r.label)}${td(r.value, "right")}</tr>`; });
    html += `</tbody></table>`;
  }

  const dailyData = data?.dailyData || [];
  if (!hidden.includes("Performance Trends") && dailyData.length > 0) {
    html += section("Performance Trends (Daily)");
    html += tableOpen();
    html += `<thead><tr>${th("Date")}${th("AOV ($)", "right")}${th("Gross Margin %", "right")}${th("% Orders w/ Discount", "right")}</tr></thead><tbody>`;
    dailyData.forEach((item) => {
      html += `<tr>${td(format(new Date(item.date), "MMM dd, yyyy"))}${td(fmt(item.aov || 0), "right")}${td(fmtPct(item.grossMargin || 0), "right")}${td(fmtPct(item.percentOrdersWithDiscount || 0), "right")}</tr>`;
    });
    html += `</tbody></table>`;
  }

  const atLoss = (data?.productsSoldAtLoss || []).map((item) => ({
    storeName: item.storeName || "-",
    category: item.categoryName || "-",
    productName: item.productName || "-",
    items: item.itemsCount || 0,
    netSales: fmt(item.netSales),
    effectiveDiscount: fmtPct(item.effectiveDiscountPercent),
    grossMargin: fmt(item.grossProfit),
  }));
  if (!hidden.includes("Products Sold at Loss") && atLoss.length > 0) {
    html += section("Products Sold at Loss");
    html += tableOpen();
    html += `<thead><tr>${th("Store")}${th("Category")}${th("Product")}${th("# Items", "right")}${th("Net Sales", "right")}${th("Eff. Discount %", "right")}${th("Gross Margin", "right")}</tr></thead><tbody>`;
    atLoss.forEach((r) => { html += `<tr>${td(r.storeName)}${td(r.category)}${td(r.productName)}${td(r.items, "right")}${td(r.netSales, "right")}${td(r.effectiveDiscount, "right")}${td(r.grossMargin, "right")}</tr>`; });
    html += `</tbody></table>`;
  }

  html += `</div>`;
  return html;
}

export function buildRevenueComparisonHtml(
  data: RevenueComparisonResult | null,
  metadata: ExportMetadata,
  settings: { hiddenSections: string[] },
) {
  const hidden = settings.hiddenSections || [];
  let html = `<div style="font-family:Arial,sans-serif;font-size:12px;color:#334155;max-width:900px;">`;
  html += `<h2 style="margin-bottom:4px;color:#1e293b;font-size:18px;">Sales Intelligence — Revenue Comparison</h2>`;
  html += `<p style="margin:0 0 2px;color:#64748b;font-size:11px;">Date Range: ${metadata.dateRange}</p>`;
  html += `<p style="margin:0;color:#94a3b8;font-size:10px;">Generated: ${metadata.dateCreated} | Store: ${metadata.store || "—"}</p>`;
  html += `<hr style="margin:12px 0;border:none;border-top:2px solid #e2e8f0;"/>`;

  if (!data) {
    html += `<p style="color:#94a3b8;font-style:italic;">No comparison data available. Please click "Calculate Change" first.</p>`;
  } else if (!hidden.includes("Revenue Comparison")) {
    html += `<div style="margin-bottom:16px;">`;
    html += metaCard("Previous Period Revenue", fmt(data.previousRevenue), "#64748b");
    html += metaCard("Current Period Revenue", fmt(data.currentRevenue), "#0ea5e9");
    html += metaCard(data.isIncrease ? "Revenue Increase" : "Revenue Decrease", `${data.isIncrease ? "+" : "-"}${Math.abs(data.percentageChange).toFixed(1)}%`, data.isIncrease ? "#10b981" : "#ef4444");
    html += metaCard("Difference", `${data.isIncrease ? "+" : "-"}${fmt(Math.abs(data.difference))}`, data.isIncrease ? "#10b981" : "#ef4444");
    html += `</div>`;

    html += section("Revenue Comparison");
    html += tableOpen();
    html += `<thead><tr>${th("Metric")}${th("Value", "right")}</tr></thead><tbody>`;
    [
      { metric: "Previous Period Revenue", value: fmt(data.previousRevenue) },
      { metric: "Current Period Revenue", value: fmt(data.currentRevenue) },
      { metric: "Difference", value: `${data.isIncrease ? "+" : "-"}${fmt(Math.abs(data.difference))}` },
      { metric: "% Change", value: `${data.isIncrease ? "+" : "-"}${Math.abs(data.percentageChange).toFixed(1)}%` },
      { metric: "Trend", value: data.isIncrease ? "Revenue Increased" : "Revenue Decreased" },
    ].forEach((row) => { html += `<tr>${td(row.metric)}${td(row.value, "right")}</tr>`; });
    html += `</tbody></table>`;
  }

  html += `</div>`;
  return html;
}

function sheetsFromRows(rows: { name: string; data: any[][] }[]) {
  return rows.length > 0 ? rows : [{ name: "No Data", data: [["No data available"]] }];
}

export function buildSalesSummaryExcelSheets(data: SalesSummaryExportData) {
  const { eodData = [], taxData = [], categoryData = [], tagData = [], brandData = [], productData = [], saleTransactions = [], onlineBreakdown = [] } = data;
  const sheets: { name: string; data: any[][] }[] = [];

  if (eodData.length > 0) {
    sheets.push({
      name: "Sales Summary",
      data: [
        ["Metric", "Marijuana", "Non-Marijuana", "Total"],
        ...eodData.map((r) => [r.metric, renderMetricForExport(r.marijuana, r.valueType, "marijuana"), renderMetricForExport(r.nonMarijuana, r.valueType, "nonMarijuana"), renderMetricForExport(r.total, r.valueType, "total")]),
      ],
    });
  }

  const txRows = [
    ...saleTransactions.map((t) => [t.displayName || t.paymentMethod || "-", fmt(t.totalFinalPayable || 0)]),
    ...onlineBreakdown.map((m) => [`  ${m.displayName || m.onlinePaymentMethod || "-"}`, fmt(m.totalFinalPayable || 0)]),
  ];
  if (txRows.length > 0) {
    sheets.push({ name: "Payment Methods", data: [["Payment Method", "Total Amount"], ...txRows] });
  }

  if (taxData.length > 0) {
    sheets.push({ name: "Tax Totals", data: [["Tax Name", "Tax Rate %", "Total Tax"], ...taxData.map((r) => [r.taxName || "-", fmtPct(r.taxRate), fmt(r.totalTax)])] });
  }
  if (categoryData.length > 0) {
    sheets.push({ name: "Sales by Category", data: [["Category", "Net Sales", "Gross Margin %"], ...categoryData.map((r) => [r.categoryName || "-", fmt(r.netSales), fmtPct(r.grossMargin)])] });
  }
  if (tagData.length > 0) {
    sheets.push({ name: "Product Tag Summary", data: [["Product Tag", "Net Sales", "Gross Margin", "# Items", "% Net Sales"], ...tagData.map((r) => [r.tagName || r.name || "-", fmt(r.netSales), fmtPct(r.grossMargin), r.items ?? "-", fmtPct(r.netSalesPercent)])] });
  }
  if (brandData.length > 0) {
    sheets.push({ name: "Brand Performance", data: [["Brand Name", "Net Sales", "Returns %", "Eff. Discount %", "Gross Margin"], ...brandData.map((r) => [r.brandName || "-", fmt(r.netSales), fmtPct(r.returnsPercentage), fmtPct(r.effectiveDiscountPercent), fmtPct(r.grossMargin)])] });
  }
  if (productData.length > 0) {
    sheets.push({ name: "Product Summary", data: [["Product Name", "SKU", "Brand", "Category", "Gross Sales", "Discounts", "# Items", "Gross Profit"], ...productData.map((r) => [r.productName || "-", r.productSKU || "-", r.brandName || "-", r.categoryName || "-", fmt(r.grossSales), fmt(r.totalDiscount), r.itemsSold ?? "-", fmt(r.grossProfit)])] });
  }

  return sheetsFromRows(sheets);
}

export function buildProfitCostExcelSheets(data: ProfitCostData) {
  const summary = data?.summary || {};
  const grossSales = summary.grossSales || 0;
  const discounts = summary.discounts || 0;
  const returns = summary.returns || 0;
  const netSales = grossSales - discounts - returns;
  const cogs = summary.cogs || 0;
  const grossProfit = summary.grossProfit || 0;
  const grossMargin = summary.grossMargin || 0;

  const sheets: { name: string; data: any[][] }[] = [
    {
      name: "Metric Summary",
      data: [
        ["Metric", "Value"],
        ["Gross Profit", fmt(grossProfit)],
        ["Gross Margin", fmtPct(grossMargin)],
        ["Net Sales", fmt(netSales)],
        ["Cost of Goods (COGS)", fmt(Math.abs(cogs))],
      ],
    },
    {
      name: "Profit & Loss",
      data: [
        ["Name", "Total Revenue"],
        ["Gross Sales", fmt(grossSales)],
        ["Discounts", fmt(-discounts)],
        ["Returns", fmt(-returns)],
        ["Net Sales", fmt(netSales)],
        ["COGS", fmt(-cogs)],
        ["Gross Profit", fmt(grossProfit)],
      ],
    },
    {
      name: "Financial Breakdown",
      data: [
        ["Item", "Amount"],
        ["Gross Sales", fmt(grossSales)],
        ["Discounts", fmt(discounts)],
        ["Returns", fmt(returns)],
        ["COGS", fmt(cogs)],
      ],
    },
  ];

  const dailyData = data?.dailyData || [];
  if (dailyData.length > 0) {
    sheets.push({
      name: "Performance Trends",
      data: [
        ["Date", "AOV ($)", "Gross Margin %", "% Orders w/ Discount"],
        ...dailyData.map((d) => [format(new Date(d.date), "MMM dd, yyyy"), fmt(d.aov || 0), fmtPct(d.grossMargin || 0), fmtPct(d.percentOrdersWithDiscount || 0)]),
      ],
    });
  }

  const atLoss = data?.productsSoldAtLoss || [];
  if (atLoss.length > 0) {
    sheets.push({
      name: "Products Sold at Loss",
      data: [
        ["Store Name", "Category", "Product Name", "# Items", "Net Sales", "Effective Discount %", "Gross Margin"],
        ...atLoss.map((item) => [item.storeName || "-", item.categoryName || "-", item.productName || "-", item.itemsCount || 0, fmt(item.netSales), fmtPct(item.effectiveDiscountPercent), fmt(item.grossProfit)]),
      ],
    });
  }

  return sheetsFromRows(sheets);
}

export function buildRevenueComparisonExcelSheets(data: RevenueComparisonResult | null) {
  if (!data) return sheetsFromRows([]);
  return sheetsFromRows([
    {
      name: "Revenue Comparison",
      data: [
        ["Metric", "Value"],
        ["Previous Period Revenue", fmt(data.previousRevenue)],
        ["Current Period Revenue", fmt(data.currentRevenue)],
        ["Difference", `${data.isIncrease ? "+" : "-"}${fmt(Math.abs(data.difference))}`],
        ["% Change", `${data.isIncrease ? "+" : "-"}${Math.abs(data.percentageChange).toFixed(1)}%`],
        ["Trend", data.isIncrease ? "Revenue Increased" : "Revenue Decreased"],
      ],
    },
  ]);
}

export function exportSheetsToExcel(sheets: { name: string; data: any[][] }[], filename: string) {
  const wb = XLSX.utils.book_new();
  sheets.forEach((sheet) => {
    const ws = XLSX.utils.aoa_to_sheet(sheet.data);
    XLSX.utils.book_append_sheet(wb, ws, sheet.name.substring(0, 31));
  });
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

function downloadCsv(rows: (string | number)[][], filename: string) {
  const csv = rows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
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

export function exportSalesSummaryToCsv(data: SalesSummaryExportData) {
  const { eodData = [], taxData = [], categoryData = [], tagData = [], brandData = [], productData = [], saleTransactions = [], onlineBreakdown = [] } = data;
  const rows: (string | number)[][] = [["Section", "Item", "Marijuana", "Non-Marijuana / Detail", "Total"]];
  eodData.forEach((r) => rows.push(["Sales Summary", r.metric, String(renderMetricForExport(r.marijuana, r.valueType, "marijuana")), String(renderMetricForExport(r.nonMarijuana, r.valueType, "nonMarijuana")), String(renderMetricForExport(r.total, r.valueType, "total"))]));
  [...saleTransactions, ...onlineBreakdown].forEach((t: any) => rows.push(["Payment Transactions", t.displayName || t.paymentMethod || t.onlinePaymentMethod || "-", "-", "-", fmt(t.totalFinalPayable || 0)]));
  taxData.forEach((r) => rows.push(["Tax Totals", r.taxName || "-", fmtPct(r.taxRate), "-", fmt(r.totalTax)]));
  categoryData.forEach((r) => rows.push(["Sales by Category", r.categoryName || "-", fmt(r.netSales), fmtPct(r.grossMargin), "-"]));
  tagData.forEach((r) => rows.push(["Product Tag Summary", r.tagName || r.name || "-", fmt(r.netSales), `${r.items ?? "-"} items`, fmtPct(r.netSalesPercent)]));
  brandData.forEach((r) => rows.push(["Brand Performance", r.brandName || "-", fmt(r.netSales), fmtPct(r.effectiveDiscountPercent), fmtPct(r.grossMargin)]));
  productData.forEach((r) => rows.push(["Product Summary", r.productName || "-", fmt(r.grossSales), fmt(r.totalDiscount), fmt(r.grossProfit)]));
  downloadCsv(rows, "sales_intelligence_summary.csv");
}

export function exportProfitCostToCsv(data: ProfitCostData) {
  const summary = data?.summary || {};
  const grossSales = summary.grossSales || 0;
  const discounts = summary.discounts || 0;
  const returns = summary.returns || 0;
  const netSales = grossSales - discounts - returns;
  const cogs = summary.cogs || 0;
  const grossProfit = summary.grossProfit || 0;
  const grossMargin = summary.grossMargin || 0;

  const rows: (string | number)[][] = [
    ["Section", "Item / Metric", "Value"],
    ["Metric Summary", "Gross Profit", fmt(grossProfit)],
    ["Metric Summary", "Gross Margin", fmtPct(grossMargin)],
    ["Metric Summary", "Net Sales", fmt(netSales)],
    ["Metric Summary", "Cost of Goods (COGS)", fmt(Math.abs(cogs))],
    ["Profit & Loss", "Gross Sales", fmt(grossSales)],
    ["Profit & Loss", "Discounts", fmt(-discounts)],
    ["Profit & Loss", "Returns", fmt(-returns)],
    ["Profit & Loss", "Net Sales", fmt(netSales)],
    ["Profit & Loss", "COGS", fmt(-cogs)],
    ["Profit & Loss", "Gross Profit", fmt(grossProfit)],
    ["Financial Breakdown", "Gross Sales", fmt(grossSales)],
    ["Financial Breakdown", "Discounts", fmt(discounts)],
    ["Financial Breakdown", "Returns", fmt(returns)],
    ["Financial Breakdown", "COGS", fmt(cogs)],
  ];
  (data?.dailyData || []).forEach((item) =>
    rows.push(["Performance Trends", format(new Date(item.date), "MMM dd, yyyy"), `AOV: ${fmt(item.aov || 0)} | Margin: ${fmtPct(item.grossMargin || 0)} | Discount Orders: ${fmtPct(item.percentOrdersWithDiscount || 0)}`]),
  );
  (data?.productsSoldAtLoss || []).forEach((item) =>
    rows.push(["Products Sold at Loss", item.productName || "-", `Net Sales: ${fmt(item.netSales)} | Eff. Discount: ${fmtPct(item.effectiveDiscountPercent)} | Gross Margin: ${fmt(item.grossProfit)}`]),
  );
  downloadCsv(rows, "sales_intelligence_profit_cost.csv");
}

export function exportRevenueComparisonToCsv(data: RevenueComparisonResult) {
  const rows: (string | number)[][] = [
    ["Metric", "Value"],
    ["Previous Period Revenue", fmt(data.previousRevenue)],
    ["Current Period Revenue", fmt(data.currentRevenue)],
    ["Difference", `${data.isIncrease ? "+" : "-"}${fmt(Math.abs(data.difference))}`],
    ["% Change", `${data.isIncrease ? "+" : "-"}${Math.abs(data.percentageChange).toFixed(1)}%`],
    ["Trend", data.isIncrease ? "Revenue Increased" : "Revenue Decreased"],
  ];
  downloadCsv(rows, "sales_intelligence_revenue_comparison.csv");
}
