"use client";

import Drawer from "@/components/ui/Drawer";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { OverallActivityLogsPanel } from "@/components/activity-logs/OverallActivityLogsPanel";

const DOMAIN_LABELS: Record<string, string> = {
  CLASSIFICATION: "Classification Activity",
  CATEGORY: "Category Activity",
  BRAND: "Brand Activity",
};

interface ActivityLogDrawerProps {
  open: boolean;
  onClose: () => void;
  domain: "CLASSIFICATION" | "CATEGORY" | "BRAND";
  targetId: string | number | null;
}

export default function ActivityLogDrawer({ open, onClose, domain, targetId }: ActivityLogDrawerProps) {
  return (
    <Drawer open={open} onClose={onClose} side="right" size={520}>
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <span className="text-base font-semibold">{DOMAIN_LABELS[domain] ?? "Activity"}</span>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          {targetId && open && <OverallActivityLogsPanel domain={domain} targetId={String(targetId)} />}
        </div>
      </div>
    </Drawer>
  );
}
