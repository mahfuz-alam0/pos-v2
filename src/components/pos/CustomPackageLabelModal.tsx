"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import Barcode from "react-barcode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const UNIT_OPTIONS = [
  { value: "in", label: "Inches (in)" },
  { value: "mm", label: "Millimeters (mm)" },
  { value: "cm", label: "Centimeters (cm)" },
];

const CODE_TYPE_OPTIONS = [
  { value: "barcode", label: "Barcode" },
  { value: "qr", label: "QR Code" },
];

const BARCODE_DIGIT_OPTIONS = [
  { value: "full", label: "Full" },
  { value: "last10", label: "Last 10 digits" },
  { value: "last5", label: "Last 5 digits" },
];

const FONT_OPTIONS = [
  { value: "Arial, Helvetica, sans-serif", label: "Arial" },
  { value: "Helvetica, Arial, sans-serif", label: "Helvetica" },
  { value: "'Times New Roman', Times, serif", label: "Times New Roman" },
  { value: "'Courier New', Courier, monospace", label: "Courier New" },
  { value: "Georgia, serif", label: "Georgia" },
  { value: "Verdana, Geneva, sans-serif", label: "Verdana" },
  { value: "'Trebuchet MS', sans-serif", label: "Trebuchet MS" },
];

function toInches(value, unit) {
  if (unit === "mm") return value / 25.4;
  if (unit === "cm") return value / 2.54;
  return value;
}

const inToPx = (inches) => Math.round(inches * 96);

async function genQrDataUrl(value) {
  try {
    const QRCode = await import("qrcode");
    return await QRCode.toDataURL(String(value), { width: 300, margin: 1, errorCorrectionLevel: "M", type: "image/png" });
  } catch {
    return null;
  }
}

/**
 * Custom Package Label — user-configurable label size/font/code-type,
 * ported from the old app's CustomPackageLabelPrint.jsx. Browser-print only
 * (the old component never routed through the hardware print client either):
 * unlike PrintLabelModal's fixed EXIT_LABEL/PACKAGE_LABEL layout, this lets
 * the user pick exact dimensions and a QR code instead of a barcode, so it
 * prints via a page sized to match rather than the app's usual fixed-width
 * receipt/label stock.
 */
export default function CustomPackageLabelModal({ open, onClose, packageData, productData }) {
  const [width, setWidth] = useState("2");
  const [height, setHeight] = useState("1");
  const [unit, setUnit] = useState("in");
  const [copies, setCopies] = useState("1");
  const [fontFamily, setFontFamily] = useState(FONT_OPTIONS[0].value);
  const [nameFontSizePt, setNameFontSizePt] = useState("");
  const [barcodeDigits, setBarcodeDigits] = useState("full");
  const [codeType, setCodeType] = useState("barcode");
  const [qrDataUrl, setQrDataUrl] = useState(null);
  const labelRef = useRef(null);

  const productName = productData?.name || packageData?.name || "N/A";
  const brandName = productData?.brand?.name || "";
  const fullBarcodeValue = String(packageData?.advertisedId || packageData?.metrcData?.metrcTag || packageData?.id || "000000");
  const barcodeValue =
    barcodeDigits === "last5" ? fullBarcodeValue.slice(-5) : barcodeDigits === "last10" ? fullBarcodeValue.slice(-10) : fullBarcodeValue;

  const widthIn = toInches(parseFloat(width) || 0, unit);
  const heightIn = toInches(parseFloat(height) || 0, unit);
  const previewW = inToPx(widthIn);
  const previewH = inToPx(heightIn);
  const validSize = widthIn > 0 && heightIn > 0;

  useEffect(() => {
    if (!open || codeType !== "qr") return;
    let cancelled = false;
    genQrDataUrl(barcodeValue).then((url) => {
      if (!cancelled) setQrDataUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [open, codeType, barcodeValue]);

  const nameFontPxPreview = useMemo(() => {
    const manual = parseFloat(nameFontSizePt);
    if (manual > 0) return Math.round(manual * (96 / 72));
    return Math.max(5, Math.min(14, Math.round(previewH * 0.16)));
  }, [nameFontSizePt, previewH]);
  const brandFontPxPreview = Math.max(4, Math.min(11, Math.round(previewH * 0.12)));
  const barcodeHeightPxPreview = Math.max(12, Math.round(previewH * 0.52));
  const barcodeBarWidthPreview = Math.max(0.5, Math.min(2, previewW / 120));
  const paddingPreview = Math.max(1, Math.round(previewH * 0.04));

  const LabelContent = ({ scale = 1 }: { scale?: number }) => (
    <div
      style={{
        width: previewW * scale,
        height: previewH * scale,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        boxSizing: "border-box",
        padding: paddingPreview * scale,
        background: "#fff",
        color: "#000",
      }}
    >
      <div
        style={{
          fontSize: nameFontPxPreview * scale,
          fontWeight: "bold",
          fontFamily,
          lineHeight: 1.15,
          textAlign: "center",
          wordBreak: "break-word",
          width: "100%",
          marginBottom: Math.max(1, Math.round(previewH * 0.02)) * scale,
        }}
      >
        {productName}
      </div>
      {brandName && (
        <div
          style={{
            fontSize: brandFontPxPreview * scale,
            fontFamily,
            textAlign: "center",
            width: "100%",
            marginBottom: Math.max(1, Math.round(previewH * 0.02)) * scale,
            color: "#333",
          }}
        >
          {brandName}
        </div>
      )}
      <div style={{ maxWidth: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {codeType === "qr" ? (
          qrDataUrl && (
            <img
              src={qrDataUrl}
              alt=""
              style={{ width: Math.min(barcodeHeightPxPreview * 1.2, previewW - paddingPreview * 2) * scale, height: "auto" }}
            />
          )
        ) : (
          <Barcode
            value={barcodeValue || "0"}
            width={barcodeBarWidthPreview * scale}
            height={barcodeHeightPxPreview * scale}
            fontSize={Math.max(4, Math.min(10, Math.round(previewH * 0.1))) * scale}
            displayValue
            format="CODE128"
            background="#ffffff"
            lineColor="#000000"
          />
        )}
      </div>
    </div>
  );

  const printLabel = () => {
    if (!validSize) {
      toast.error("Please set a valid width and height.");
      return;
    }
    const node = labelRef.current;
    if (!node) return;

    const styleId = "custom-label-print-styles";
    document.getElementById(styleId)?.remove();
    const style = document.createElement("style");
    style.id = styleId;
    style.innerHTML = `
      @page { size: ${widthIn.toFixed(4)}in ${heightIn.toFixed(4)}in; margin: 0; }
      @media print {
        body * { visibility: hidden !important; }
        #custom-label-print-area, #custom-label-print-area * { visibility: visible !important; }
        #custom-label-print-area {
          position: absolute !important;
          left: 0 !important;
          top: 0 !important;
          width: ${widthIn.toFixed(4)}in !important;
          height: ${heightIn.toFixed(4)}in !important;
        }
      }
    `;
    document.head.appendChild(style);
    window.print();
  };

  return (
    <>
      {typeof document !== "undefined" &&
        open &&
        createPortal(
          <div id="custom-label-print-area" ref={labelRef} style={{ position: "fixed", left: -9999, top: 0 }}>
            <LabelContent />
          </div>,
          document.body
        )}

      <Dialog open={open} onOpenChange={(v) => !v && onClose?.()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Custom Package Label</DialogTitle>
          </DialogHeader>

          <div className="max-h-[65vh] space-y-4 overflow-y-auto pr-1">
            <div>
              <div className="mb-1.5 text-xs font-medium text-muted-foreground">Label Dimensions</div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-muted-foreground">W:</span>
                <Input type="number" min={0.1} step={0.1} value={width} onChange={(e) => setWidth(e.target.value)} className="w-24" />
                <span className="text-sm text-muted-foreground">H:</span>
                <Input type="number" min={0.1} step={0.1} value={height} onChange={(e) => setHeight(e.target.value)} className="w-24" />
                <Select items={UNIT_OPTIONS} value={unit} onValueChange={setUnit}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UNIT_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {validSize && (
                <div className="mt-1 text-xs text-muted-foreground">
                  = {widthIn.toFixed(3)}&quot; × {heightIn.toFixed(3)}&quot; ({(widthIn * 25.4).toFixed(1)} × {(heightIn * 25.4).toFixed(1)} mm)
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Copies:</span>
              <Input type="number" min={1} value={copies} onChange={(e) => setCopies(e.target.value)} className="w-20" />
            </div>

            <div>
              <div className="mb-1.5 text-xs font-medium text-muted-foreground">Font Settings</div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-muted-foreground">Family:</span>
                <Select items={FONT_OPTIONS} value={fontFamily} onValueChange={setFontFamily}>
                  <SelectTrigger className="w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FONT_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        <span style={{ fontFamily: o.value }}>{o.label}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-sm text-muted-foreground">Name size (pt):</span>
                <Input
                  type="number"
                  min={4}
                  max={72}
                  placeholder="Auto"
                  value={nameFontSizePt}
                  onChange={(e) => setNameFontSizePt(e.target.value)}
                  className="w-20"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Code type:</span>
              <Select items={CODE_TYPE_OPTIONS} value={codeType} onValueChange={setCodeType}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CODE_TYPE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {codeType === "barcode" && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium">Barcode digits:</span>
                <Select items={BARCODE_DIGIT_OPTIONS} value={barcodeDigits} onValueChange={setBarcodeDigits}>
                  <SelectTrigger className="w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BARCODE_DIGIT_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="font-mono text-xs text-muted-foreground">{barcodeValue}</span>
              </div>
            )}

            <div className="h-px bg-border" />

            <div>
              <div className="mb-2 text-xs font-medium text-muted-foreground">
                Preview <span className="font-normal">(screen representation)</span>
              </div>
              <div className="flex min-h-20 items-center justify-center rounded-lg bg-muted/40 p-4">
                {validSize ? (
                  <div style={{ transform: previewW > 380 ? `scale(${380 / previewW})` : "none", transformOrigin: "center" }}>
                    <div className="ring-1 ring-foreground/10">
                      <LabelContent />
                    </div>
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">Enter dimensions to see preview</span>
                )}
              </div>
            </div>

            <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
              <div>
                <strong className="text-foreground">Product:</strong> {productName}
                {brandName && `, ${brandName}`}
              </div>
              {packageData?.advertisedId && (
                <div className="mt-1">
                  <strong className="text-foreground">Package ID:</strong> {packageData.advertisedId}
                </div>
              )}
              {codeType === "barcode" && (
                <div className="mt-1">
                  <strong className="text-foreground">Barcode:</strong> <span className="font-mono">{barcodeValue}</span>
                  {barcodeDigits !== "full" && <span className="ml-1">(full: {fullBarcodeValue})</span>}
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="border-t-0">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={printLabel} disabled={!validSize}>
              Print {Math.max(1, parseInt(copies, 10) || 1) > 1 ? `${Math.max(1, parseInt(copies, 10) || 1)} copies` : "1 copy"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
