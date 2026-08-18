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
import PackageLabel from "@/components/pos/PackageLabel";
import CustomPackageLabelModal from "@/components/pos/CustomPackageLabelModal";
import { fetchSinglePackage } from "@/services/packages/getSingle";
import { fetchSingleProduct } from "@/services/products/getSingle";
import { connectToSocket } from "@/lib/socket";
import { JOB_TYPES } from "@/hooks/usePrintClients";
import { getUserPrintPreference, createPrintJob } from "@/services/printClients/printClients";

const LABEL_TYPES = [
  { value: "EXIT_LABEL", label: "Exit Label" },
  { value: "PACKAGE_LABEL", label: "Package Label" },
];

// Print a specific DOM node via the browser — same isolation technique as
// PrintReceiptModal's printNode.
function printNode(node) {
  if (!node) return;
  const styleId = "pos-label-print-styles";
  document.getElementById(styleId)?.remove();
  const style = document.createElement("style");
  style.id = styleId;
  style.innerHTML = `
    @media print {
      body * { visibility: hidden; }
      #pos-label-print-area, #pos-label-print-area * { visibility: visible; }
      #pos-label-print-area { position: absolute !important; left: 0 !important; top: 0 !important; }
    }
  `;
  document.head.appendChild(style);
  window.print();
}

/**
 * Print Label modal for a single cart line's package — Exit Label / Package
 * Label, ported from the old app's PrintModal.jsx UI (radio + copies +
 * template status). Label content is a fixed layout (see PackageLabel.tsx);
 * the print delivery reuses the same hardware/browser-fallback path as
 * PrintReceiptModal.
 */
export default function PrintLabelModal({ open, onClose, packageId, shopId }) {
  const labelRef = useRef(null);
  const [labelType, setLabelType] = useState("EXIT_LABEL");
  const [copies, setCopies] = useState("1");
  const [loading, setLoading] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [packageData, setPackageData] = useState(null);
  const [productData, setProductData] = useState(null);
  const [printerReady, setPrinterReady] = useState(null); // null = unknown, true/false once checked
  const [customLabelOpen, setCustomLabelOpen] = useState(false);

  useEffect(() => {
    if (!open || !packageId) return;
    setLoading(true);
    setPackageData(null);
    setProductData(null);
    fetchSinglePackage(shopId, { id: packageId })
      .then((res) => {
        const pkg = res?.data?.data?.package;
        setPackageData(pkg || null);
        if (pkg?.productId) {
          return fetchSingleProduct(pkg.productId).then((pRes) =>
            setProductData(pRes?.data?.data?.product || null)
          );
        }
      })
      .catch(() => toast.error("Failed to fetch package details"))
      .finally(() => setLoading(false));
  }, [open, packageId, shopId]);

  const checkLabel = () => {
    if (!shopId) {
      setPrinterReady(false);
      return;
    }
    getUserPrintPreference(shopId, labelType)
      .then((pref) => setPrinterReady(Boolean(pref?.success && pref?.data?.setUpId)))
      .catch(() => setPrinterReady(false));
  };

  useEffect(() => {
    setPrinterReady(null);
    if (open) checkLabel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [labelType, open]);

  const printInBrowser = () => {
    printNode(labelRef.current);
  };

  const handlePrint = async () => {
    const numOfCopies = Math.max(1, parseInt(copies, 10) || 1);
    setPrinting(true);
    try {
      const pref = shopId ? await getUserPrintPreference(shopId, labelType) : null;
      if (!pref?.success || !pref?.data?.setUpId) {
        toast.info("No printer configured. Using browser print.");
        printInBrowser();
        return;
      }

      const socket = connectToSocket({
        url: `${process.env.NEXT_PUBLIC_BASE_URL}/hclient-web-facing`,
        shopId,
      });
      const requestId = Math.random().toString(36).slice(2);
      const html = `<html><body>${labelRef.current?.innerHTML || ""}</body></html>`;

      const ackPromise = new Promise((resolve) => {
        const timeoutId = setTimeout(() => resolve(false), 8000);
        socket?.on("printJobPicked", (data) => {
          if (data?.requestId !== requestId) return;
          clearTimeout(timeoutId);
          resolve(true);
        });
      });

      await createPrintJob({
        shopId,
        jobType: labelType,
        sessionId: pref.data.sessionId,
        numOfCopies,
        setUpId: pref.data.setUpId,
        requestId,
        html,
        isTest: false,
      });

      const acked = await ackPromise;
      socket?.disconnect();

      if (!acked) {
        toast.warning("Print client did not respond. Using browser print.");
        printInBrowser();
        return;
      }
      toast.success("Label sent to printer");
      onClose?.();
    } catch (err: any) {
      toast.error(err?.message || "Failed to print on hardware. Using browser print.");
      printInBrowser();
    } finally {
      setPrinting(false);
    }
  };

  return (
    <>
      {typeof document !== "undefined" &&
        createPortal(
          <div id="pos-label-print-area" ref={labelRef} style={{ position: "fixed", left: -9999, top: 0 }}>
            <PackageLabel packageData={packageData} productData={productData} labelType={labelType} />
          </div>,
          document.body
        )}

      <Dialog open={open} onOpenChange={(v) => !v && onClose?.()}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Print Label</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <div className="mb-1.5 text-xs font-medium text-muted-foreground">Select Print Type:</div>
              <div className="flex gap-4">
                {LABEL_TYPES.map((t) => (
                  <label key={t.value} className="flex items-center gap-1.5 text-sm">
                    <input
                      type="radio"
                      name="labelType"
                      checked={labelType === t.value}
                      onChange={() => setLabelType(t.value)}
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
              Current Template: <strong>{LABEL_TYPES.find((t) => t.value === labelType)?.label}</strong>{" "}
              {printerReady === null ? (
                "…"
              ) : printerReady ? (
                <span className="font-medium text-green-600">✓ Ready</span>
              ) : (
                <span className="font-medium text-amber-600">No printer configured — will use browser print</span>
              )}
            </div>
          </div>

          <DialogFooter className="border-t-0">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            {labelType === "PACKAGE_LABEL" && (
              <Button variant="outline" onClick={() => setCustomLabelOpen(true)}>
                Custom Label
              </Button>
            )}
            <Button variant="outline" onClick={printInBrowser} disabled={loading}>
              Check Label
            </Button>
            <Button disabled={loading || printing} onClick={handlePrint}>
              {printing ? "Printing…" : `Print ${Math.max(1, parseInt(copies, 10) || 1)} copy`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CustomPackageLabelModal
        open={customLabelOpen}
        onClose={() => setCustomLabelOpen(false)}
        packageData={packageData}
        productData={productData}
      />
    </>
  );
}
