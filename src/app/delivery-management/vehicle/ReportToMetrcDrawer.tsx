"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Link2, X } from "lucide-react";

import { useShop } from "@/context/shop-context";
import { reportVehicleToMetrc } from "@/services/vehicles/reportToMetrc";

import Drawer from "@/components/ui/Drawer";
import { Button } from "@/components/ui/button";

interface ReportToMetrcDrawerProps {
  open: boolean;
  vehicleId: string | number | null;
  description?: string;
  skipLabel?: string;
  onClose: () => void;
  onReported: () => void;
}

export default function ReportToMetrcDrawer({
  open,
  vehicleId,
  description = "Report this vehicle to METRC for compliance tracking.",
  skipLabel = "Skip",
  onClose,
  onReported,
}: ReportToMetrcDrawerProps) {
  const { shopId } = useShop();
  const [reporting, setReporting] = useState(false);

  const handleReport = async () => {
    if (!vehicleId || !shopId) return;
    setReporting(true);
    try {
      await reportVehicleToMetrc({ shopId, vehicleId });
      toast.success("Vehicle reported to METRC successfully");
      onReported();
    } catch (err: any) {
      toast.error(err?.message || "Failed to report to METRC");
    } finally {
      setReporting(false);
    }
  };

  return (
    <Drawer open={open} onClose={reporting ? undefined : onClose} side="right" size={420}>
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-3 px-5 py-4 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)]">
          <div className="min-w-0 flex-1 text-base font-semibold leading-tight">Report Vehicle to METRC</div>
          <Button variant="outline" size="icon-sm" onClick={onClose} disabled={reporting}>
            <X className="size-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950">
            <div className="flex items-start gap-3">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300">
                <Link2 className="size-4" />
              </div>
              <div>
                <p className="mb-1 font-semibold">Report to METRC</p>
                <p className="text-sm text-muted-foreground">{description}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 shadow-[inset_0_1px_0_rgba(0,0,0,0.06)]">
          <Button variant="outline" onClick={onClose} disabled={reporting}>
            {skipLabel}
          </Button>
          <Button onClick={handleReport} disabled={reporting}>
            {reporting ? "Reporting..." : "Report to METRC"}
          </Button>
        </div>
      </div>
    </Drawer>
  );
}
