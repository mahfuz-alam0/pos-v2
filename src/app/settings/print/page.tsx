"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Loader2, Printer, Settings, ExternalLink } from "lucide-react";

import { fetchLabels } from "@/services/labels/list";
import { createLabel } from "@/services/labels/create";
import { updateLabel } from "@/services/labels/update";
import { fetchPrintTemplates } from "@/services/printTemplates/list";
import { createPrintTemplate } from "@/services/printTemplates/create";
import { updatePrintTemplate } from "@/services/printTemplates/update";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

import { LabelFieldMap } from "@/app/settings/labels/labelFieldMap";

// ─── constants ────────────────────────────────────────────────────────────

const LABEL_TYPES = ["PACKAGE_LABEL", "EXIT_LABEL", "RECEIPT"];

const SECTION_LABELS: Record<string, string> = {
  PACKAGE_LABEL: "Package Label",
  EXIT_LABEL: "Exit Label",
  RECEIPT: "Receipt",
};

const RECEIPT_WIDTHS = [
  { label: '2 1/4" (55mm)', value: 55 },
  { label: '3" (72mm)', value: 72 },
  { label: '3 1/8" (80mm)', value: 80 },
];

const TYPE_COLOR: Record<string, string> = {
  PACKAGE_LABEL: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400",
  EXIT_LABEL: "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400",
  RECEIPT: "bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-400",
  DELIVERY_RECEIPT: "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400",
  PRE_ORDER_FULFILLMENT_PULL_SHEET: "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-400",
};

// Sample values injected into the preview for each label type
const SAMPLE_VALUES: Record<string, Record<string, string | null>> = {
  PACKAGE_LABEL: {
    package_id: "1234567890",
    package_barcode: "1234567890",
    package_id_qr: "1234567890",
    product_name: "This is a test Product Name 200mg",
    strain_name: "Blue Dream",
    store_name: "Store Name",
    store_license: "XXXX-XXXX-XXXX",
    net_weight: "1g (0.04oz)",
    origin_id: null,
    sku: "123ProductSku456",
    batch_id: "1234567890",
    supplier_name: "Test Supplier",
    supplier_license: "123456789",
    test_results: "THC: 25.03% CBD: 1.23%",
    test_results_qr: "THC: 25.03% CBD: 1.23%",
    total_terpenes: "Pinene: 1.2%, Lemonene: 0.5%",
    product_category: "Flower",
    product_price: "$20.00 / g",
    expiration_date: "Jan 1st 2026",
    package_text: null,
    current_datetime: format(new Date(), "MMM do yyyy"),
    metrc_tag: "1A4FF0200000022000007090",
  },
  EXIT_LABEL: {
    product_name: "This is a test Product Name 200mg",
    order_date: format(new Date(), "MMM do yyyy"),
    patient_name: null,
    patient_license: null,
    strain_name: "Blue Dream",
    store_name: "Example Store",
    store_license: "XXXX-XXXX-XXXX",
    net_weight: "1g (0.04oz)",
    mj_weight: "1g (0.04oz)",
    origin_id: null,
    sku: "123ProductSku456",
    package_id: "1234567890",
    batch_id: "1234567890",
    harvest_date: "Apr 20th 2019",
    manufacture_date: "Apr 20th 2019",
    date_tested: "Apr 20th 2019",
    supplier_name: "Example Supplier (123456789)",
    supplier_license: "123456789",
    test_results: "THC: 25.03%, THCA: 2.03%, CBD: 1.23%, CBDA: 1.20%, CBN: 0.34%",
    test_results_qr: "https://example.com/test-results",
    test_lab_name: "Example Testing Lab",
    test_facility_license: "123456789",
    test_results_url: "https://example.com/test-results",
    total_terpenes: "Pinene: 1.2%, Lemonene: 0.5%, Linalool: 0.3%",
    product_category: "Flower",
    product_price: "$20.00",
    expiration_date: "Jan 1st 2026",
    current_datetime: format(new Date(), "MMM do yyyy"),
  },
  RECEIPT: {
    company_logo: null,
    print_date: format(new Date(), "MMM do yyyy h:mm:ss a"),
    store_id: "XXXX-XXXX-XXXX",
    order_id: "12345678",
    store_name: "Example Store",
    store_address: "123 Example St, City, ST, 00000",
    store_phone: "000-000-0000",
    store_email: "store@example.com",
    return_reason: "No Return Allowed",
    customer_name: "John Doe",
    customer_type: "Medical",
    customer_id: "ABC12345",
    loyalty_points_earned: "3 pts",
    budtender: "Jane Smith",
    excise_tax_notification: "*If applicable, cannabis excise taxes are included in the total.",
    order_contents: null,
    order_barcode: "12345678",
    current_datetime: format(new Date(), "MMM do yyyy"),
    ios_app_qr: null,
    android_app_qr: null,
  },
};

// ─── custom preview templates (zero dependency on API template HTML) ──────

async function genQrDataUrl(value: string): Promise<string | null> {
  try {
    const QRCode = await import("qrcode");
    return await QRCode.toDataURL(String(value), {
      width: 120,
      margin: 1,
      errorCorrectionLevel: "M",
      type: "image/png",
    });
  } catch {
    return null;
  }
}

async function genBarcodeDataUrl(value: string): Promise<string | null> {
  try {
    const JsBarcode = (await import("jsbarcode")).default;
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const code39 = /^[A-Z0-9\-.$/+%* ]*$/;
    JsBarcode(svg, String(value), {
      format: code39.test(String(value).toUpperCase()) ? "CODE39" : "CODE128",
      width: 2,
      height: 55,
      displayValue: true,
      fontSize: 11,
      margin: 2,
      background: "#fff",
      lineColor: "#000",
    });
    const svgStr = new XMLSerializer().serializeToString(svg);
    return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgStr)))}`;
  } catch {
    return null;
  }
}

// NOTE: Do NOT target html/body here — those rules leak into the main page
// when the template is injected into a DOM node for printing.
const BASE_STYLE = (config?: Config) => `
  <style>
    #gjs-label-layout-temp-content,
    #gjs-label-layout-temp-content * {
      box-sizing: border-box;
      font-family: Arial, Helvetica, sans-serif;
      font-size: ${config?.fontSize || 3}pt;
      color: #000;
    }
    #gjs-label-layout-temp-content { margin: 0; padding: 0; }
    @media print {
      html, body {
        margin: 0; padding: 0;
        font-family: Arial, Helvetica, sans-serif;
        font-size: ${config?.fontSize || 3}pt;
      }
    }
  </style>`;

interface Config {
  name?: string;
  fieldExclusions: string[];
  dimensions: { width: number | string; height: number | string };
  margins: { top: number | string; right: number | string; bottom: number | string; left: number | string };
  fontSize: number | string;
  packageIdMode?: "qr" | "barcode";
  textAlign?: "left" | "center" | "right";
  barcodeDigits?: string;
  logoUrl?: string | null;
  qrWidth?: string | null;
  qrHeight?: string | null;
  customText?: string;
  customTextEnabled?: boolean;
  googleReviewUrl?: string;
  googleReviewEnabled?: boolean;
}

function buildTemplateHtml(type: string, config: Config): string {
  const excluded = new Set(config?.fieldExclusions ?? []);
  const show = (id: string) => !excluded.has(id);

  if (type === "PACKAGE_LABEL") return pkgTemplate(config, show);
  if (type === "EXIT_LABEL") return exitTemplate(show);
  if (type === "RECEIPT") return receiptTemplate(show, config);
  return "";
}

function pkgTemplate(config: Config, show: (id: string) => boolean): string {
  const mode = config?.packageIdMode ?? "qr";
  const labelH = parseFloat(String(config?.dimensions?.height ?? 1.25));
  const textAlign = config?.textAlign ?? "center";

  const customQrW = config?.qrWidth ? `${parseFloat(config.qrWidth)}in` : null;
  const customQrH = config?.qrHeight ? `${parseFloat(config.qrHeight)}in` : null;
  const qrSize = customQrW ?? `min(38%, calc(${labelH}in - 10px))`;

  const barcodeMinH = Math.max(0.35, labelH * 0.65).toFixed(3);

  const tf = `word-break:break-word;overflow-wrap:break-word;margin-bottom:1px;text-align:${textAlign};`;
  const textFields = [
    `<div id="container-product_name" style="${tf}display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;"><span id="d-product_name" style="font-weight:bold;"></span></div>`,
    `<div id="container-package_id" style="${tf}">Pkg ID: <span id="d-package_id"></span></div>`,
    `<div id="container-metrc_tag" style="${tf}"> <span id="d-metrc_tag"></span></div>`,
    `<div id="container-product_price" style="${tf}">Price: <span id="d-product_price"></span></div>`,
    `<div id="container-strain_name" style="${tf}">Strain: <span id="d-strain_name"></span></div>`,
    `<div id="container-store_name" style="${tf}"><span id="d-store_name"></span></div>`,
    `<div id="container-net_weight" style="${tf}">Net Wt: <span id="d-net_weight"></span></div>`,
    `<div id="container-sku" style="${tf}">SKU: <span id="d-sku"></span></div>`,
    `<div id="container-batch_id" style="${tf}">Batch: <span id="d-batch_id"></span></div>`,
    `<div id="container-supplier_name" style="${tf}">Supplier: <span id="d-supplier_name"></span></div>`,
    `<div id="container-expiration_date" style="${tf}">Exp: <span id="d-expiration_date"></span></div>`,
    `<div id="container-test_results" style="${tf}"><span id="d-test_results"></span></div>`,
    `<div id="container-current_datetime" style="${tf}"><span id="d-current_datetime"></span></div>`,
    `<div id="container-custom_label_text" style="${tf}margin-top:2px;"><span id="d-custom_label_text"></span></div>`,
  ].join("");

  if (mode === "qr" && show("package_id_qr")) {
    const qrContainerStyle = customQrH
      ? `flex-shrink:0;margin-right:4px;width:${qrSize};height:${customQrH};overflow:hidden;`
      : `flex-shrink:0;margin-right:4px;width:${qrSize};aspect-ratio:1/1;overflow:hidden;`;
    return `${BASE_STYLE(config)}
      <div style="display:flex;align-items:flex-start;padding:5px;width:100%;height:${labelH}in;box-sizing:border-box;overflow:hidden;">
        <div id="container-package_id_qr" style="${qrContainerStyle}"></div>
        <div style="flex:1;min-width:0;">
          ${textFields || "<em style='color:#aaa'>No fields enabled</em>"}
        </div>
      </div>`;
  }

  const barcodeJustify = textAlign === "left" ? "flex-start" : textAlign === "right" ? "flex-end" : "center";
  return `${BASE_STYLE(config)}
    <div style="padding:5px;display:flex;flex-direction:column;height:${labelH}in;box-sizing:border-box;">
      <div style="flex-shrink:0;margin-bottom:2px;text-align:${textAlign};">
        ${textFields}
      </div>
      ${
        show("package_barcode")
          ? `<div id="container-package_barcode" style="flex:1;width:100%;min-height:${barcodeMinH}in;display:flex;align-items:center;justify-content:${barcodeJustify};"></div>`
          : ""
      }
    </div>`;
}

function exitTemplate(show: (id: string) => boolean): string {
  const rows = [
    show("product_name") &&
      `<div id="container-product_name" style="font-weight:bold;margin-bottom:2px;"><span id="d-product_name"></span></div>`,
    show("strain_name") &&
      `<div id="container-strain_name" style="margin-bottom:1px;">Strain: <span id="d-strain_name"></span></div>`,
    show("store_name") &&
      `<div id="container-store_name" style="margin-bottom:1px;">Store: <span id="d-store_name"></span></div>`,
    show("store_license") &&
      `<div id="container-store_license" style="margin-bottom:1px;">LIC#: <span id="d-store_license"></span></div>`,
    show("mj_weight") &&
      `<div id="container-mj_weight" style="margin-bottom:1px;">MJ Weight: <span id="d-mj_weight"></span></div>`,
    show("net_weight") &&
      `<div id="container-net_weight" style="margin-bottom:1px;">Net Weight: <span id="d-net_weight"></span></div>`,
    show("sku") && `<div id="container-sku" style="margin-bottom:1px;">SKU: <span id="d-sku"></span></div>`,
    show("batch_id") &&
      `<div id="container-batch_id" style="margin-bottom:1px;">Batch ID: <span id="d-batch_id"></span></div>`,
    show("supplier_name") &&
      `<div id="container-supplier_name" style="margin-bottom:1px;">Supplier: <span id="d-supplier_name"></span></div>`,
    show("supplier_license") &&
      `<div id="container-supplier_license" style="margin-bottom:1px;">Supplier LIC#: <span id="d-supplier_license"></span></div>`,
    show("test_lab_name") &&
      `<div id="container-test_lab_name" style="margin-bottom:1px;">Test Facility: <span id="d-test_lab_name"></span></div>`,
    show("test_facility_license") &&
      `<div id="container-test_facility_license" style="margin-bottom:1px;">License: <span id="d-test_facility_license"></span></div>`,
    show("date_tested") &&
      `<div id="container-date_tested" style="margin-bottom:1px;">Date Tested: <span id="d-date_tested"></span></div>`,
    show("test_results") &&
      `<div id="container-test_results" style="margin-bottom:1px;"><span id="d-test_results"></span></div>`,
    show("total_terpenes") &&
      `<div id="container-total_terpenes" style="margin-bottom:1px;">Total Terpenes: <span id="d-total_terpenes"></span></div>`,
    show("harvest_date") &&
      `<div id="container-harvest_date" style="margin-bottom:1px;">Harvested: <span id="d-harvest_date"></span></div>`,
    show("manufacture_date") &&
      `<div id="container-manufacture_date" style="margin-bottom:1px;">Manufactured: <span id="d-manufacture_date"></span></div>`,
    show("expiration_date") &&
      `<div id="container-expiration_date" style="margin-bottom:1px;">Exp: <span id="d-expiration_date"></span></div>`,
    show("current_datetime") &&
      `<div id="container-current_datetime" style="margin-bottom:1px;"><span id="d-current_datetime"></span></div>`,
    `<div id="container-custom_label_text" style="margin-top:4px;word-break:break-word;overflow-wrap:break-word;text-align:left;"><span id="d-custom_label_text"></span></div>`,
  ]
    .filter(Boolean)
    .join("");

  return `${BASE_STYLE()}
    <div style="padding:6px;">${rows || "<em style='color:#aaa'>No fields enabled</em>"}</div>`;
}

function receiptTemplate(show: (id: string) => boolean, config: Config): string {
  const baseFontSize = parseFloat(String(config?.fontSize || 7));
  const storeNameSize = Math.max(10, Math.round(baseFontSize * 1.85));
  const fineTextSize = Math.max(5, Math.round(baseFontSize * 0.85));
  return `${BASE_STYLE(config)}
    <div style="padding:8px;">
      ${show("company_logo") ? `<div id="container-company_logo" style="text-align:center;margin-bottom:6px;"></div>` : ""}
      ${
        show("store_name")
          ? `<div id="container-store_name" style="font-size:${storeNameSize}pt;font-weight:bold;margin-bottom:3px;text-align:center;"><span id="d-store_name"></span></div>`
          : ""
      }
      ${
        show("store_address")
          ? `<div id="container-store_address" style="margin-bottom:2px;text-align:center;"><span id="d-store_address"></span></div>`
          : ""
      }
      ${show("store_phone") ? `<div id="container-store_phone" style="text-align:center;"><span id="d-store_phone"></span></div>` : ""}
      ${show("store_email") ? `<div id="container-store_email" style="text-align:center;"><span id="d-store_email"></span></div>` : ""}
      <div style="height:6px;"></div>
      ${show("store_id") ? `<div id="container-store_id" class="b">Store # <span id="d-store_id"></span></div>` : ""}
      ${show("order_id") ? `<div id="container-order_id" class="b">Order # <span id="d-order_id"></span></div>` : ""}
      ${show("budtender") ? `<div id="container-budtender" class="b">Budtender - <span id="d-budtender"></span></div>` : ""}
      ${
        show("customer_name")
          ? `<div id="container-customer_name" class="b">Customer - <span id="d-customer_name"></span></div>`
          : ""
      }
      ${
        show("customer_type")
          ? `<div id="container-customer_type" class="b">Customer Type - <span id="d-customer_type"></span></div>`
          : ""
      }
      ${
        show("customer_id")
          ? `<div id="container-customer_id" class="b">Patient # - <span id="d-customer_id"></span></div>`
          : ""
      }
      ${
        show("loyalty_points_earned")
          ? `<div id="container-loyalty_points_earned" style="display:flex;justify-content:space-between;margin:3px 0;"><span>Loyalty Points Earned:</span><span id="d-loyalty_points_earned" class="b"></span></div>`
          : ""
      }
      ${
        show("current_datetime")
          ? `<div id="container-current_datetime" style="margin:5px 0;"><span id="d-current_datetime"></span></div>`
          : ""
      }
      ${show("order_contents") ? `<div id="container-order_contents"></div>` : ""}
      ${
        show("excise_tax_notification")
          ? `<div id="container-excise_tax_notification" style="font-size:${fineTextSize}pt;margin-top:4px;"><span id="d-excise_tax_notification"></span></div>`
          : ""
      }
      ${
        show("return_reason")
          ? `<div id="container-return_reason" style="font-size:${fineTextSize}pt;margin-top:2px;"><span id="d-return_reason"></span></div>`
          : ""
      }
      <div id="container-custom_receipt_text" style="text-align:center;margin:10px 0 6px;font-weight:bold;">THANK YOU!</div>
      ${show("order_barcode") ? `<div id="container-order_barcode" style="text-align:center;margin-top:6px;"></div>` : ""}
      ${
        show("ios_app_qr") || show("android_app_qr")
          ? `
      <div style="display:flex;justify-content:center;align-items:flex-start;gap:6px;margin-top:6px;">
        ${show("ios_app_qr") ? `<div id="container-ios_app_qr" style="width:80px;flex-shrink:0;"></div>` : ""}
        ${show("android_app_qr") ? `<div id="container-android_app_qr" style="width:80px;flex-shrink:0;"></div>` : ""}
      </div>`
          : ""
      }
      <div id="container-google_review_qr" style="text-align:center;margin-top:6px;"></div>
    </div>`;
}

async function fillPreviewSamples(type: string, config: Config, templateHtml: string): Promise<string> {
  const sv: Record<string, string | null> = { ...(SAMPLE_VALUES[type] ?? {}) };
  const excluded = new Set(config?.fieldExclusions ?? []);

  try {
    const shopLabel = JSON.parse(localStorage.getItem("shopDetails") || "{}")?.label;
    if (shopLabel) sv.store_name = shopLabel;
  } catch {}

  if (type === "PACKAGE_LABEL" && config?.barcodeDigits && config.barcodeDigits !== "full") {
    const n = parseInt(config.barcodeDigits, 10);
    if (!isNaN(n) && n > 0 && sv.metrc_tag) sv.metrc_tag = String(sv.metrc_tag).slice(-n);
  }
  const labelH = parseFloat(String(config?.dimensions?.height ?? 1.25));
  const barcodeH = `${Math.max(0.35, labelH * 0.65).toFixed(3)}in`;
  const show = (id: string) => !excluded.has(id) && sv[id] != null && sv[id] !== "";
  const mode = config?.packageIdMode ?? "qr";

  const div = document.createElement("div");
  div.innerHTML = templateHtml;

  if (type === "PACKAGE_LABEL" && mode === "qr" && show("package_id_qr")) {
    const c = div.querySelector("#container-package_id_qr");
    if (c) {
      const url = await genQrDataUrl(sv.package_id_qr!);
      if (url) c.innerHTML = `<img src="${url}" style="width:100%;height:100%;object-fit:contain;display:block;image-rendering:pixelated;" />`;
    }
  }
  if (type === "PACKAGE_LABEL" && mode === "barcode" && show("package_barcode")) {
    const c = div.querySelector("#container-package_barcode");
    if (c) {
      const url = await genBarcodeDataUrl(sv.package_barcode!);
      if (url) c.innerHTML = `<img src="${url}" style="width:100%;height:${barcodeH};object-fit:contain;display:block;" />`;
    }
  }
  if (isReceiptType(type) && show("order_barcode")) {
    const c = div.querySelector("#container-order_barcode");
    if (c) {
      const url = await genBarcodeDataUrl(sv.order_barcode!);
      if (url) c.innerHTML = `<img src="${url}" style="width:90%;height:55px;display:block;margin:8px auto;" />`;
    }
  }
  if (isReceiptType(type)) {
    const logoContainer = div.querySelector("#container-company_logo");
    if (logoContainer && !excluded.has("company_logo") && config?.logoUrl) {
      logoContainer.innerHTML = `<img src="${config.logoUrl}" style="height:50px;width:auto;max-width:100%;display:block;margin:0 auto;" alt="" />`;
    }
  }
  if (isReceiptType(type)) {
    const c = div.querySelector("#container-order_contents");
    if (c)
      c.innerHTML = `
      <div style="display:grid;grid-template-columns:3fr 1fr 1fr;padding:3px 0;">
        <span><b>Strawberry Cough Bulk</b><br/><small>SKU123456&nbsp;-$1.00</small></span>
        <span style="text-align:right;">1</span><span style="text-align:right;">$10.00</span>
      </div>
      <div style="display:grid;grid-template-columns:3fr 1fr 1fr;padding:3px 0;border-bottom:1px dashed #999;">
        <span><b>OG Kush Bulk</b><br/><small>SKU654321&nbsp;-$2.00</small></span>
        <span style="text-align:right;">1</span><span style="text-align:right;">$8.00</span>
      </div>
      <div style="margin-top:6px;text-align:right;line-height:1.6;">
        <div class="b">SUBTOTAL: $21.00</div><div class="b">DISCOUNT: -$3.00</div>
        <div class="b">TAX: $0.00</div><div class="b">TOTAL: $18.00</div>
        <div class="b">CASH: $40.00</div><div class="b">CHANGE: $22.00</div>
      </div>`;
  }
  for (const field of LabelFieldMap[type]?.fields ?? []) {
    if (field.type) continue;
    const el = div.querySelector(`#d-${field.id}`);
    if (el && show(field.id)) {
      el.textContent = String(sv[field.id] ?? "");
    } else {
      const container = div.querySelector(`#container-${field.id}`);
      container?.remove();
      el?.remove();
    }
  }

  const customTextContainerId = isReceiptType(type) ? "#container-custom_receipt_text" : "#container-custom_label_text";
  const customTextContainer = div.querySelector(customTextContainerId) as HTMLElement | null;
  if (config?.customTextEnabled && config?.customText?.trim()) {
    if (customTextContainer) {
      customTextContainer.textContent = config.customText;
      const fs = config?.fontSize || (isReceiptType(type) ? 7 : 6.5);
      customTextContainer.style.fontSize = `${fs}pt`;
      if (!isReceiptType(type)) {
        customTextContainer.style.textAlign = type === "PACKAGE_LABEL" ? config?.textAlign ?? "center" : "left";
      }
    }
  } else if (customTextContainer && !isReceiptType(type)) {
    customTextContainer.remove();
  }

  const googleReviewContainer = div.querySelector("#container-google_review_qr");
  if (isReceiptType(type) && config?.googleReviewEnabled && config?.googleReviewUrl?.trim()) {
    if (googleReviewContainer) {
      const qrUrl = await genQrDataUrl(config.googleReviewUrl);
      if (qrUrl) {
        googleReviewContainer.innerHTML = `<img src="${qrUrl}" style="width:70px;height:70px;display:block;margin:0 auto;image-rendering:pixelated;" /><p style="font-size:5pt;margin:2px 0 0;text-align:center;font-family:Arial,Helvetica,sans-serif;">Google Review</p>`;
      }
    }
  } else {
    googleReviewContainer?.remove();
  }

  return div.innerHTML;
}

async function buildCustomPreviewHtml(type: string, config: Config): Promise<string> {
  const skeleton = buildTemplateHtml(type, config);
  return fillPreviewSamples(type, config, skeleton);
}

// ─── helpers ────────────────────────────────────────────────────────────────

const isReceiptType = (type?: string) => type === "RECEIPT" || type === "DELIVERY_RECEIPT";

function buildDefaultConfig(label: any, tpl: any): Config {
  const meta = tpl?.meta ?? {};
  const fieldExcl = meta.fieldExclusions ?? label?.fieldExclusions ?? [];
  const hasQr = !fieldExcl.includes("package_id_qr");

  const w = parseFloat(meta.dimensions?.width ?? tpl?.dimensions?.width ?? tpl?.width ?? 2.25);
  const h = parseFloat(meta.dimensions?.height ?? tpl?.dimensions?.height ?? tpl?.height ?? 1.25);

  return {
    name: tpl?.name ?? label?.name ?? "",
    fieldExclusions: fieldExcl,
    dimensions: { width: w, height: h },
    margins: meta.margins ?? {
      top: tpl?.margins?.top ?? 0.1,
      right: tpl?.margins?.right ?? 0.1,
      bottom: tpl?.margins?.bottom ?? 0.1,
      left: tpl?.margins?.left ?? 0.1,
    },
    fontSize: meta.fontSize ?? 5,
    packageIdMode: meta.packageIdMode ?? (hasQr ? "qr" : "barcode"),
    textAlign: meta.textAlign ?? "center",
    barcodeDigits: meta.barcodeDigits ?? label?.meta?.barcodeDigits ?? "full",
    logoUrl: meta.logoUrl ?? null,
    qrWidth: meta.qrWidth ?? null,
    qrHeight: meta.qrHeight ?? null,
    customText: meta.customText ?? "",
    customTextEnabled: meta.customTextEnabled ?? false,
    googleReviewUrl: meta.googleReviewUrl ?? "",
    googleReviewEnabled: meta.googleReviewEnabled ?? false,
  };
}

// ─── small UI atoms ─────────────────────────────────────────────────────────

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="bg-muted/40 px-6 py-2 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)]">
      <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{label}</span>
    </div>
  );
}

function ConfigRow({ label, children, tooltip }: { label: string; children: React.ReactNode; tooltip?: string }) {
  return (
    <div className="flex items-center justify-between px-6 py-3 shadow-[inset_0_-1px_0_rgba(0,0,0,0.05)]">
      <span className="flex items-center gap-1 text-sm text-foreground">
        {label}
        {tooltip && <span className="ml-1 cursor-help text-muted-foreground" title={tooltip}>(?)</span>}
      </span>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}

function DimensionInputs({
  value,
  onChange,
  unit = "in",
}: {
  value: { width: number | string; height: number | string };
  onChange: (v: { width: number | string; height: number | string }) => void;
  unit?: string;
}) {
  return (
    <div className="flex gap-2">
      <div className="flex items-center gap-1">
        <span className="text-xs text-muted-foreground">W</span>
        <Input
          value={value?.width ?? ""}
          onChange={(e) => onChange({ ...value, width: e.target.value })}
          className="w-20"
        />
        <span className="text-xs text-muted-foreground">{unit}</span>
      </div>
      <div className="flex items-center gap-1">
        <span className="text-xs text-muted-foreground">H</span>
        <Input
          value={value?.height ?? ""}
          onChange={(e) => onChange({ ...value, height: e.target.value })}
          className="w-20"
        />
        <span className="text-xs text-muted-foreground">{unit}</span>
      </div>
    </div>
  );
}

function MarginInputs({
  value,
  onChange,
}: {
  value: Config["margins"];
  onChange: (v: Config["margins"]) => void;
}) {
  const set = (key: keyof Config["margins"], val: string) => onChange({ ...value, [key]: val });
  return (
    <div className="grid grid-cols-2 gap-2">
      {(["top", "right", "bottom", "left"] as const).map((k) => (
        <div key={k} className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground">{k[0].toUpperCase()}</span>
          <Input value={value?.[k] ?? ""} onChange={(e) => set(k, e.target.value)} className="w-20" />
        </div>
      ))}
    </div>
  );
}

function RadioPills<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div className="flex gap-1 rounded-lg bg-muted p-0.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`rounded-[7px] px-3 py-1 text-xs font-medium transition-colors ${
            value === opt.value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:bg-background/60"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function FieldToggle({
  field,
  excluded,
  onToggle,
}: {
  field: { id: string; label: string };
  excluded: boolean;
  onToggle: (id: string, exclude: boolean) => void;
}) {
  return (
    <ConfigRow label={field.label}>
      <Switch checked={!excluded} onCheckedChange={(checked) => onToggle(field.id, !checked)} />
    </ConfigRow>
  );
}

// ─── per-type config panels ─────────────────────────────────────────────────

function NameRow({ config, onChange }: { config: Config; onChange: (c: Config) => void }) {
  return (
    <>
      <SectionHeader label="Template Name" />
      <ConfigRow label="Name">
        <Input
          value={config.name ?? ""}
          onChange={(e) => onChange({ ...config, name: e.target.value })}
          className="w-56"
          placeholder="Template name"
        />
      </ConfigRow>
    </>
  );
}

function PackageLabelConfig({
  config,
  onChange,
  fields,
}: {
  config: Config;
  onChange: (c: Config) => void;
  fields: { id: string; label: string }[];
}) {
  const isExcluded = (id: string) => config.fieldExclusions.includes(id);

  const toggle = (id: string, exclude: boolean) => {
    const next = exclude
      ? [...new Set([...config.fieldExclusions, id])]
      : config.fieldExclusions.filter((x) => x !== id);
    onChange({ ...config, fieldExclusions: next });
  };

  const setIdMode = (mode: "qr" | "barcode") => {
    const base = config.fieldExclusions.filter((x) => x !== "package_barcode" && x !== "package_id_qr");
    const next = mode === "qr" ? [...base, "package_barcode"] : [...base, "package_id_qr"];
    onChange({ ...config, packageIdMode: mode, fieldExclusions: next });
  };

  const labelFields = fields.filter((f) => !["package_barcode", "package_id_qr"].includes(f.id));

  return (
    <>
      <NameRow config={config} onChange={onChange} />
      <SectionHeader label="Dimensions & Layout" />
      <ConfigRow label="Dimensions (Inches)">
        <DimensionInputs value={config.dimensions} onChange={(d) => onChange({ ...config, dimensions: d })} />
      </ConfigRow>
      <ConfigRow label="Margins (Inches)">
        <MarginInputs value={config.margins} onChange={(m) => onChange({ ...config, margins: m })} />
      </ConfigRow>
      <ConfigRow label="Font Size">
        <div className="flex items-center gap-1">
          <Input
            value={config.fontSize}
            onChange={(e) => onChange({ ...config, fontSize: e.target.value })}
            className="w-20"
          />
          <span className="text-xs text-muted-foreground">pt</span>
        </div>
      </ConfigRow>

      <SectionHeader label="Package ID" />
      <ConfigRow label="Package ID Type">
        <RadioPills
          value={config.packageIdMode ?? "qr"}
          onChange={setIdMode}
          options={[
            { value: "barcode", label: "Barcode" },
            { value: "qr", label: "QR Code" },
          ]}
        />
      </ConfigRow>
      {(config.packageIdMode ?? "qr") === "qr" && (
        <ConfigRow label="QR Size (Inches)">
          <div className="flex gap-2">
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground">W</span>
              <Input
                value={config.qrWidth ?? ""}
                onChange={(e) => onChange({ ...config, qrWidth: e.target.value })}
                placeholder="auto"
                className="w-20"
              />
              <span className="text-xs text-muted-foreground">in</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground">H</span>
              <Input
                value={config.qrHeight ?? ""}
                onChange={(e) => onChange({ ...config, qrHeight: e.target.value })}
                placeholder="auto"
                className="w-20"
              />
              <span className="text-xs text-muted-foreground">in</span>
            </div>
          </div>
        </ConfigRow>
      )}
      <ConfigRow label="Barcode / QR Digits">
        <select
          value={config.barcodeDigits ?? "full"}
          onChange={(e) => onChange({ ...config, barcodeDigits: e.target.value })}
          className="rounded-md border border-input bg-transparent px-2 py-1 text-xs outline-none focus-visible:border-ring focus-visible:shadow-[0_0_0_1px_var(--ring)]"
        >
          <option value="full">Full (all digits)</option>
          <option value="5">Last 5 digits</option>
          <option value="8">Last 8 digits</option>
          <option value="10">Last 10 digits</option>
          <option value="12">Last 12 digits</option>
        </select>
      </ConfigRow>

      <SectionHeader label="Text Alignment" />
      <ConfigRow label="Align Text">
        <RadioPills
          value={config.textAlign ?? "center"}
          onChange={(v) => onChange({ ...config, textAlign: v })}
          options={[
            { value: "left", label: "Left" },
            { value: "center", label: "Center" },
            { value: "right", label: "Right" },
          ]}
        />
      </ConfigRow>

      <SectionHeader label="Label Fields" />
      {labelFields.map((f) => (
        <FieldToggle key={f.id} field={f} excluded={isExcluded(f.id)} onToggle={toggle} />
      ))}

      <SectionHeader label="Custom Text" />
      <ConfigRow label="Enable Custom Text">
        <Switch
          checked={config.customTextEnabled ?? false}
          onCheckedChange={(v) => onChange({ ...config, customTextEnabled: v })}
        />
      </ConfigRow>
      {(config.customTextEnabled ?? false) && (
        <ConfigRow label="Text">
          <Textarea
            value={config.customText ?? ""}
            onChange={(e) => onChange({ ...config, customText: e.target.value })}
            placeholder="Text to show at the end of the label"
            className="w-56"
            rows={2}
          />
        </ConfigRow>
      )}
    </>
  );
}

function ExitLabelConfig({
  config,
  onChange,
  fields,
}: {
  config: Config;
  onChange: (c: Config) => void;
  fields: { id: string; label: string }[];
}) {
  const isExcluded = (id: string) => config.fieldExclusions.includes(id);
  const toggle = (id: string, exclude: boolean) => {
    const next = exclude
      ? [...new Set([...config.fieldExclusions, id])]
      : config.fieldExclusions.filter((x) => x !== id);
    onChange({ ...config, fieldExclusions: next });
  };

  return (
    <>
      <NameRow config={config} onChange={onChange} />
      <SectionHeader label="Dimensions & Layout" />
      <ConfigRow label="Dimensions (Inches)">
        <DimensionInputs value={config.dimensions} onChange={(d) => onChange({ ...config, dimensions: d })} />
      </ConfigRow>
      <ConfigRow label="Margins (Inches)">
        <MarginInputs value={config.margins} onChange={(m) => onChange({ ...config, margins: m })} />
      </ConfigRow>
      <ConfigRow label="Font Size">
        <div className="flex items-center gap-1">
          <Input
            value={config.fontSize}
            onChange={(e) => onChange({ ...config, fontSize: e.target.value })}
            className="w-20"
          />
          <span className="text-xs text-muted-foreground">pt</span>
        </div>
      </ConfigRow>

      <SectionHeader label="Label Fields" />
      {fields.map((f) => (
        <FieldToggle key={f.id} field={f} excluded={isExcluded(f.id)} onToggle={toggle} />
      ))}

      <SectionHeader label="Custom Text" />
      <ConfigRow label="Enable Custom Text">
        <Switch
          checked={config.customTextEnabled ?? false}
          onCheckedChange={(v) => onChange({ ...config, customTextEnabled: v })}
        />
      </ConfigRow>
      {(config.customTextEnabled ?? false) && (
        <ConfigRow label="Text">
          <Textarea
            value={config.customText ?? ""}
            onChange={(e) => onChange({ ...config, customText: e.target.value })}
            placeholder="Text to show at the end of the label"
            className="w-56"
            rows={2}
          />
        </ConfigRow>
      )}
    </>
  );
}

function ReceiptConfig({
  config,
  onChange,
  fields,
}: {
  config: Config;
  onChange: (c: Config) => void;
  fields: { id: string; label: string }[];
}) {
  const isExcluded = (id: string) => config.fieldExclusions.includes(id);
  const toggle = (id: string, exclude: boolean) => {
    const next = exclude
      ? [...new Set([...config.fieldExclusions, id])]
      : config.fieldExclusions.filter((x) => x !== id);
    onChange({ ...config, fieldExclusions: next });
  };

  const currentWidth = config.dimensions?.width ?? 55;

  return (
    <>
      <NameRow config={config} onChange={onChange} />
      <SectionHeader label="Dimensions & Layout" />
      <ConfigRow label="Width">
        <RadioPills
          value={String(currentWidth)}
          onChange={(v) => onChange({ ...config, dimensions: { ...config.dimensions, width: Number(v) } })}
          options={RECEIPT_WIDTHS.map((w) => ({ value: String(w.value), label: w.label }))}
        />
      </ConfigRow>
      <ConfigRow label="Margins (Inches)">
        <MarginInputs value={config.margins} onChange={(m) => onChange({ ...config, margins: m })} />
      </ConfigRow>
      <ConfigRow label="Font Size">
        <div className="flex items-center gap-1">
          <Input
            value={config.fontSize ?? 8}
            onChange={(e) => onChange({ ...config, fontSize: e.target.value })}
            className="w-20"
          />
          <span className="text-xs text-muted-foreground">pt</span>
        </div>
      </ConfigRow>

      <SectionHeader label="Receipt Fields" />
      {fields.map((f) => (
        <div key={f.id}>
          <FieldToggle field={f} excluded={isExcluded(f.id)} onToggle={toggle} />
          {f.id === "company_logo" && !isExcluded("company_logo") && (
            <ConfigRow label="Logo URL">
              <Input
                value={config.logoUrl ?? ""}
                onChange={(e) => onChange({ ...config, logoUrl: e.target.value })}
                placeholder="https://example.com/logo.png"
                className="w-56"
              />
            </ConfigRow>
          )}
        </div>
      ))}

      <SectionHeader label="Custom Text" />
      <ConfigRow label="Enable Custom Text">
        <Switch
          checked={config.customTextEnabled ?? false}
          onCheckedChange={(v) => onChange({ ...config, customTextEnabled: v })}
        />
      </ConfigRow>
      {(config.customTextEnabled ?? false) && (
        <ConfigRow label="Text">
          <Textarea
            value={config.customText ?? ""}
            onChange={(e) => onChange({ ...config, customText: e.target.value })}
            placeholder="Text to show at the end of the receipt"
            className="w-56"
            rows={2}
          />
        </ConfigRow>
      )}

      <SectionHeader label="Google Review" />
      <ConfigRow label="Enable Google Review QR">
        <Switch
          checked={config.googleReviewEnabled ?? false}
          onCheckedChange={(v) => onChange({ ...config, googleReviewEnabled: v })}
        />
      </ConfigRow>
      {(config.googleReviewEnabled ?? false) && (
        <ConfigRow label="Google Review URL">
          <Input
            value={config.googleReviewUrl ?? ""}
            onChange={(e) => onChange({ ...config, googleReviewUrl: e.target.value })}
            placeholder="https://g.page/r/..."
            className="w-56"
          />
        </ConfigRow>
      )}
    </>
  );
}

// ─── live preview panel ─────────────────────────────────────────────────────

function PreviewPanel({
  activeType,
  previewHtml,
  previewLoading,
  onPrint,
  printing,
  config,
}: {
  activeType: string;
  previewHtml: string;
  previewLoading: boolean;
  onPrint: () => void;
  printing: boolean;
  config?: Config;
}) {
  const label = SECTION_LABELS[activeType];
  const isReceipt = isReceiptType(activeType);

  const w = parseFloat(String(config?.dimensions?.width ?? (isReceipt ? 55 : 2.25)));
  const h = parseFloat(String(config?.dimensions?.height ?? (isReceipt ? 200 : 1.25)));
  const fontSize = config?.fontSize ?? 6.5;
  const m = config?.margins ?? { top: 0.1, right: 0.1, bottom: 0.1, left: 0.1 };
  const unit = isReceipt ? "mm" : "in";

  const scale = isReceipt ? 2.5 : 3.5;

  const wrapStyle: React.CSSProperties = {
    transform: `scale(${scale})`,
    transformOrigin: "top center",
    width: isReceipt ? "55mm" : `${w}in`,
    height: isReceipt ? undefined : `${h}in`,
    minHeight: isReceipt ? "200mm" : undefined,
    background: "white",
    boxShadow: "0 2px 16px rgba(0,0,0,0.35)",
    overflow: "hidden",
    flexShrink: 0,
  };

  const srcDoc = previewHtml
    ? `<!DOCTYPE html><html><head><meta charset="utf-8"/>
       <style>
         @page { margin: ${m.top}${unit} ${m.right}${unit} ${m.bottom}${unit} ${m.left}${unit}; }
         html, body {
           margin: 0; padding: 0; overflow: hidden; border: none;
           font-family: Arial, Helvetica, sans-serif;
           font-size: ${fontSize}pt;
           color: #000;
         }
         #gjs-label-layout-temp-content,
         #gjs-label-layout-temp-content * { font-size: ${fontSize}pt; }
         #printer-cut-command { display: none !important; }
       </style>
       </head><body>${previewHtml}</body></html>`
    : "";

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between bg-background px-4 py-3 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)]">
        <span className="text-sm font-medium">Preview — {label}</span>
        <Button onClick={onPrint} disabled={printing} size="sm">
          {printing ? <Loader2 className="size-4 animate-spin" /> : <Printer className="size-4" />}
          Print Sample {label}
        </Button>
      </div>

      <div
        className="flex flex-1 items-start justify-center overflow-auto bg-neutral-800"
        style={{ padding: isReceipt ? "40px 24px 80px" : "60px 24px 120px" }}
      >
        {previewLoading ? (
          <div className="mt-20 flex items-center justify-center">
            <Loader2 className="size-6 animate-spin text-white" />
          </div>
        ) : previewHtml ? (
          <div style={wrapStyle}>
            <iframe
              key={activeType}
              srcDoc={srcDoc}
              title="Label Preview"
              style={{
                width: "100%",
                height: "100%",
                border: "none",
                display: "block",
                minHeight: isReceipt ? "200mm" : "1.25in",
              }}
              scrolling="no"
            />
          </div>
        ) : (
          <div className="mt-16 text-sm text-neutral-400">
            No template assigned for this label type.
            <br />
            Configure one in{" "}
            <a href="/settings/labels" className="text-blue-400 underline">
              Labels &amp; Receipts
            </a>
            .
          </div>
        )}
      </div>
    </div>
  );
}

// ─── templates tab ──────────────────────────────────────────────────────────

function TemplatesTab({ configs }: { configs: Record<string, Config> }) {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loadingTpl, setLoadingTpl] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [edit, setEdit] = useState<any>({});
  const [savingTpl, setSavingTpl] = useState(false);
  const [tplPreviewHtml, setTplPreviewHtml] = useState("");
  const [tplPreviewLoading, setTplPreviewLoading] = useState(false);

  useEffect(() => {
    (async () => {
      setLoadingTpl(true);
      try {
        const res = await fetchPrintTemplates();
        setTemplates(res?.data ?? []);
      } catch {
        toast.error("Failed to load templates");
      } finally {
        setLoadingTpl(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!selected) return;
    const type = selected.type;
    if (!type) return;

    let cancelled = false;
    setTplPreviewLoading(true);
    buildCustomPreviewHtml(type, configs[type]).then((html) => {
      if (!cancelled) {
        setTplPreviewHtml(html);
        setTplPreviewLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [selected, configs]);

  const handleConfig = (tpl: any) => {
    setSelected(tpl);
    setEdit({
      name: tpl.name ?? "",
      width: tpl.dimensions?.width ?? "",
      height: tpl.dimensions?.height ?? "",
      marginTop: tpl.margins?.top ?? 0.1,
      marginRight: tpl.margins?.right ?? 0.1,
      marginBottom: tpl.margins?.bottom ?? 0.1,
      marginLeft: tpl.margins?.left ?? 0.1,
    });
  };

  const handleSaveTpl = async () => {
    if (!selected) return;
    const type = selected.type;
    setSavingTpl(true);
    try {
      const templateHtml = buildTemplateHtml(type, configs[type]);
      await updatePrintTemplate(selected.id, {
        name: edit.name,
        type,
        dimensions: { width: parseFloat(edit.width) || 0, height: parseFloat(edit.height) || 0 },
        margins: {
          top: parseFloat(edit.marginTop) || 0,
          bottom: parseFloat(edit.marginBottom) || 0,
          left: parseFloat(edit.marginLeft) || 0,
          right: parseFloat(edit.marginRight) || 0,
        },
        templateHtml,
      });
      toast.success("Template saved");
      const res = await fetchPrintTemplates();
      setTemplates(res?.data ?? []);
    } catch {
      toast.error("Failed to save template");
    } finally {
      setSavingTpl(false);
    }
  };

  const type = selected?.type ?? null;
  const isReceipt = type ? isReceiptType(type) : false;

  return (
    <div className="flex flex-1 overflow-hidden" style={{ height: "calc(100vh - 130px)" }}>
      <div
        className="flex flex-col overflow-y-auto bg-background shadow-[inset_-1px_0_0_rgba(0,0,0,0.06)]"
        style={{ width: 500, minWidth: 380, flexShrink: 0 }}
      >
        <div className="px-4 py-4">
          {loadingTpl ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>W</TableHead>
                  <TableHead>H</TableHead>
                  <TableHead className="text-center">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((r) => (
                  <TableRow key={r.id} className={selected?.id === r.id ? "bg-primary/5" : ""}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell>
                      <Badge className={TYPE_COLOR[r.type] ?? ""}>
                        {r.type?.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>{r.dimensions?.width ?? "—"}</TableCell>
                    <TableCell>{r.dimensions?.height ?? "—"}</TableCell>
                    <TableCell className="text-center">
                      <Button size="sm" onClick={() => handleConfig(r)}>
                        <Settings className="size-3.5" />
                        Config
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {selected && (
          <div className="shadow-[inset_0_1px_0_rgba(0,0,0,0.06)]">
            <div className="flex items-center justify-between bg-primary/5 px-6 py-3 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)]">
              <span className="text-sm font-semibold text-primary">Configuring: {selected.name}</span>
              <Badge className={TYPE_COLOR[type ?? ""] ?? ""}>
                {type?.replace(/_/g, " ")}
              </Badge>
            </div>

            <SectionHeader label="Template Info" />
            <ConfigRow label="Name">
              <Input value={edit.name} onChange={(e) => setEdit((p: any) => ({ ...p, name: e.target.value }))} className="w-56" />
            </ConfigRow>

            <SectionHeader label="Dimensions" />
            <ConfigRow label={`Width (${isReceipt ? "mm" : "in"})`}>
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground">W</span>
                <Input
                  value={edit.width}
                  onChange={(e) => setEdit((p: any) => ({ ...p, width: e.target.value }))}
                  className="w-28"
                />
                <span className="text-xs text-muted-foreground">{isReceipt ? "mm" : "in"}</span>
              </div>
            </ConfigRow>
            <ConfigRow label={`Height (${isReceipt ? "mm" : "in"})`}>
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground">H</span>
                <Input
                  value={edit.height}
                  onChange={(e) => setEdit((p: any) => ({ ...p, height: e.target.value }))}
                  className="w-28"
                />
                <span className="text-xs text-muted-foreground">{isReceipt ? "mm" : "in"}</span>
              </div>
            </ConfigRow>

            <SectionHeader label="Margins (Inches)" />
            {(
              [
                ["marginTop", "T"],
                ["marginRight", "R"],
                ["marginBottom", "B"],
                ["marginLeft", "L"],
              ] as const
            ).map(([k, lbl]) => (
              <ConfigRow key={k} label={lbl}>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground">{lbl}</span>
                  <Input
                    value={edit[k]}
                    onChange={(e) => setEdit((p: any) => ({ ...p, [k]: e.target.value }))}
                    className="w-24"
                  />
                </div>
              </ConfigRow>
            ))}

            <div className="flex justify-end gap-2 bg-muted/40 px-6 py-4 shadow-[inset_0_1px_0_rgba(0,0,0,0.06)]">
              <Button variant="outline" onClick={() => setSelected(null)}>
                Cancel
              </Button>
              <Button onClick={handleSaveTpl} disabled={savingTpl}>
                {savingTpl ? <Loader2 className="size-4 animate-spin" /> : null}
                Save Template
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex items-center justify-between bg-background px-4 py-3 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)]">
          <span className="text-sm font-medium">{selected ? `Preview — ${selected.name}` : "Select a template to preview"}</span>
        </div>
        <div className="flex flex-1 items-start justify-center overflow-auto bg-neutral-800 p-8">
          {tplPreviewLoading ? (
            <div className="mt-20 flex items-center justify-center">
              <Loader2 className="size-6 animate-spin text-white" />
            </div>
          ) : tplPreviewHtml ? (
            <div
              style={{
                background: "white",
                boxShadow: "0 2px 16px rgba(0,0,0,0.35)",
                transform: `scale(${isReceipt ? 2.5 : 3.5})`,
                transformOrigin: "top center",
                width: isReceipt ? "55mm" : "2.25in",
                minHeight: isReceipt ? "200mm" : "1.25in",
                overflow: "hidden",
                flexShrink: 0,
              }}
            >
              <iframe
                key={selected?.id}
                srcDoc={`<!DOCTYPE html><html><head><meta charset="utf-8"/>
                  <style>html,body{margin:0;padding:0;overflow:hidden;border:none;}</style>
                  </head><body>${tplPreviewHtml}</body></html>`}
                title="Template Preview"
                style={{
                  width: "100%",
                  minHeight: isReceipt ? "200mm" : "1.25in",
                  border: "none",
                  display: "block",
                }}
                scrolling="no"
              />
            </div>
          ) : (
            <div className="mt-16 text-center text-sm text-neutral-400">
              Click <strong>Config</strong> on any template to preview and edit it
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── main component ─────────────────────────────────────────────────────────

function PrintSettingsPage() {
  const [activeTab, setActiveTab] = useState<"labels" | "templates">("labels");
  const [labels, setLabels] = useState<Record<string, any>>({});
  const [printTemplates, setPrintTemplates] = useState<Record<string, any>>({});
  const [configs, setConfigs] = useState<Record<string, Config>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [printing, setPrinting] = useState(false);
  const [activeType, setActiveType] = useState("PACKAGE_LABEL");
  const [previewHtml, setPreviewHtml] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);

  // ── fetch labels + print-templates from API (single source of truth) ────

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [labelRes, tplRes] = await Promise.all([fetchLabels(), fetchPrintTemplates()]);

        const labelModels = labelRes?.data ?? [];
        const tplModels = tplRes?.data ?? [];

        const byLabel: Record<string, any> = {};
        const byTpl: Record<string, any> = {};
        const cfgByType: Record<string, Config> = {};

        LABEL_TYPES.forEach((t) => {
          const lbl = labelModels.find((m: any) => m.templateType === t) ?? null;
          const tpl = tplModels.find((m: any) => m.type === t) ?? null;
          byLabel[t] = lbl;
          byTpl[t] = tpl;

          const base = buildDefaultConfig(lbl, tpl);

          if (t === "RECEIPT") {
            if (!base.fontSize || base.fontSize === 5) base.fontSize = 8;
            const qrAlreadyExcluded =
              base.fieldExclusions?.includes("ios_app_qr") && base.fieldExclusions?.includes("android_app_qr");
            if (!qrAlreadyExcluded) {
              const excl = new Set([...(base.fieldExclusions ?? []), "ios_app_qr", "android_app_qr"]);
              base.fieldExclusions = [...excl];
            }
          }

          cfgByType[t] = base;
        });

        setLabels(byLabel);
        setPrintTemplates(byTpl);
        setConfigs(cfgByType);
      } catch {
        toast.error("Failed to load settings");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ── live preview: custom template, real-time on every config change ─────

  useEffect(() => {
    let cancelled = false;
    setPreviewLoading(true);

    buildCustomPreviewHtml(activeType, configs[activeType]).then((html) => {
      if (!cancelled) {
        setPreviewHtml(html);
        setPreviewLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [activeType, configs]);

  // ── save ──────────────────────────────────────────────────────────────

  const handleSave = async (type: string) => {
    setSaving((s) => ({ ...s, [type]: true }));
    try {
      const cfg = configs[type];
      const templateHtml = buildTemplateHtml(type, cfg);

      const [freshLblRes, freshTplRes] = await Promise.all([fetchLabels(), fetchPrintTemplates()]);
      const freshLblModels = freshLblRes?.data ?? [];
      const freshTplModels = freshTplRes?.data ?? [];

      const lbl = freshLblModels.find((m: any) => m.templateType === type) ?? labels[type];
      const tpl = freshTplModels.find((m: any) => m.type === type) ?? printTemplates[type];

      if (!lbl) {
        toast.warning("No label found for this type.");
        return;
      }

      setLabels((prev) => {
        const updated = { ...prev };
        LABEL_TYPES.forEach((t) => {
          updated[t] = freshLblModels.find((m: any) => m.templateType === t) ?? prev[t];
        });
        return updated;
      });
      setPrintTemplates((prev) => {
        const updated = { ...prev };
        LABEL_TYPES.forEach((t) => {
          updated[t] = freshTplModels.find((m: any) => m.type === t) ?? prev[t];
        });
        return updated;
      });

      const templateMeta = {
        fontSize: cfg.fontSize,
        fieldExclusions: cfg.fieldExclusions ?? [],
        packageIdMode: cfg.packageIdMode,
        textAlign: cfg.textAlign,
        barcodeDigits: cfg.barcodeDigits ?? "full",
        logoUrl: cfg.logoUrl ?? null,
        dimensions: cfg.dimensions,
        margins: cfg.margins,
        qrWidth: cfg.qrWidth ?? null,
        qrHeight: cfg.qrHeight ?? null,
        customText: cfg.customText ?? "",
        customTextEnabled: cfg.customTextEnabled ?? false,
        googleReviewUrl: cfg.googleReviewUrl ?? "",
        googleReviewEnabled: cfg.googleReviewEnabled ?? false,
      };
      const templatePayload = {
        name: cfg.name || tpl?.name || type,
        type,
        dimensions: {
          width: parseFloat(String(cfg.dimensions?.width ?? tpl?.dimensions?.width ?? 0)),
          height: parseFloat(String(cfg.dimensions?.height ?? tpl?.dimensions?.height ?? 0)),
        },
        margins: {
          top: parseFloat(String(cfg.margins?.top ?? tpl?.margins?.top ?? 0)),
          bottom: parseFloat(String(cfg.margins?.bottom ?? tpl?.margins?.bottom ?? 0)),
          left: parseFloat(String(cfg.margins?.left ?? tpl?.margins?.left ?? 0)),
          right: parseFloat(String(cfg.margins?.right ?? tpl?.margins?.right ?? 0)),
        },
        templateHtml,
        meta: templateMeta,
      };

      const refreshTemplates = async () => {
        const res = await fetchPrintTemplates();
        const models = res?.data ?? [];
        setPrintTemplates((prev) => {
          const updated = { ...prev };
          LABEL_TYPES.forEach((t) => {
            updated[t] = models.find((m: any) => m.type === t) ?? prev[t];
          });
          return updated;
        });
        return models;
      };

      const refreshLabels = async () => {
        const res = await fetchLabels();
        const models = res?.data ?? [];
        setLabels((prev) => {
          const updated = { ...prev };
          LABEL_TYPES.forEach((t) => {
            updated[t] = models.find((m: any) => m.templateType === t) ?? prev[t];
          });
          return updated;
        });
        return models;
      };

      // 1. Upsert print template by type-resolved ID
      let resolvedTplId = tpl?.id;
      if (tpl) {
        try {
          await updatePrintTemplate(tpl.id, templatePayload);
        } catch {
          try {
            await createPrintTemplate(templatePayload);
            const newTpls = await refreshTemplates();
            resolvedTplId = newTpls.find((m: any) => m.type === type)?.id ?? tpl.id;
          } catch {
            const newTpls = await refreshTemplates();
            const correctTpl = newTpls.find((m: any) => m.type === type);
            if (correctTpl) {
              resolvedTplId = correctTpl.id;
              await updatePrintTemplate(correctTpl.id, templatePayload);
            }
          }
        }
      } else {
        try {
          await createPrintTemplate(templatePayload);
        } catch {
          // already exists — fetch below
        }
        const newTpls = await refreshTemplates();
        resolvedTplId = newTpls.find((m: any) => m.type === type)?.id;
      }

      // 2. Upsert label by type-resolved ID
      const labelMeta = {
        ...(lbl.meta ?? {}),
        barcodeDigits: cfg.barcodeDigits ?? "full",
        fontSize: cfg.fontSize,
        packageIdMode: cfg.packageIdMode,
        textAlign: cfg.textAlign,
        logoUrl: cfg.logoUrl ?? null,
        customText: cfg.customText ?? "",
        customTextEnabled: cfg.customTextEnabled ?? false,
        googleReviewUrl: cfg.googleReviewUrl ?? "",
        googleReviewEnabled: cfg.googleReviewEnabled ?? false,
      };
      const labelPayload = {
        name: cfg.name || lbl.name,
        templateId: resolvedTplId ?? lbl.templateId,
        fieldExclusions: cfg.fieldExclusions ?? [],
        preferredModelType: lbl.preferredModelType ?? null,
        preferredModelID: lbl.preferredModelID ?? null,
        templateType: type,
        meta: labelMeta,
      };
      try {
        await updateLabel({ id: lbl.id, ...labelPayload });
      } catch {
        try {
          await createLabel(labelPayload);
        } catch {
          const newModels = await refreshLabels();
          const correctLbl = newModels.find((m: any) => m.templateType === type);
          if (correctLbl) {
            await updateLabel({ id: correctLbl.id, ...labelPayload });
          }
        }
      }

      await Promise.all([refreshLabels(), refreshTemplates()]);

      try {
        const shopId = JSON.parse(localStorage.getItem("shopId") || "null");
        const existing = JSON.parse(localStorage.getItem("bleaum_print_configs") || "{}");
        localStorage.setItem("bleaum_print_configs", JSON.stringify({ ...existing, _shopId: shopId, [type]: cfg }));
      } catch {}

      toast.success(`${SECTION_LABELS[type]} template saved`);
    } catch (err: any) {
      toast.error(err?.error || err?.message || "Failed to save template");
    } finally {
      setSaving((s) => ({ ...s, [type]: false }));
    }
  };

  // ── print sample — direct iframe print ──────────────────────────────────

  const handlePrintSample = useCallback(async () => {
    setPrinting(true);
    try {
      const cfg = configs[activeType];
      const isReceipt = isReceiptType(activeType);
      const unit = isReceipt ? "mm" : "in";
      const w = parseFloat(String(cfg?.dimensions?.width ?? (isReceipt ? 55 : 2.25)));
      const h = parseFloat(String(cfg?.dimensions?.height ?? (isReceipt ? 200 : 1.25)));
      const fontSize = cfg?.fontSize ?? 6.5;
      const m = cfg?.margins ?? { top: 0.1, right: 0.1, bottom: 0.1, left: 0.1 };

      const bodyHtml = await buildCustomPreviewHtml(activeType, cfg);

      const fullHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"/>
        <style>
          @page {
            size: ${w}${unit} ${isReceipt ? "auto" : h + unit};
            margin: ${m.top}${unit} ${m.right}${unit} ${m.bottom}${unit} ${m.left}${unit};
          }
          html, body {
            margin: 0; padding: 0;
            width: ${w}${unit};
            font-family: Arial, Helvetica, sans-serif;
            font-size: ${fontSize}pt;
            color: #000;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          #gjs-label-layout-temp-content,
          #gjs-label-layout-temp-content * { font-size: ${fontSize}pt; }
          * { box-sizing: border-box; }
          img { max-width: 100%; }
        </style>
      </head><body>${bodyHtml}</body></html>`;

      const iframe = document.createElement("iframe");
      iframe.style.cssText = "position:fixed;top:-9999px;left:-9999px;width:0;height:0;border:none;visibility:hidden;";
      document.body.appendChild(iframe);

      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      doc?.open();
      doc?.write(fullHtml);
      doc?.close();

      iframe.onload = () => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } finally {
          setTimeout(() => {
            if (document.body.contains(iframe)) document.body.removeChild(iframe);
          }, 1500);
        }
      };
    } catch (e) {
      console.error(e);
      toast.error("Print failed");
    } finally {
      setPrinting(false);
    }
  }, [activeType, configs]);

  const updateConfig = useCallback((type: string, cfg: Config) => setConfigs((prev) => ({ ...prev, [type]: cfg })), []);

  if (loading) {
    return (
      <div className="flex flex-col gap-4 p-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const configPanel: Record<string, React.ReactNode> = {
    PACKAGE_LABEL: (
      <PackageLabelConfig
        config={configs.PACKAGE_LABEL ?? ({} as Config)}
        onChange={(c) => updateConfig("PACKAGE_LABEL", c)}
        fields={LabelFieldMap.PACKAGE_LABEL.fields}
      />
    ),
    EXIT_LABEL: (
      <ExitLabelConfig
        config={configs.EXIT_LABEL ?? ({} as Config)}
        onChange={(c) => updateConfig("EXIT_LABEL", c)}
        fields={LabelFieldMap.EXIT_LABEL.fields}
      />
    ),
    RECEIPT: (
      <ReceiptConfig
        config={configs.RECEIPT ?? ({} as Config)}
        onChange={(c) => updateConfig("RECEIPT", c)}
        fields={LabelFieldMap.RECEIPT.fields}
      />
    ),
  };

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 70px)" }}>
      <div className="bg-background px-6 pb-4 pt-4 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)]">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold leading-tight">Print Settings</h1>
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbPage>Settings</BreadcrumbPage>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>Print</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </div>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "labels" | "templates")}>
          <TabsList>
            <TabsTrigger value="labels">Labels</TabsTrigger>
            <TabsTrigger value="templates">
              Templates
              <ExternalLink className="ml-1 size-3" />
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {activeTab === "labels" && (
        <div className="flex flex-1 overflow-hidden">
          <div
            className="flex flex-col overflow-y-auto bg-background shadow-[inset_-1px_0_0_rgba(0,0,0,0.06)]"
            style={{ width: 500, minWidth: 380, flexShrink: 0 }}
          >
            <Accordion
              multiple={false}
              value={[activeType]}
              onValueChange={(v: string[]) => v[0] && setActiveType(v[0])}
            >
              {LABEL_TYPES.map((type) => (
                <AccordionItem
                  key={type}
                  value={type}
                  className="border-b-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)]"
                >
                  <AccordionTrigger className="px-6 py-4 hover:no-underline">
                    <div className="flex w-full items-center justify-between pr-2">
                      <span className="text-sm font-semibold uppercase tracking-wide">{SECTION_LABELS[type]}</span>
                      {labels[type] ? (
                        <Badge className="bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400">
                          Configured
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-muted-foreground">
                          No template
                        </Badge>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    {labels[type] ? (
                      configPanel[type]
                    ) : (
                      <div className="px-6 py-4 text-sm text-muted-foreground">
                        No label template found. Configure one in{" "}
                        <a href="/settings/labels" className="text-blue-500 underline">
                          Labels &amp; Receipts
                        </a>
                        .
                      </div>
                    )}
                    <div className="flex justify-end bg-muted/40 px-6 py-4 shadow-[inset_0_1px_0_rgba(0,0,0,0.06)]">
                      <Button disabled={saving[type] || !labels[type]} onClick={() => handleSave(type)}>
                        {saving[type] ? <Loader2 className="size-4 animate-spin" /> : null}
                        Save {SECTION_LABELS[type]}
                      </Button>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>

          <div className="flex flex-1 flex-col overflow-hidden">
            <PreviewPanel
              activeType={activeType}
              previewHtml={previewHtml}
              previewLoading={previewLoading}
              onPrint={handlePrintSample}
              printing={printing}
              config={configs[activeType]}
            />
          </div>
        </div>
      )}

      {activeTab === "templates" && <TemplatesTab configs={configs} />}
    </div>
  );
}

export default PrintSettingsPage;
