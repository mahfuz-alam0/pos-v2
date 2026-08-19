"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useDispatch } from "react-redux";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { resetSalesDetail } from "@/store/slices/salesDetailSlice";
import { resetAddedLineITems } from "@/store/slices/lineItemsSlice";
import { resetQuoteForSale } from "@/store/slices/quoteForSaleSlice";
import { resetCartForSale } from "@/store/slices/cartSlice";
import { setSelectedCustomer } from "@/store/slices/customerSlice";
import Receipt from "@/components/pos/Receipt";
import PrintPreviewModal from "@/components/pos/PrintPreviewModal";
import { JOB_TYPES } from "@/hooks/usePrintClients";
import { isTauriDesktop } from "@/lib/update-check";
import { dispatchPrintJob } from "@/services/printClients/dispatchPrintJob";
import { printPdfInBrowser, renderNodeToImage } from "@/services/printClients/renderNodeToPdf";

const PX_TO_MM = 25.4 / 96;

// A receipt is text to the edges, unlike a label's fixed artwork, so printing
// it flush puts characters right where the head's usable width runs out a
// little short of the paper's. renderNodeToPdf keeps the receipt inside the
// stock either way; this just stops it from landing hard against the boundary.
// Applies only to "Print Invoice" (the local-printer path) — the label/pull-sheet
// modals deliberately fill their stock, and browser print does its own margins.
const RECEIPT_SIDE_MARGIN_MM = 2;

// Print a specific DOM node via the browser, isolating it with a print-only
// stylesheet — same visibility-toggle trick used in PrinterDeviceSetup's
// printInCurrentWindow, so both hardware-print's fallback and the plain
// "Print Invoice (Web)" button behave identically. Without an explicit
// @page size the browser falls back to the system default (Letter/A4)
// instead of the receipt's own roll width, so size the page to the node's
// own rendered footprint (same PX_TO_MM measurement renderNodeToPdf.ts uses
// for the local-hardware path).
export function printNode(node) {
  if (!node) return;
  const widthMm = Math.max(1, node.getBoundingClientRect().width * PX_TO_MM);
  const styleId = "pos-receipt-print-styles";
  document.getElementById(styleId)?.remove();
  const style = document.createElement("style");
  style.id = styleId;
  style.innerHTML = `
    @media print {
      @page { size: ${widthMm}mm auto; margin: 0; }
      body * { visibility: hidden; }
      #pos-receipt-print-area, #pos-receipt-print-area * { visibility: visible; }
      /* !important: the print area's inline style (position:fixed;left:-9999px,
         used to keep it off-screen normally) would otherwise outrank this. */
      #pos-receipt-print-area {
        position: absolute !important;
        left: 0 !important;
        top: 0 !important;
        width: ${widthMm}mm !important;
      }
    }
  `;
  document.head.appendChild(style);
  window.print();
}

/**
 * Post-sale receipt modal.
 *
 * Print mechanism: two paths, both printing the same off-screen `<Receipt>`
 * (id="pos-receipt-print-area"), and both identical to PrintLabelModal /
 * PrintOrderModal so all three behave the same on desktop and web —
 *   1. "Print Invoice": dispatchPrintJob, which prefers a local printer on the
 *      Tauri build (rendering to a PDF laid out on that queue's real stock)
 *      and otherwise relays to the remote hardware client. Falls back to (2)
 *      when nothing is configured, the local print fails, or the remote client
 *      doesn't ack.
 *   2. "Print Invoice (Web)"/"Preview Invoice": the browser's own print-preview
 *      popup on the web; on desktop there is no such popup, so it opens the
 *      same in-app preview PrintLabelModal's "Check Label" uses.
 *
 * Props:
 *   open, onClose              — visibility control (old isNewOrderModal / setIsNewOrderModal).
 *   handlePrint()              — optional extra browser-print hook from the parent (legacy compat).
 *   createOrderRes             — createOrder response; drives the receipt body + Metrc button.
 *   shopId, shopDetails        — for the hardware print job + receipt header.
 *   customerName               — shown on the receipt.
 *   reportToMetric(saleId)     — callback to push the sale to Metrc.
 *   changeAmount               — cash change to surface at the top + on the receipt.
 *   labMode                    — when true, shows the Email Receipt button (stub, matches legacy).
 *   onNewOrder()               — optional; fired after the sale state is reset.
 */
export default function PrintReceiptModal({
  open,
  onClose,
  handlePrint,
  createOrderRes,
  shopId,
  shopDetails,
  customerName,
  reportToMetric,
  changeAmount = 0,
  labMode = true,
  onNewOrder,
}) {
  const dispatch = useDispatch();
  const receiptRef = useRef(null);
  const [hardwarePrinting, setHardwarePrinting] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  // isTauriDesktop() reads `window`, so resolve it after mount instead of
  // during render — the secondary button's label depends on it, and reading it
  // inline would have the server and the first client render disagree.
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => setIsDesktop(isTauriDesktop()), []);

  if (!open) return null;

  // Both the print area (below) and the modal itself portal straight to
  // <body> — TotalCard stays mounted-but-hidden (display:none) in Tablet
  // Mode, and display:none on an ancestor hides fixed-position descendants
  // too, not just in-flow ones. Without portaling, this modal (and the
  // "New Order" reset it gates) would silently never appear there.

  const handleNewOrder = () => {
    onClose?.();
    dispatch(resetSalesDetail());
    dispatch(resetAddedLineITems());
    dispatch(resetQuoteForSale());
    dispatch(resetCartForSale());
    dispatch(setSelectedCustomer(null));
    onNewOrder?.();
  };

  const printInBrowser = () => {
    if (!receiptRef.current) return;
    printPdfInBrowser(receiptRef.current).catch(() => toast.error("Failed to generate receipt PDF"));
    handlePrint?.();
  };

  // Same in-app preview PrintLabelModal's "Check Label" opens: the Tauri
  // webview has no native print-preview popup to fall back to, so on desktop
  // this shows the rendered receipt instead of silently doing nothing.
  const showPreview = async () => {
    if (!receiptRef.current) return;
    if (!isTauriDesktop()) {
      printInBrowser();
      return;
    }
    setPreviewImage(null);
    setPreviewOpen(true);
    try {
      const { dataUrl } = await renderNodeToImage(receiptRef.current);
      setPreviewImage(dataUrl);
    } catch {
      toast.error("Failed to generate receipt preview");
      setPreviewOpen(false);
    }
  };

  // Deliberately does not close the modal on success, unlike PrintLabelModal:
  // "New Order" and "Update on Metrc" still live here and are the point of the
  // post-sale screen.
  const printOnHardware = async () => {
    setHardwarePrinting(true);
    try {
      const result = await dispatchPrintJob({
        shopId,
        jobType: JOB_TYPES.RECEIPT,
        node: receiptRef.current,
        numOfCopies: 1,
        sideMarginMm: RECEIPT_SIDE_MARGIN_MM,
      });

      switch (result.status) {
        case "local-success":
        case "remote-success":
          toast.success("Receipt sent to printer");
          break;
        case "no-preference":
          toast.info("No printer configured for receipts. Using browser print.");
          printInBrowser();
          break;
        case "remote-not-acked":
          toast.warning("Print client did not respond. Using browser print.");
          printInBrowser();
          break;
        case "local-failed":
        case "remote-failed":
          toast.error((result.error as any)?.message || "Failed to print on hardware. Using browser print.");
          printInBrowser();
          break;
      }
    } catch (err) {
      toast.error(err?.message || "Failed to print on hardware. Using browser print.");
      printInBrowser();
    } finally {
      setHardwarePrinting(false);
    }
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <>
      {/* Off-screen print source, kept separate from the visible modal below
          so its `position: absolute` print rule resolves top:0/left:0
          against the page, not against the (centered) modal. */}
      <div
        id="pos-receipt-print-area"
        ref={receiptRef}
        style={{ position: "fixed", left: -9999, top: 0 }}
      >
        <Receipt
          order={createOrderRes}
          shopDetails={shopDetails}
          customerName={customerName}
          changeAmount={changeAmount}
        />
      </div>

      <div className="fixed inset-0 z-10000 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
        <div className="relative z-1 w-full max-w-md rounded-xl bg-card p-5 shadow-2xl">
        <div className="flex w-full flex-col gap-3">
          {changeAmount > 0 && (
            <div className="rounded-lg border border-green-300 bg-green-50 px-4 py-3 text-center dark:border-green-800 dark:bg-green-950">
              <div className="text-[13px] font-medium text-green-700 dark:text-green-400">
                Change amount
              </div>
              <div className="text-[28px] font-bold text-green-800 dark:text-green-300">
                ${Number(changeAmount).toFixed(2)}
              </div>
            </div>
          )}

          <Button
            onClick={printOnHardware}
            disabled={hardwarePrinting}
            className="py-6! text-2xl"
            style={{ backgroundColor: "#E9A23B", color: "white" }}
          >
            {hardwarePrinting ? "Printing…" : "Print Invoice"}
          </Button>

          <Button
            onClick={showPreview}
            className="py-6! text-2xl"
            style={{ backgroundColor: "#5C6BC0", color: "white" }}
          >
            {isDesktop ? "Preview Invoice" : "Print Invoice (Web)"}
          </Button>

          {createOrderRes?.shouldAttemptMetrcReporting &&
            !createOrderRes?.isAutomatedReportingEnabled && (
              <Button
                onClick={() => reportToMetric?.(createOrderRes?.saleId)}
                className="py-6! text-2xl"
                style={{ backgroundColor: "#E76F51", color: "white" }}
              >
                Update on Metrc
              </Button>
            )}

          {labMode && (
            <Button
              onClick={() =>
                toast.success(
                  "The receipt has been successfully sent to the customer"
                )
              }
              className="py-6! text-2xl"
              style={{ backgroundColor: "#2196F3", color: "white" }}
            >
              Email Receipt
            </Button>
          )}

          <Button
            onClick={handleNewOrder}
            className="py-6! text-2xl"
            style={{ background: "#2A9D8F", color: "#fff" }}
          >
            New Order
          </Button>
        </div>
        </div>
      </div>

      {/* z-10001: this modal is a hand-rolled overlay at z-10000, above the
          Dialog's own z-60, so the preview has to be lifted over it. */}
      <PrintPreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        imageUrl={previewImage}
        title="Receipt Preview"
        className="z-10001"
      />
    </>,
    document.body
  );
}
