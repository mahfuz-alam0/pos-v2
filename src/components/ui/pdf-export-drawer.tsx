"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import Drawer from "@/components/ui/Drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";

const MARGINS: Record<string, string> = {
  Normal: "15mm",
  Narrow: "10mm",
  Wide: "25mm",
};

const PAGE_SIZES: Record<string, { width: number | "auto"; height: number | "auto"; unit: string }> = {
  Auto: { width: "auto", height: "auto", unit: "mm" },
  A4: { width: 210, height: 297, unit: "mm" },
  A3: { width: 297, height: 420, unit: "mm" },
  A5: { width: 148, height: 210, unit: "mm" },
  Letter: { width: 8.5, height: 11, unit: "in" },
  Legal: { width: 8.5, height: 14, unit: "in" },
  Tabloid: { width: 11, height: 17, unit: "in" },
  Ledger: { width: 17, height: 11, unit: "in" },
  Executive: { width: 7.25, height: 10.5, unit: "in" },
  B4: { width: 250, height: 353, unit: "mm" },
  B5: { width: 176, height: 250, unit: "mm" },
  Custom: { width: 210, height: 297, unit: "mm" },
};

export interface PdfColumnConfig {
  key: string;
  label: string;
}

export interface PdfExportSettings {
  pageSize: string;
  orientation: "portrait" | "landscape";
  scale: number;
  margin: string;
  hiddenSections: string[];
  hiddenColumns: Record<string, string[]>;
  customWidth: number;
  customHeight: number;
  customUnit: "mm" | "in" | "px";
}

const DEFAULT_SETTINGS: PdfExportSettings = {
  pageSize: "A4",
  orientation: "portrait",
  scale: 1,
  margin: "Normal",
  hiddenSections: [],
  hiddenColumns: {},
  customWidth: 210,
  customHeight: 297,
  customUnit: "mm",
};

const EMPTY_COLUMN_CONFIG: Record<string, PdfColumnConfig[]> = {};

interface PdfExportDrawerProps {
  open: boolean;
  onClose: () => void;
  data: any;
  metadata: any;
  availableSections?: string[];
  htmlGenerator: (data: any, metadata: any, settings: PdfExportSettings) => string;
  columnConfig?: Record<string, PdfColumnConfig[]>;
}

export default function PdfExportDrawer({
  open,
  onClose,
  data,
  metadata,
  availableSections = [],
  htmlGenerator,
  columnConfig = EMPTY_COLUMN_CONFIG,
}: PdfExportDrawerProps) {
  const [settings, setSettings] = useState<PdfExportSettings>(DEFAULT_SETTINGS);
  const [previewHtml, setPreviewHtml] = useState("");
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const columnWidthsRef = useRef<Record<number, Record<number, number>>>({});

  useEffect(() => {
    if (!open || !data || !htmlGenerator) return;

    const htmlBody = htmlGenerator(data, metadata, settings);

    let cssPageSize: string;
    if (settings.pageSize === "Custom") {
      const { customWidth: w, customHeight: h, customUnit: unit } = settings;
      cssPageSize =
        settings.orientation === "landscape" ? `${h}${unit} ${w}${unit}` : `${w}${unit} ${h}${unit}`;
    } else {
      const size = PAGE_SIZES[settings.pageSize];
      cssPageSize =
        settings.orientation === "landscape"
          ? `${size.height}${size.unit} ${size.width}${size.unit}`
          : `${size.width}${size.unit} ${size.height}${size.unit}`;
    }

    const previewPadding = MARGINS[settings.margin] || MARGINS.Normal;
    const mmToPx = 3.7795;

    let pageWPx: number;
    if (settings.pageSize === "Custom") {
      const { customWidth: w, customUnit: u } = settings;
      pageWPx = u === "in" ? Math.round(w * 25.4 * mmToPx) : u === "px" ? w : Math.round(w * mmToPx);
    } else {
      const size = PAGE_SIZES[settings.pageSize];
      pageWPx =
        size.unit === "in"
          ? Math.round((size.width as number) * 25.4 * mmToPx)
          : Math.round((size.width as number) * mmToPx);
    }

    if (settings.orientation === "landscape") {
      let pageHPx: number;
      if (settings.pageSize === "Custom") {
        const { customHeight: h, customUnit: u } = settings;
        pageHPx = u === "in" ? Math.round(h * 25.4 * mmToPx) : u === "px" ? h : Math.round(h * mmToPx);
      } else {
        const size = PAGE_SIZES[settings.pageSize];
        pageHPx =
          size.unit === "in"
            ? Math.round((size.height as number) * 25.4 * mmToPx)
            : Math.round((size.height as number) * mmToPx);
      }
      pageWPx = pageHPx;
    }

    const unwrapped = htmlBody
      .replace(/^\s*<div[^>]*id=["']pdf-content["'][^>]*>/i, "")
      .replace(/<\/div>\s*$/, "");

    const contentWithDividers = unwrapped.replace(
      /<hr[^>]*class=["']section-break["'][^>]*\/?>/gi,
      `<div class="section-divider"></div>`
    );

    const fullHtml = `
<!DOCTYPE html>
<html>
<head>
  <title>Report Preview</title>
  <style>
    @page {
      size: ${cssPageSize};
      margin: ${MARGINS[settings.margin]};
    }
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 20px;
      background: #525659;
      font-family: Arial, sans-serif;
    }
    .page-card {
      width: ${pageWPx}px;
      padding: ${previewPadding};
      margin: 0 auto;
      background: #fff;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      position: relative;
      font-family: Arial, sans-serif;
      font-size: 12px;
      line-height: 1.4;
      color: #333;
    }
    .page-card table {
      max-width: 100%;
      word-wrap: break-word;
    }
    .page-card td, .page-card th {
      word-break: break-word;
      overflow-wrap: anywhere;
      white-space: normal;
    }
    .section-divider {
      border: none;
      border-top: 1px dashed #bbb;
      margin: 16px 0;
    }
    th { position: relative; }
    .col-resize-handle {
      position: absolute;
      right: -3px;
      top: 0;
      bottom: 0;
      width: 6px;
      cursor: col-resize;
      z-index: 10;
    }
    .col-resize-handle:hover,
    .col-resize-handle.active {
      background: rgba(24, 144, 255, 0.4);
    }
  </style>
</head>
<body>
  <div class="page-card" id="main-page-card">
    ${contentWithDividers}
  </div>
  <script>
    (function() {
      var tables = document.querySelectorAll('table');
      tables.forEach(function(table, tableIndex) {
        table.style.tableLayout = 'fixed';
        var ths = table.querySelectorAll('thead th');
        if (!ths.length) return;

        ths.forEach(function(th) {
          th.style.width = th.offsetWidth + 'px';
          th.style.overflow = 'hidden';
          th.style.textOverflow = 'ellipsis';
        });

        ths.forEach(function(th, colIndex) {
          var handle = document.createElement('div');
          handle.className = 'col-resize-handle';
          th.appendChild(handle);

          var startX, startW;
          handle.addEventListener('mousedown', function(e) {
            e.preventDefault();
            handle.classList.add('active');
            startX = e.clientX;
            startW = th.offsetWidth;

            function onMove(ev) {
              var newW = Math.max(30, startW + (ev.clientX - startX));
              th.style.width = newW + 'px';
              window.parent.postMessage({
                type: 'column-resize',
                tableIndex: tableIndex,
                colIndex: colIndex,
                width: newW
              }, '*');
            }
            function onUp() {
              handle.classList.remove('active');
              document.removeEventListener('mousemove', onMove);
              document.removeEventListener('mouseup', onUp);
            }
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
          });
        });
      });
    })();
  </script>
</body>
</html>`;

    setPreviewHtml(fullHtml);
  }, [data, metadata, settings, open, htmlGenerator]);

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === "column-resize") {
        const { tableIndex, colIndex, width } = e.data;
        if (!columnWidthsRef.current[tableIndex]) columnWidthsRef.current[tableIndex] = {};
        columnWidthsRef.current[tableIndex][colIndex] = width;
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  useEffect(() => {
    if (!previewHtml || !iframeRef.current) return;
    const iframe = iframeRef.current;
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) return;
    const scrollY = iframe.contentWindow?.scrollY ?? 0;
    iframeDoc.open();
    iframeDoc.write(previewHtml);
    iframeDoc.close();
    requestAnimationFrame(() => {
      iframe.contentWindow?.scrollTo(0, scrollY);
    });
  }, [previewHtml]);

  const [downloading, setDownloading] = useState(false);
  const [printing, setPrinting] = useState(false);

  const handlePrint = () => {
    const iframe = iframeRef.current;
    if (!iframe || !iframe.contentWindow) return;
    setPrinting(true);
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
    setPrinting(false);
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const [{ jsPDF }, html2canvasModule] = await Promise.all([import("jspdf"), import("html2canvas")]);
      const html2canvas = (html2canvasModule as any).default || html2canvasModule;

      let pageWidthMm: number, pageHeightMm: number;
      if (settings.pageSize === "Custom") {
        const { customWidth: w, customHeight: h, customUnit: u } = settings;
        if (u === "in") {
          pageWidthMm = w * 25.4;
          pageHeightMm = h * 25.4;
        } else if (u === "px") {
          pageWidthMm = w * 0.264583;
          pageHeightMm = h * 0.264583;
        } else {
          pageWidthMm = w;
          pageHeightMm = h;
        }
      } else {
        const size = PAGE_SIZES[settings.pageSize];
        if (size.unit === "in") {
          pageWidthMm = (size.width as number) * 25.4;
          pageHeightMm = (size.height as number) * 25.4;
        } else {
          pageWidthMm = size.width as number;
          pageHeightMm = size.height as number;
        }
      }

      if (settings.orientation === "landscape") {
        [pageWidthMm, pageHeightMm] = [pageHeightMm, pageWidthMm];
      }

      const marginMm = parseFloat(MARGINS[settings.margin]) || 15;
      const contentWidthMm = pageWidthMm - marginMm * 2;
      const contentHeightMm = pageHeightMm - marginMm * 2;
      const mmToPx = 3.7795;
      const contentWidthPx = Math.round(contentWidthMm * mmToPx);

      const htmlBody = htmlGenerator(data, metadata, settings);
      const unwrapped = htmlBody
        .replace(/^\s*<div[^>]*id=["']pdf-content["'][^>]*>/i, "")
        .replace(/<\/div>\s*$/, "");
      const cleanContent = unwrapped.replace(
        /<hr[^>]*class=["']section-break["'][^>]*\/?>/gi,
        `<div style="border-top: 1px dashed #bbb; margin: 16px 0;"></div>`
      );

      const container = document.createElement("div");
      container.style.position = "absolute";
      container.style.left = "-99999px";
      container.style.top = "0";
      container.style.width = contentWidthPx + "px";
      container.style.fontFamily = "Arial, sans-serif";
      container.style.fontSize = "12px";
      container.style.lineHeight = "1.4";
      container.style.color = "#333";
      container.style.background = "#fff";
      container.innerHTML = cleanContent;
      document.body.appendChild(container);

      const savedWidths = columnWidthsRef.current;
      const tables = container.querySelectorAll("table");
      tables.forEach((table, tableIndex) => {
        (table as HTMLElement).style.tableLayout = "fixed";
        (table as HTMLElement).style.width = "100%";
        table.querySelectorAll("td, th").forEach((cell) => {
          (cell as HTMLElement).style.wordBreak = "break-word";
          (cell as HTMLElement).style.overflowWrap = "anywhere";
          (cell as HTMLElement).style.whiteSpace = "normal";
        });
        if (!savedWidths[tableIndex]) return;
        const ths = table.querySelectorAll("thead th");
        ths.forEach((th, colIndex) => {
          if (savedWidths[tableIndex][colIndex] != null) {
            (th as HTMLElement).style.width = savedWidths[tableIndex][colIndex] + "px";
            (th as HTMLElement).style.overflow = "hidden";
            (th as HTMLElement).style.textOverflow = "ellipsis";
          }
        });
      });

      await new Promise((r) => setTimeout(r, 500));

      const scale = 2;

      // Safe page-cut positions (canvas px): bottom edge of every table row and
      // top-level block, so a slice never lands mid-row and chops text in half.
      const containerRect = container.getBoundingClientRect();
      const breakSet = new Set<number>();
      const breakEls = [
        ...Array.from(container.children),
        ...Array.from(container.querySelectorAll("tr, h3, .section-divider")),
      ];
      breakEls.forEach((el) => {
        const r = el.getBoundingClientRect();
        breakSet.add(Math.round((r.bottom - containerRect.top) * scale));
      });
      const breakpoints = Array.from(breakSet).sort((a, b) => a - b);

      const fullCanvas = await html2canvas(container, {
        scale,
        logging: false,
        useCORS: true,
        allowTaint: true,
        width: contentWidthPx,
        windowWidth: contentWidthPx,
      });

      document.body.removeChild(container);

      const canvasPageHeight = Math.round(contentHeightMm * mmToPx * scale);
      const totalCanvasHeight = fullCanvas.height;
      const totalCanvasWidth = fullCanvas.width;

      const pdf = new jsPDF({
        orientation: settings.orientation,
        unit: "mm",
        format: [pageWidthMm, pageHeightMm],
      });

      let pageIndex = 0;
      let sourceY = 0;
      while (sourceY < totalCanvasHeight) {
        let sliceEnd = Math.min(sourceY + canvasPageHeight, totalCanvasHeight);
        if (sliceEnd < totalCanvasHeight) {
          // Snap the cut up to the last safe boundary that fits on this page;
          // fall back to a hard cut only if a single row is taller than a page.
          let snapped = -1;
          for (const bp of breakpoints) {
            if (bp > sliceEnd) break;
            if (bp > sourceY) snapped = bp;
          }
          if (snapped > sourceY) sliceEnd = snapped;
        }
        const sliceHeight = sliceEnd - sourceY;

        const sliceCanvas = document.createElement("canvas");
        sliceCanvas.width = totalCanvasWidth;
        sliceCanvas.height = sliceHeight;
        const ctx = sliceCanvas.getContext("2d")!;
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, totalCanvasWidth, sliceHeight);
        ctx.drawImage(fullCanvas, 0, sourceY, totalCanvasWidth, sliceHeight, 0, 0, totalCanvasWidth, sliceHeight);

        const imgData = sliceCanvas.toDataURL("image/png");
        const imgHeightMm = (sliceHeight / totalCanvasWidth) * contentWidthMm;

        if (pageIndex > 0) {
          pdf.addPage([pageWidthMm, pageHeightMm], settings.orientation);
        }
        pdf.addImage(imgData, "PNG", marginMm, marginMm, contentWidthMm, imgHeightMm);

        sourceY = sliceEnd;
        pageIndex++;
      }

      const filename = (metadata?.reportTitle || metadata?.title || "report")
        .replace(/[^a-zA-Z0-9]/g, "_")
        .toLowerCase();
      pdf.save(`${filename}.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
    } finally {
      setDownloading(false);
    }
  };

  const toggleSection = (section: string) => {
    setSettings((prev) => {
      const hidden = new Set(prev.hiddenSections);
      if (hidden.has(section)) hidden.delete(section);
      else hidden.add(section);
      return { ...prev, hiddenSections: Array.from(hidden) };
    });
  };

  const toggleColumn = (section: string, columnKey: string) => {
    setSettings((prev) => {
      const hiddenColumns = { ...prev.hiddenColumns };
      const current = hiddenColumns[section] || [];
      hiddenColumns[section] = current.includes(columnKey)
        ? current.filter((c) => c !== columnKey)
        : [...current, columnKey];
      return { ...prev, hiddenColumns };
    });
  };

  const toggleAllColumnsInSection = (section: string, columns: PdfColumnConfig[]) => {
    setSettings((prev) => {
      const hiddenColumns = { ...prev.hiddenColumns };
      const currentHidden = hiddenColumns[section] || [];
      hiddenColumns[section] = currentHidden.length === 0 ? columns.map((c) => c.key) : [];
      return { ...prev, hiddenColumns };
    });
  };

  return (
    <Drawer open={open} onClose={onClose} side="right" size={typeof window !== "undefined" ? window.innerWidth : 1200} zIndex={2000}>
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between px-6 py-3 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] dark:shadow-[inset_0_-1px_0_rgba(255,255,255,0.08)]">
          <h2 className="text-base font-semibold">Export to PDF</h2>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="outline" onClick={handlePrint} disabled={!previewHtml || printing}>
              {printing ? "Opening..." : "Print PDF"}
            </Button>
            <Button onClick={handleDownload} disabled={downloading}>
              {downloading && <Loader2 className="size-4 animate-spin" />}
              {downloading ? "Generating..." : "Download PDF"}
            </Button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 overflow-auto bg-[#525659]">
            <iframe ref={iframeRef} title="PDF Preview" className="h-full w-full border-0" />
          </div>

          <div className="w-95 shrink-0 overflow-y-auto bg-background p-6 shadow-[inset_1px_0_0_rgba(0,0,0,0.06)] dark:shadow-[inset_1px_0_0_rgba(255,255,255,0.08)]">
            <h3 className="mb-6 text-base font-semibold">Export Settings</h3>

            <div className="mb-6">
              <div className="mb-2 text-sm font-semibold">Page Size</div>
              <Select value={settings.pageSize} onValueChange={(v) => setSettings((s) => ({ ...s, pageSize: v }))}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A4">A4 (210 × 297 mm)</SelectItem>
                  <SelectItem value="A3">A3 (297 × 420 mm)</SelectItem>
                  <SelectItem value="A5">A5 (148 × 210 mm)</SelectItem>
                  <SelectItem value="Letter">Letter (8.5&quot; × 11&quot;)</SelectItem>
                  <SelectItem value="Legal">Legal (8.5&quot; × 14&quot;)</SelectItem>
                  <SelectItem value="Tabloid">Tabloid (11&quot; × 17&quot;)</SelectItem>
                  <SelectItem value="B4">B4 (250 × 353 mm)</SelectItem>
                  <SelectItem value="B5">B5 (176 × 250 mm)</SelectItem>
                  <SelectItem value="Custom">Custom Size</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {settings.pageSize === "Custom" && (
              <div className="mb-6 rounded-lg bg-muted p-4">
                <div className="mb-3 text-sm font-semibold">Custom Dimensions</div>
                <div className="mb-2 flex gap-2">
                  <div className="flex-1">
                    <div className="mb-1 text-xs">Width</div>
                    <Input
                      type="number"
                      min={50}
                      max={2000}
                      value={settings.customWidth}
                      onChange={(e) => setSettings((s) => ({ ...s, customWidth: Number(e.target.value) || 210 }))}
                    />
                  </div>
                  <div className="flex-1">
                    <div className="mb-1 text-xs">Height</div>
                    <Input
                      type="number"
                      min={50}
                      max={2000}
                      value={settings.customHeight}
                      onChange={(e) => setSettings((s) => ({ ...s, customHeight: Number(e.target.value) || 297 }))}
                    />
                  </div>
                </div>
                <div>
                  <div className="mb-1 text-xs">Unit</div>
                  <div className="flex w-full rounded-lg bg-background p-0.5 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.04)]">
                    {(["mm", "in", "px"] as const).map((unit) => (
                      <button
                        key={unit}
                        type="button"
                        onClick={() => setSettings((s) => ({ ...s, customUnit: unit }))}
                        className={cn(
                          "flex-1 rounded-[7px] py-1 text-xs transition-colors",
                          settings.customUnit === unit
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:bg-muted"
                        )}
                      >
                        {unit === "in" ? "inches" : unit}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="mb-6">
              <div className="mb-2 text-sm font-semibold">Page Orientation</div>
              <div className="flex w-full rounded-lg bg-muted p-0.5 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.04)]">
                {(["portrait", "landscape"] as const).map((o) => (
                  <button
                    key={o}
                    type="button"
                    onClick={() => setSettings((s) => ({ ...s, orientation: o }))}
                    className={cn(
                      "flex-1 rounded-[7px] py-1.5 text-sm capitalize transition-colors",
                      settings.orientation === o
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-background/60"
                    )}
                  >
                    {o}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <div className="mb-2 text-sm font-semibold">Scale</div>
              <Select
                value={String(settings.scale)}
                onValueChange={(v) => setSettings((s) => ({ ...s, scale: Number(v) }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0.5">50%</SelectItem>
                  <SelectItem value="0.75">75%</SelectItem>
                  <SelectItem value="1">100% (Default)</SelectItem>
                  <SelectItem value="1.25">125%</SelectItem>
                  <SelectItem value="1.5">150%</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="mb-6">
              <div className="mb-2 text-sm font-semibold">Margins</div>
              <Select value={settings.margin} onValueChange={(v) => setSettings((s) => ({ ...s, margin: v }))}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Normal">Normal</SelectItem>
                  <SelectItem value="Narrow">Narrow</SelectItem>
                  <SelectItem value="Wide">Wide</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="mb-6 border-t pt-6">
              <div className="mb-1 text-sm font-semibold">Content Selection</div>
              <div className="mb-4 text-xs text-muted-foreground">
                Select sections and columns to include in the PDF export
              </div>

              <Accordion multiple defaultValue={["sections", ...Object.keys(columnConfig).map((s) => `columns-${s}`)]}>
                <AccordionItem value="sections">
                  <AccordionTrigger>
                    <div className="flex w-full items-center justify-between pr-2">
                      <span>Report Sections</span>
                      <span className="text-xs text-muted-foreground">
                        {availableSections.length - settings.hiddenSections.length} / {availableSections.length}{" "}
                        selected
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="flex flex-col gap-3 pl-2">
                      <label className="flex items-center gap-2 font-semibold">
                        <Checkbox
                          checked={settings.hiddenSections.length === 0}
                          onCheckedChange={(checked) =>
                            setSettings((s) => ({
                              ...s,
                              hiddenSections: checked ? [] : [...availableSections],
                            }))
                          }
                        />
                        Select All Sections
                      </label>
                      <div className="h-px bg-border" />
                      {availableSections.map((section) => (
                        <label key={section} className="flex items-center gap-2 pl-2">
                          <Checkbox
                            checked={!settings.hiddenSections.includes(section)}
                            onCheckedChange={() => toggleSection(section)}
                          />
                          {section}
                        </label>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {Object.keys(columnConfig).map((section) => {
                  const columns = columnConfig[section] || [];
                  if (columns.length === 0) return null;
                  const hiddenColumnsInSection = settings.hiddenColumns[section] || [];
                  const visibleCount = columns.length - hiddenColumnsInSection.length;

                  return (
                    <AccordionItem key={section} value={`columns-${section}`}>
                      <AccordionTrigger>
                        <div className="flex w-full items-center justify-between pr-2">
                          <span>{section} - Columns</span>
                          <span className="text-xs text-muted-foreground">
                            {visibleCount} / {columns.length} visible
                          </span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="flex flex-col gap-3 pl-2">
                          <label className="flex items-center gap-2 font-semibold">
                            <Checkbox
                              checked={hiddenColumnsInSection.length === 0}
                              onCheckedChange={() => toggleAllColumnsInSection(section, columns)}
                            />
                            Select All Columns
                          </label>
                          <div className="h-px bg-border" />
                          {columns.map((column) => (
                            <label key={column.key} className="flex items-center gap-2 pl-2 text-xs">
                              <Checkbox
                                checked={!hiddenColumnsInSection.includes(column.key)}
                                onCheckedChange={() => toggleColumn(section, column.key)}
                              />
                              {column.label}
                            </label>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </div>
          </div>
        </div>
      </div>
    </Drawer>
  );
}
