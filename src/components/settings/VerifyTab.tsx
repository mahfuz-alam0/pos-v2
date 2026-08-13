"use client";

import { useState } from "react";
import { FileImage, ScanLine, IdCard, ScanBarcode } from "lucide-react";
import { Button } from "@/components/ui/button";
import PhotoCheckinDialog from "./verify/PhotoCheckinDialog";
import ScanIdDialog from "./verify/ScanIdDialog";

const CHECKIN_TYPES = [
  {
    key: "dl-front",
    label: "Driver's License Front",
    description: "Scan front of driver's license to identify customer",
    icon: FileImage,
  },
  {
    key: "dl-back",
    label: "Driver's License Back / Barcode",
    description: "Scan barcode on back of driver's license",
    icon: ScanBarcode,
  },
  {
    key: "med-id",
    label: "Med ID",
    description: "Scan medical identification card",
    icon: IdCard,
  },
  {
    key: "scan-dl",
    label: "Scan ID",
    description: "Directly scan driver's license barcode",
    icon: ScanLine,
  },
];

function CheckinCard({ type, onSelect }) {
  const Icon = type.icon;
  return (
    <div className="mb-3 rounded-[14px] bg-surface-alt p-4 ring-1 ring-foreground/10">
      <div className="mb-3.5 flex items-center gap-3.5">
        <div className="flex h-13 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted ring-1 ring-foreground/10">
          <Icon className="size-6 text-muted-foreground/60" />
        </div>
        <div className="min-w-0 flex-1">
          <span className="mb-0.5 block text-[15px] font-semibold text-text">{type.label}</span>
          <span className="text-xs text-muted-foreground">{type.description}</span>
        </div>
      </div>
      <Button className="h-12 w-full font-semibold" onClick={() => onSelect(type)}>
        {type.key === "scan-dl" ? "Scan ID" : "Scan / Upload"}
      </Button>
    </div>
  );
}

/**
 * POS DL Check-in Manager (Verify tab)
 *
 * Customer check-in entry points:
 * - Extracts details from DL (barcode or OCR)
 * - Checks if customer exists
 * - Add to Queue / Place Order (existing) or Add Customer (new)
 */
export default function VerifyTab() {
  const [photoMode, setPhotoMode] = useState(null); // "dl-front" | "dl-back" | "med-id" | null
  const [scanIdOpen, setScanIdOpen] = useState(false);

  function handleSelect(type) {
    if (type.key === "scan-dl") setScanIdOpen(true);
    else setPhotoMode(type.key);
  }

  return (
    <div className="py-1">
      <span className="mb-3 block text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        Select Method
      </span>
      {CHECKIN_TYPES.map((t) => (
        <CheckinCard key={t.key} type={t} onSelect={handleSelect} />
      ))}

      <PhotoCheckinDialog
        open={Boolean(photoMode)}
        onOpenChange={(v) => !v && setPhotoMode(null)}
        mode={photoMode || "dl-front"}
      />
      <ScanIdDialog open={scanIdOpen} onOpenChange={setScanIdOpen} />
    </div>
  );
}
