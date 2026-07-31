"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

import { getDrawerActiveSummary, getDrawerClosedSessionSummary } from "@/services/registers/getDrawerSummary";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

function money(v: number | undefined) {
  return `$${(v ?? 0).toFixed(2)}`;
}

export default function DrawerDetailsPanel({ drawer, onClose }: { drawer: any; onClose: () => void }) {
  const [activeSummary, setActiveSummary] = useState<any>(null);
  const [closedSummary, setClosedSummary] = useState<any>(null);

  useEffect(() => {
    if (!drawer?.id) return;
    getDrawerActiveSummary(drawer.id).then((res) => setActiveSummary(res?.data?.data ?? null));
    getDrawerClosedSessionSummary(drawer.id).then((res) => setClosedSummary(res?.data?.data ?? null));
  }, [drawer?.id]);

  const rows = [
    { label: "Name", value: drawer?.name ?? "-" },
    { label: "Last Opened By", value: drawer?.lastOpenedBy?.name ?? "-" },
    { label: "Last Closed By", value: drawer?.lastClosedBy?.name ?? "-" },
  ];

  return (
    <div className="flex flex-col gap-3 rounded-xl ring-1 ring-foreground/10">
      <div className="flex items-center justify-between gap-3 px-4 py-3 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)]">
        <div className="text-sm font-semibold">Drawer Details</div>
        <div className="flex items-center gap-2">
          <Badge variant={drawer?.isOpen ? "default" : "destructive"}>{drawer?.isOpen ? "Open" : "Closed"}</Badge>
          <Button variant="outline" size="icon-sm" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-2 px-4 pb-2 text-sm">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between border-b border-foreground/5 pb-2">
            <span className="w-2/5 text-muted-foreground">{row.label}</span>
            <span className="w-3/5 text-right font-medium">{row.value}</span>
          </div>
        ))}
      </div>

      {drawer?.isOpen && activeSummary && (
        <div className="flex flex-col gap-2 px-4 pb-4 text-sm">
          <div className="text-xs font-semibold text-muted-foreground uppercase">Drawer Active Summary</div>
          {[
            ["Cash Amount Started With", activeSummary.cashAmountStartedWith],
            ["Virtual Amount Started With", activeSummary.virtualAmountStartedWith],
            ["Total Cash In", activeSummary.totalCashCredit],
            ["Total Cash Out", activeSummary.totalCashDebit],
            ["Total Virtual In", activeSummary.totalVirtualCredit],
            ["Total Virtual Out", activeSummary.totalVirtualDebit],
          ].map(([label, value]) => (
            <div key={label as string} className="flex items-center justify-between">
              <span className="text-muted-foreground">{label}:</span>
              <span className="font-medium">{money(value as number)}</span>
            </div>
          ))}
        </div>
      )}

      {!drawer?.isOpen && closedSummary && (
        <div className="flex flex-col gap-2 px-4 pb-4 text-sm">
          <div className="text-xs font-semibold text-muted-foreground uppercase">Drawer Closed Session Summary</div>
          {[
            ["Closing Cash Balance", closedSummary.closingCashBalance],
            ["Closing Virtual Balance", closedSummary.closingVirtualBalance],
          ].map(([label, value]) => (
            <div key={label as string} className="flex items-center justify-between">
              <span className="text-muted-foreground">{label}:</span>
              <span className="font-medium">{money(value as number)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
