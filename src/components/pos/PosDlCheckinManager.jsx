"use client";

import { toast } from "sonner";
import { FileImage, ScanLine, IdCard } from "lucide-react";
import Drawer from "@/components/ui/Drawer";
import { Button } from "@/components/ui/button";

// Card metadata preserved from the old CHECKIN_TYPES.
const CHECKIN_TYPES = [
  {
    key: "dl-front",
    label: "Driver's License Front",
    description: "Scan front of driving license to identify customer",
    Icon: FileImage,
    cta: "Scan / Upload",
  },
  {
    key: "dl-back",
    label: "Driver's License Back / Barcode",
    description: "Scan barcode on back of driving license",
    Icon: ScanLine,
    cta: "Scan / Upload",
  },
  {
    key: "med-id",
    label: "Med ID",
    description: "Scan medical identification card",
    Icon: IdCard,
    cta: "Scan / Upload",
  },
  {
    key: "scan-dl",
    label: "Scan ID",
    description: "Directly scan driving license barcode",
    Icon: ScanLine,
    cta: "Scan ID",
  },
];

/**
 * "Verify" drawer — DL/Med-ID check-in selection (old pos-dl-checkin-manager.js).
 * The selection UI is ported; each method opens a scanner/OCR/AddCustomer flow
 * that lives in the customer-management sub-tree (Scan, ScanDLBarcode,
 * UploadDrivingLicenseForm, UploadLicenseForm, AddCustomer) — those are pending
 * migration, so selecting a method flags it rather than opening a stub scanner.
 *
 * Props (contract preserved): open, onClose.
 */
export default function PosDlCheckinManager({ open, onClose }) {
  const handleSelect = (type) => {
    onClose?.();
    // ponytail: scanner/OCR sub-tree not yet ported — flag instead of faking.
    toast.info(`"${type.label}" scanner is pending migration.`);
  };

  return (
    <Drawer open={open} onClose={onClose} side="right" size={480}>
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-border px-6 py-3.5">
          <span className="text-[15px] font-semibold">Verify</span>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
        <div className="flex-1 overflow-auto px-6 py-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Select Method
          </p>
          {CHECKIN_TYPES.map(({ key, label, description, Icon, cta }) => (
            <div
              key={key}
              className="mb-3 rounded-2xl border border-border bg-muted/40 p-4"
            >
              <div className="mb-3.5 flex items-center gap-3.5">
                <div className="flex h-13 w-20 shrink-0 items-center justify-center rounded-lg border border-border bg-muted">
                  <Icon className="h-6 w-6 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="mb-0.5 text-[15px] font-semibold">{label}</p>
                  <p className="text-xs text-muted-foreground">{description}</p>
                </div>
              </div>
              <Button
                className="h-12 w-full font-semibold"
                onClick={() => handleSelect({ key, label })}
              >
                {cta}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </Drawer>
  );
}
