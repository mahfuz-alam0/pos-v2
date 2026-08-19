import { isTauriDesktop } from "@/lib/update-check";

export interface LocalPrinter {
  name: string;
  status: "idle" | "printing" | "disabled" | "unknown";
  isDefault: boolean;
}

interface RawLocalPrinter {
  name: string;
  status: string;
  is_default: boolean;
}

// Real OS printer enumeration (list_local_printers in src-tauri/src/lib.rs,
// shelling out to `lpstat` on macOS/Linux or Win32_Printer via PowerShell on
// Windows) only exists in the Tauri desktop build — browsers have no API to
// list system printers at all, so this resolves to an empty list there.
export async function listLocalPrinters(): Promise<LocalPrinter[]> {
  if (!isTauriDesktop()) return [];

  const { invoke } = await import("@tauri-apps/api/core");
  const printers = await invoke<RawLocalPrinter[]>("list_local_printers");
  return printers.map((p) => ({ name: p.name, status: p.status as LocalPrinter["status"], isDefault: p.is_default }));
}

export interface PrinterMedia {
  mediaName: string;
  widthMm: number;
  heightMm: number;
}

interface RawPrinterMedia {
  media_name: string;
  width_mm: number;
  height_mm: number;
}

// The stock actually loaded on a queue (get_local_printer_media in
// src-tauri/src/printers.rs, read off the queue's PPD). renderNodeToPdf uses it
// to lay the label out on a page the size of the real label rather than cutting
// the page down to the artwork — on a label printer the media becomes a TSPL
// `SIZE` that drives the gap sensor, so a page cut to the artwork makes the
// printer feed by the wrong pitch and print only a fragment. Resolves to null
// off the desktop build, on Windows (no PPD to read), and for any queue whose
// size can't be determined; callers then fall back to the artwork-sized page.
export async function getLocalPrinterMedia(printerName: string): Promise<PrinterMedia | null> {
  if (!isTauriDesktop()) return null;

  const { invoke } = await import("@tauri-apps/api/core");
  const media = await invoke<RawPrinterMedia | null>("get_local_printer_media", { printerName });
  if (!media) return null;
  return { mediaName: media.media_name, widthMm: media.width_mm, heightMm: media.height_mm };
}

export interface PrintPdfToLocalPrinterParams {
  printerName: string;
  pdfBytes: number[];
  widthMm: number;
  heightMm: number;
  numOfCopies: number;
}

// Silent, no-dialog print of an already-rendered PDF straight to a named
// local printer (print_pdf_to_local_printer in src-tauri/src/printers.rs —
// shells out to CUPS `lp` on macOS/Linux, PowerShell PrintTo on Windows).
// This is the local counterpart to createPrintJob's remote hardware-client
// dispatch; see dispatchPrintJob.ts for the routing between the two.
export async function printPdfToLocalPrinter({
  printerName,
  pdfBytes,
  widthMm,
  heightMm,
  numOfCopies,
}: PrintPdfToLocalPrinterParams): Promise<void> {
  if (!isTauriDesktop()) {
    throw new Error("Local printing is only available in the desktop app");
  }
  const { invoke } = await import("@tauri-apps/api/core");
  await invoke("print_pdf_to_local_printer", {
    printerName,
    pdfBytes,
    widthMm,
    heightMm,
    numOfCopies,
  });
}
