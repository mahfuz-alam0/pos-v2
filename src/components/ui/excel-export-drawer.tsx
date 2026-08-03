"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import * as XLSX from "xlsx";

import Drawer from "@/components/ui/Drawer";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import type { PdfColumnConfig } from "@/components/ui/pdf-export-drawer";

declare global {
  interface Window {
    luckysheet?: any;
  }
}

export interface ExcelExportSettings {
  hiddenSections: string[];
  hiddenColumns: Record<string, string[]>;
}

const DEFAULT_SETTINGS: ExcelExportSettings = {
  hiddenSections: [],
  hiddenColumns: {},
};

const EMPTY_COLUMN_CONFIG: Record<string, PdfColumnConfig[]> = {};

const CURRENCY_RE = /^-?\$[\d,]+(?:\.\d+)?$|^\$-?[\d,]+(?:\.\d+)?$/;

function applyCurrencyFormatToSheet(ws: XLSX.WorkSheet) {
  const range = XLSX.utils.decode_range(ws["!ref"] || "A1");
  for (let r = range.s.r; r <= range.e.r; r++) {
    for (let c = range.s.c; c <= range.e.c; c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      const cell = ws[addr];
      if (!cell) continue;
      const val = cell.v;
      if (typeof val === "string" && CURRENCY_RE.test(val)) {
        const num = parseFloat(val.replace(/[$,]/g, ""));
        if (!isNaN(num)) {
          cell.v = num;
          cell.t = "n";
          cell.z = "$#,##0.00";
          cell.w = undefined;
        }
      }
    }
  }
  return ws;
}

function toLuckysheetCell(cell: any) {
  if (typeof cell === "string" && CURRENCY_RE.test(cell)) {
    const num = parseFloat(cell.replace(/[$,]/g, ""));
    if (!isNaN(num)) {
      return { v: num, ct: { fa: "$#,##0.00", t: "n" }, m: cell };
    }
  }
  if (typeof cell === "string") {
    return { v: cell, m: cell, ct: { fa: "@", t: "s" } };
  }
  return { v: cell, m: String(cell) };
}

let luckysheetLoadPromise: Promise<void> | null = null;

function loadLuckysheetDependencies() {
  if (luckysheetLoadPromise) return luckysheetLoadPromise;

  luckysheetLoadPromise = new Promise<void>((resolve, reject) => {
    if (window.luckysheet) return resolve();

    const loadCSS = (href: string) =>
      new Promise<void>((res) => {
        if (document.querySelector(`link[href="${href}"]`)) return res();
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = href;
        link.onload = () => res();
        link.onerror = () => res();
        document.head.appendChild(link);
      });

    const loadJS = (src: string) =>
      new Promise<void>((res, rej) => {
        const existing = document.querySelector(`script[src="${src}"]`);
        if (existing) {
          existing.addEventListener("load", () => res());
          res();
          return;
        }
        const script = document.createElement("script");
        script.src = src;
        script.onload = () => res();
        script.onerror = () => rej(new Error(`Failed to load ${src}`));
        document.head.appendChild(script);
      });

    (async () => {
      try {
        await Promise.all([
          loadCSS("https://cdn.jsdelivr.net/npm/luckysheet/dist/plugins/css/pluginsCss.css"),
          loadCSS("https://cdn.jsdelivr.net/npm/luckysheet/dist/plugins/plugins.css"),
          loadCSS("https://cdn.jsdelivr.net/npm/luckysheet/dist/css/luckysheet.css"),
          loadCSS("https://cdn.jsdelivr.net/npm/luckysheet/dist/assets/iconfont/iconfont.css"),
        ]);
        await loadJS("https://cdn.jsdelivr.net/npm/luckysheet/dist/plugins/js/plugin.js");
        await loadJS("https://cdn.jsdelivr.net/npm/luckysheet/dist/luckysheet.umd.js");

        const check = () => {
          if (window.luckysheet) resolve();
          else setTimeout(check, 100);
        };
        check();
      } catch (e) {
        luckysheetLoadPromise = null;
        reject(e);
      }
    })();
  });

  return luckysheetLoadPromise;
}

export interface ExcelSheet {
  name: string;
  data: any[][];
}

interface ExcelExportDrawerProps {
  open: boolean;
  onClose: () => void;
  data: any;
  metadata: any;
  availableSections?: string[];
  excelGenerator: (data: any, metadata: any, settings: ExcelExportSettings) => ExcelSheet[];
  columnConfig?: Record<string, PdfColumnConfig[]>;
  filename?: string;
}

export default function ExcelExportDrawer({
  open,
  onClose,
  data,
  metadata,
  availableSections = [],
  excelGenerator,
  columnConfig = EMPTY_COLUMN_CONFIG,
  filename = "export",
}: ExcelExportDrawerProps) {
  const [settings, setSettings] = useState<ExcelExportSettings>(DEFAULT_SETTINGS);
  const [libLoaded, setLibLoaded] = useState(false);
  const [libError, setLibError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const generatedSheetsRef = useRef<ExcelSheet[]>([]);

  useEffect(() => {
    if (!open) {
      setLibLoaded(false);
      try {
        window.luckysheet?.destroy();
      } catch {}
      return;
    }

    let cancelled = false;
    loadLuckysheetDependencies()
      .then(() => {
        if (!cancelled) setLibLoaded(true);
      })
      .catch((err) => {
        console.error("Failed to load Luckysheet dependencies", err);
        if (!cancelled) setLibError(true);
      });

    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open || !libLoaded || !excelGenerator || !containerRef.current) return;

    try {
      window.luckysheet?.destroy();
    } catch {}

    const sheets = excelGenerator(data, metadata, settings);
    generatedSheetsRef.current = sheets;

    const luckysheetData = sheets.map((sheet, i) => {
      const maxCols = sheet.data.reduce((max, row) => Math.max(max, row?.length || 0), 0);
      return {
        name: sheet.name,
        index: i,
        order: i,
        status: i === 0 ? 1 : 0,
        row: Math.max((sheet.data.length || 0) + 20, 100),
        column: Math.max(maxCols + 10, 20),
        celldata: sheet.data.flatMap((row, r) =>
          row.map((cell, c) => {
            if (cell === null || cell === undefined || cell === "") return null;
            return { r, c, v: toLuckysheetCell(cell) };
          }),
        ).filter(Boolean),
      };
    });

    const timer = setTimeout(() => {
      try {
        window.luckysheet.create({
          container: "luckysheet-export-container",
          data: luckysheetData,
          showinfobar: false,
          showtoolbar: true,
          showsheetbar: true,
          showstatisticBar: true,
          enableAddRow: false,
          enableAddCol: false,
        });
      } catch (error) {
        console.error("Luckysheet init error:", error);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [data, metadata, settings, open, libLoaded, excelGenerator]);

  const [downloading, setDownloading] = useState(false);

  const handleDownload = () => {
    if (!generatedSheetsRef.current.length) return;
    setDownloading(true);
    try {
      const exportedSheets = window.luckysheet?.getAllSheets?.();
      const wb = XLSX.utils.book_new();

      if (exportedSheets?.length) {
        exportedSheets.forEach((lSheet: any) => {
          if (lSheet.status === 0 && lSheet.hide === 1) return;
          const aoa: any[][] = [];
          for (let r = 0; r < lSheet.data.length; r++) {
            const row: any[] = [];
            for (let c = 0; c < lSheet.data[r].length; c++) {
              const cell = lSheet.data[r][c];
              row.push(cell ? cell.v : "");
            }
            aoa.push(row);
          }
          while (aoa.length && aoa[aoa.length - 1].every((v) => v === "" || v === null)) {
            aoa.pop();
          }
          if (aoa.length > 0) {
            const ws = XLSX.utils.aoa_to_sheet(aoa);
            applyCurrencyFormatToSheet(ws);
            XLSX.utils.book_append_sheet(wb, ws, lSheet.name.substring(0, 31));
          }
        });
      }

      if (wb.SheetNames.length === 0) {
        generatedSheetsRef.current.forEach((sheet) => {
          const ws = XLSX.utils.aoa_to_sheet(sheet.data);
          applyCurrencyFormatToSheet(ws);
          XLSX.utils.book_append_sheet(wb, ws, sheet.name.substring(0, 31));
        });
      }

      XLSX.writeFile(wb, `${filename}.xlsx`);
    } catch (error) {
      console.error("Error creating Excel:", error);
      const wb = XLSX.utils.book_new();
      generatedSheetsRef.current.forEach((sheet) => {
        const ws = XLSX.utils.aoa_to_sheet(sheet.data);
        applyCurrencyFormatToSheet(ws);
        XLSX.utils.book_append_sheet(wb, ws, sheet.name.substring(0, 31));
      });
      XLSX.writeFile(wb, `${filename}.xlsx`);
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
          <h2 className="text-base font-semibold">Export to Excel Preview</h2>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleDownload} disabled={downloading || !libLoaded}>
              {downloading && <Loader2 className="size-4 animate-spin" />}
              {downloading ? "Generating..." : "Download Excel"}
            </Button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="relative flex-1 overflow-hidden bg-white">
            {!libLoaded && !libError && (
              <div className="flex h-full items-center justify-center">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Loading Excel preview...</span>
              </div>
            )}
            {libError && (
              <div className="flex h-full items-center justify-center text-sm text-destructive">
                Failed to load Excel preview. You can still download directly.
              </div>
            )}
            <div
              id="luckysheet-export-container"
              ref={containerRef}
              className="absolute left-0 top-0 h-full w-full"
              style={{ display: libLoaded ? "block" : "none" }}
            />
          </div>

          <div className="w-[380px] shrink-0 overflow-y-auto bg-background p-6 shadow-[inset_1px_0_0_rgba(0,0,0,0.06)] dark:shadow-[inset_1px_0_0_rgba(255,255,255,0.08)]">
            <h3 className="mb-6 text-base font-semibold">Export Settings</h3>

            <div className="mb-1 text-sm font-semibold">Content Selection</div>
            <div className="mb-4 text-xs text-muted-foreground">
              Select sections and columns to include in the Excel export
            </div>

            <Accordion multiple defaultValue={["sections", ...Object.keys(columnConfig).map((s) => `columns-${s}`)]}>
              {availableSections.length > 0 && (
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
              )}

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
    </Drawer>
  );
}
