"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { JOB_TYPES } from "@/hooks/usePrintClients";
import PrinterDeviceSetup from "./PrinterDeviceSetup";

export default function PrinterSelectionModal({ open, onOpenChange, onSelect, defaultJobType = JOB_TYPES.PACKAGE_LABEL }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="z-60 flex max-h-[85vh] flex-col sm:max-w-200">
        <DialogHeader className="shrink-0">
          <DialogTitle>Select Printer Device</DialogTitle>
        </DialogHeader>

        <PrinterDeviceSetup
          defaultJobType={defaultJobType}
          onSelect={onSelect}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
