"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import OrderPrintContent from "./OrderPrintContent";
import { useShop } from "@/context/shop-context";
import {
  dispatchPrintJob,
  resolvePrintReadiness,
  type PrintReadiness,
} from "@/services/printClients/dispatchPrintJob";

const RECEIPT_OPTION = { value: "RECEIPT", label: "Receipt" };
const PULL_SHEET_OPTION = { value: "PRE_ORDER_FULFILLMENT_PULL_SHEET", label: "Pre-Order Fulfillment Pull Sheet" };

// Print a specific DOM node via the browser — same isolation technique as
// PrintReceiptModal's printNode / PrintLabelModal's printNode.
function printNode(node) {
  if (!node) return;
  const styleId = "order-ahead-print-styles";
  document.getElementById(styleId)?.remove();
  const style = document.createElement("style");
  style.id = styleId;
  style.innerHTML = `
    @media print {
      /* Without an explicit page size, the browser falls back to whatever
         paper/PDF default is configured — often wider or narrower than the
         80mm receipt width below, clipping every right-aligned line at the
         same spot and leaving the unused remainder as blank margin. */
      @page { size: 80mm auto; margin: 3mm; }
      body * { visibility: hidden !important; }
      #order-ahead-print-area, #order-ahead-print-area * { visibility: visible !important; }
      #order-ahead-print-area {
        position: absolute !important;
        left: 0 !important;
        top: 0 !important;
        width: 74mm !important;
      }
    }
  `;
  document.head.appendChild(style);
  window.print();
}

/**
 * Print modal for an order-ahead order — Receipt or Pre-Order Fulfillment
 * Pull Sheet, ported from the old app's PrintModal.jsx UI (radio + copies +
 * template status) same as PrintLabelModal.tsx. Content is the fixed
 * OrderPrintContent layout; print delivery reuses the same hardware/browser
 * fallback path as PrintReceiptModal / PrintLabelModal.
 */
export default function PrintOrderModal({ open, onClose, type, item }) {
  const { shopId } = useShop();
  const contentRef = useRef(null);
  // A New/Confirmed order isn't a completed sale yet — only a pull sheet
  // makes sense there (matches the old app's OrderCard.jsx, which only ever
  // passed preOrderReceiptProps for those two stages, receiptProps for
  // everything past it — never both at once).
  const printTypeOptions = type === "presale" ? [PULL_SHEET_OPTION] : [RECEIPT_OPTION];
  const [printType, setPrintType] = useState(printTypeOptions[0].value);
  const [copies, setCopies] = useState("1");
  const [printing, setPrinting] = useState(false);
  const [printerReady, setPrinterReady] = useState<PrintReadiness | null>(null); // null = unknown, checked once resolved

  useEffect(() => {
    if (open) setPrintType(printTypeOptions[0].value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, type]);

  useEffect(() => {
    setPrinterReady(null);
    if (!open || !shopId) return;
    resolvePrintReadiness(shopId, printType)
      .then(setPrinterReady)
      .catch(() => setPrinterReady({ ready: false, via: null }));
  }, [open, shopId, printType]);

  if (!item) return null;

  const printInBrowser = () => {
    printNode(contentRef.current);
  };

  const handlePrint = async () => {
    const numOfCopies = Math.max(1, parseInt(copies, 10) || 1);
    setPrinting(true);
    try {
      const result = await dispatchPrintJob({
        shopId,
        jobType: printType,
        node: contentRef.current,
        numOfCopies,
      });

      switch (result.status) {
        case "local-success":
        case "remote-success":
          toast.success("Sent to printer");
          onClose?.();
          break;
        case "no-preference":
          toast.info("No printer configured. Using browser print.");
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
    } catch (err: any) {
      toast.error(err?.message || "Failed to print on hardware. Using browser print.");
      printInBrowser();
    } finally {
      setPrinting(false);
    }
  };

  return (
    <>
      {/* One OrderPrintContent per open modal only — every order card on the
          board mounts its own PrintOrderModal, so an unconditional portal
          here would put multiple #order-ahead-print-area elements in the DOM
          at once. The print stylesheet's id selector matches all of them,
          stacking every card's content at the same top:0/left:0. */}
      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <OrderPrintContent
            ref={contentRef}
            type={type}
            item={item}
            variant={printType === "PRE_ORDER_FULFILLMENT_PULL_SHEET" ? "PULL_SHEET" : "RECEIPT"}
            style={{ position: "fixed", left: -9999, top: 0 }}
          />,
          document.body
        )}

      <Dialog open={open} onOpenChange={(v) => !v && onClose?.()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Print Label</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <div className="mb-1.5 text-xs font-medium text-muted-foreground">Select Print Type:</div>
              <div className="flex flex-col gap-2">
                {printTypeOptions.map((t) => (
                  <label key={t.value} className="flex items-center gap-1.5 text-sm">
                    <input
                      type="radio"
                      name="printType"
                      checked={printType === t.value}
                      onChange={() => setPrintType(t.value)}
                    />
                    {t.label}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-1.5 text-xs font-medium text-muted-foreground">Number of Copies:</div>
              <Input
                type="number"
                min={1}
                value={copies}
                onChange={(e) => setCopies(e.target.value)}
                className="w-24"
              />
            </div>

            <div className="text-xs text-muted-foreground">
              Current Template: <strong>{printTypeOptions.find((t) => t.value === printType)?.label}</strong>{" "}
              {printerReady === null ? (
                "…"
              ) : printerReady.ready ? (
                <span className="font-medium text-green-600">
                  ✓ Ready {printerReady.via === "local" ? "(Local Printer)" : "(Remote)"}
                </span>
              ) : (
                <span className="font-medium text-amber-600">No printer configured — will use browser print</span>
              )}
            </div>
          </div>

          <DialogFooter className="border-t-0">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="outline" onClick={printInBrowser}>
              Check Label
            </Button>
            <Button disabled={printing} onClick={handlePrint}>
              {printing ? "Printing…" : `Print ${Math.max(1, parseInt(copies, 10) || 1)} copy`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
