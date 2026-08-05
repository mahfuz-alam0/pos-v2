"use client";

import Drawer from "@/components/ui/Drawer";
import { Button } from "@/components/ui/button";
import { OverallActivityLogsPanel } from "@/components/activity-logs/OverallActivityLogsPanel";

export interface PackageActivityDrawerProps {
  open: boolean;
  packageId: string;
  onClose: () => void;
}

export default function PackageActivityDrawer({ open, packageId, onClose }: PackageActivityDrawerProps) {
  return (
    <Drawer open={open} onClose={onClose} side="right" size={720}>
      <div className="flex h-full flex-col gap-4 overflow-y-auto p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Package Activity</h2>
          <Button variant="outline" size="icon" onClick={onClose}>
            <span className="sr-only">Close</span>
            &times;
          </Button>
        </div>

        {open && <OverallActivityLogsPanel domain="PACKAGE" targetId={packageId} />}
      </div>
    </Drawer>
  );
}
