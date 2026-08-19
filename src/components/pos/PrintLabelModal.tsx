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
import PrintPreviewModal from "@/components/pos/PrintPreviewModal";
import { fetchSinglePackage } from "@/services/packages/getSingle";
import { fetchSingleProduct } from "@/services/products/getSingle";
import { isTauriDesktop } from "@/lib/update-check";
import {
  dispatchPrintJob,
  resolvePrintReadiness,
  type PrintReadiness,
} from "@/services/printClients/dispatchPrintJob";
import { printPdfInBrowser, renderNodeToImage } from "@/services/printClients/renderNodeToPdf";

const LABEL_TYPES = [
  { value: "EXIT_LABEL", label: "Exit Label" },
  { value: "PACKAGE_LABEL", label: "Package Label" },
];

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
  const [printerReady, setPrinterReady] = useState<PrintReadiness | null>(null); // null = unknown, checked once resolved
  const [customLabelOpen, setCustomLabelOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !packageId) return;
    setLoading(true);
    setPackageData(null);
    setProductData(null);

    // A stalled request (e.g. a cross-origin hang on the web build, which
    // doesn't go through the same-origin /proxy rewrite the desktop app
    // uses — see api.ts) would otherwise leave `loading` true forever,
    // permanently disabling "Check Label"/Print with no way to fall back
    // to a normal browser print. Bound it so the modal always recovers.
    let settled = false;
    const timeoutId = setTimeout(() => {
      if (settled) return;
      settled = true;
      setLoading(false);
      toast.error("Timed out fetching package details");
    }, 10000);

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
      .finally(() => {
        clearTimeout(timeoutId);
        if (settled) return;
        settled = true;
        setLoading(false);
      });
  }, [open, packageId, shopId]);

  const checkLabel = () => {
    resolvePrintReadiness(shopId, labelType)
      .then(setPrinterReady)
      .catch(() => setPrinterReady({ ready: false, via: null }));
  };

  useEffect(() => {
    setPrinterReady(null);
    if (open) checkLabel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [labelType, open]);

  const printInBrowser = () => {
    if (!labelRef.current) return;
    printPdfInBrowser(labelRef.current).catch(() => toast.error("Failed to generate label PDF"));
  };

  // "Check Label" — on the web this opens the browser's own print-preview
  // popup (printInBrowser). The Tauri desktop webview has no such popup, so
  // there it opens an in-app preview modal showing the same rendered
  // label instead.
  const handleCheckLabel = async () => {
    if (!labelRef.current) return;
    if (!isTauriDesktop()) {
      printInBrowser();
      return;
    }
    setPreviewImage(null);
    setPreviewOpen(true);
    try {
      const { dataUrl } = await renderNodeToImage(labelRef.current);
      setPreviewImage(dataUrl);
    } catch {
      toast.error("Failed to generate label preview");
      setPreviewOpen(false);
    }
  };

  const handlePrint = async () => {
    const numOfCopies = Math.max(1, parseInt(copies, 10) || 1);
    setPrinting(true);
    try {
      const result = await dispatchPrintJob({
        shopId,
        jobType: labelType,
        node: labelRef.current,
        numOfCopies,
      });

      switch (result.status) {
        case "local-success":
        case "remote-success":
          toast.success("Label sent to printer");
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
            {labelType === "PACKAGE_LABEL" && (
              <Button variant="outline" onClick={() => setCustomLabelOpen(true)}>
                Custom Label
              </Button>
            )}
            <Button variant="outline" onClick={handleCheckLabel} disabled={loading}>
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

      <PrintPreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        imageUrl={previewImage}
        title="Label Preview"
      />
    </>
  );
}
