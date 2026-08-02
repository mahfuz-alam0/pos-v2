"use client";

import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-2/5 text-sm text-muted-foreground">{label}</span>
      <span className="text-sm">{value}</span>
    </div>
  );
}

export default function WithinLocationDetailPanel({ transfer, onClose }: { transfer: any; onClose: () => void }) {
  return (
    <div className="flex w-1/3 flex-col gap-4 rounded-xl ring-1 ring-foreground/10">
      <div className="flex items-center justify-between p-4 pb-0">
        <h2 className="text-base font-semibold">Transfer Details</h2>
        <Button variant="outline" size="icon" onClick={onClose}>
          <X className="size-4" />
        </Button>
      </div>

      <div className="flex flex-col gap-3 rounded-lg p-4 shadow-[0_0_5px_5px_rgba(0,0,0,0.03)] mx-4">
        <Row label="Created At" value={transfer?.createdAt ? transfer.createdAt.split("T")[0] : "N/A"} />
        <Row label="Initiated By" value={transfer?.initiatedBy?.name ?? "N/A"} />
        <Row label="Source Location" value={transfer?.sourceStorageLocation?.name ?? "N/A"} />
        <Row label="Destination Location" value={transfer?.destinationStorageLocation?.name ?? "N/A"} />
        <Row label="Notes" value={transfer?.notes ?? "N/A"} />
        <Row
          label="Status"
          value={<Badge variant={transfer?.isIncoming ? "default" : "destructive"}>{transfer?.isIncoming ? "Incoming" : "Outgoing"}</Badge>}
        />
      </div>

      <div className="flex flex-col gap-3 px-4 pb-4">
        <h3 className="text-sm font-semibold">Packages</h3>
        {transfer?.associatedItems?.length > 0 ? (
          transfer.associatedItems.map((item: any, i: number) => (
            <div key={i} className="flex flex-col gap-2 rounded-lg p-4 shadow-[0_0_5px_5px_rgba(0,0,0,0.03)]">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Package ID: {item.advertisedPackageId}</span>
              </div>
              <Row label="Date Created" value={transfer.createdAt ? transfer.createdAt.split("T")[0] : "N/A"} />
              <Row label="Quantity Shifted" value={item.quantityShifted ?? "N/A"} />
            </div>
          ))
        ) : (
          <div className="rounded-lg p-4 text-sm text-muted-foreground shadow-[0_0_5px_5px_rgba(0,0,0,0.03)]">
            No Data Found
          </div>
        )}
      </div>
    </div>
  );
}
