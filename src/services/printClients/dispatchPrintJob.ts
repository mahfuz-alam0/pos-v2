import { isTauriDesktop } from "@/lib/update-check";
import { connectToSocket } from "@/lib/socket";
import { getUserPrintPreference, createPrintJob } from "./printClients";
import { getConnectedUserPrintPreference, type ConnectedPrintJobType } from "./connectedUserPrintPreference";
import { renderNodeToPdf } from "./renderNodeToPdf";
import { getLocalPrinterMedia, printPdfToLocalPrinter } from "./localPrinters";

// Single place that knows how a print job actually gets to paper, shared by
// every print modal (PrintLabelModal, PrintOrderModal, ...) instead of each
// one re-implementing its own preference-check + hardware dispatch. Two
// independent preferences can be configured per job type (see
// LocalDeviceManager.tsx vs PrinterDeviceSetup.tsx / PrinterSetupDrawer.tsx's
// Local/Remote tabs) — Local always wins when set, since picking a local
// printer is an explicit "print on this machine" choice that should never
// silently fall through to a remote relay.
export interface PrintReadiness {
  ready: boolean;
  via: "local" | "remote" | null;
  localDeviceName?: string;
  remoteSetUpId?: string;
  remoteSessionId?: string;
}

export async function resolvePrintReadiness(shopId: string | undefined, jobType: string): Promise<PrintReadiness> {
  if (!shopId) return { ready: false, via: null };

  if (isTauriDesktop()) {
    try {
      const localPref = await getConnectedUserPrintPreference(shopId, jobType as ConnectedPrintJobType);
      const deviceName = localPref?.success ? localPref?.data?.deviceProps?.deviceName : null;
      if (deviceName) {
        return { ready: true, via: "local", localDeviceName: deviceName };
      }
    } catch {
      // No local preference saved (404) or lookup failed — fall through to remote.
    }
  }

  try {
    const pref = await getUserPrintPreference(shopId, jobType);
    if (pref?.success && pref?.data?.setUpId) {
      return {
        ready: true,
        via: "remote",
        remoteSetUpId: pref.data.setUpId,
        remoteSessionId: pref.data.sessionId,
      };
    }
  } catch {
    // No remote preference configured — falls through to "not ready" below.
  }

  return { ready: false, via: null };
}

export type PrintDispatchStatus =
  | "local-success"
  | "remote-success"
  | "no-preference"
  | "local-failed"
  | "remote-not-acked"
  | "remote-failed";

export interface PrintDispatchResult {
  status: PrintDispatchStatus;
  error?: unknown;
}

export interface DispatchPrintJobParams {
  shopId: string | undefined;
  jobType: string;
  node: HTMLElement | null;
  numOfCopies: number;
  isTest?: boolean;
  /**
   * Blank stock to leave down each side on the local-printer path, in mm.
   * Per-caller because it's a property of the artwork, not of printing: a label
   * is drawn to fill its stock deliberately, whereas the receipt runs the full
   * roll width and needs the head's edges kept clear. Ignored on the remote
   * path, which relays HTML and does its own layout.
   */
  sideMarginMm?: number;
}

// Checks the local preference first; if a local printer is set for this job
// type, renders the print node straight to a PDF and sends it to that
// printer directly — no API call, no remote hardware-client relay. Only
// when local isn't configured does this fall back to the existing remote
// flow (createPrintJob over the hclient-web-facing socket). Callers own the
// user-facing fallback: a "no-preference"/"*-failed"/"remote-not-acked"
// result means the caller should fall back to browser print (see
// PrintLabelModal / PrintOrderModal's printInBrowser).
export async function dispatchPrintJob({
  shopId,
  jobType,
  node,
  numOfCopies,
  isTest = false,
  sideMarginMm = 0,
}: DispatchPrintJobParams): Promise<PrintDispatchResult> {
  const readiness = await resolvePrintReadiness(shopId, jobType);

  if (readiness.via === "local" && readiness.localDeviceName) {
    try {
      if (!node) throw new Error("Nothing to print");
      // Lay the artwork out on the stock the queue is actually loaded with, not
      // on a page cut down to the artwork — see renderNodeToPdf/getLocalPrinterMedia,
      // which also scales it down if it would otherwise overhang that stock.
      // A queue whose size can't be read resolves to null and keeps the
      // artwork-sized page.
      const stock = await getLocalPrinterMedia(readiness.localDeviceName).catch(() => null);
      const { bytes, widthMm, heightMm } = await renderNodeToPdf(node, stock, { sideMarginMm });
      await printPdfToLocalPrinter({
        printerName: readiness.localDeviceName,
        pdfBytes: bytes,
        widthMm,
        heightMm,
        numOfCopies,
      });
      return { status: "local-success" };
    } catch (err) {
      return { status: "local-failed", error: err };
    }
  }

  if (readiness.via === "remote" && readiness.remoteSetUpId) {
    const socket = connectToSocket({
      url: `${process.env.NEXT_PUBLIC_BASE_URL}/hclient-web-facing`,
      shopId,
    });
    const requestId = Math.random().toString(36).slice(2);
    // The remote client lays this markup out and prints it itself, so the page
    // has to be set up here. A browser's defaults — 8px on <body>, plus its own
    // page margin — push the artwork right and down by a couple of millimetres,
    // which is enough to shove the edge of a receipt or label off stock that
    // has only millimetres to spare. Zeroing both makes the client's output
    // start where the artwork does, matching the local PDF path.
    const html = `<html><head><style>@page{margin:0}html,body{margin:0;padding:0}</style></head><body>${
      node?.innerHTML || ""
    }</body></html>`;

    const ackPromise = new Promise<boolean>((resolve) => {
      const timeoutId = setTimeout(() => resolve(false), 8000);
      socket?.on("printJobPicked", (data: any) => {
        if (data?.requestId !== requestId) return;
        clearTimeout(timeoutId);
        resolve(true);
      });
    });

    try {
      await createPrintJob({
        shopId,
        jobType,
        sessionId: readiness.remoteSessionId,
        numOfCopies,
        setUpId: readiness.remoteSetUpId,
        requestId,
        html,
        isTest,
      });
    } catch (err) {
      socket?.disconnect();
      return { status: "remote-failed", error: err };
    }

    const acked = await ackPromise;
    socket?.disconnect();

    return acked ? { status: "remote-success" } : { status: "remote-not-acked" };
  }

  return { status: "no-preference" };
}
