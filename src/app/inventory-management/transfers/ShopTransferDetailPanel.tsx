"use client";

import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Drawer from "@/components/ui/Drawer";
import PurchaseOrderAction from "./PurchaseOrderAction";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="w-2/5 text-sm text-muted-foreground">{label}</span>
      <span className="text-sm">{value}</span>
    </div>
  );
}

export default function ShopTransferDetailPanel({ transfer, onClose }: { transfer: any; onClose: () => void }) {
  const router = useRouter();

  return (
    <Drawer open={!!transfer} onClose={onClose} side="right" size="50vw">
      <div className="flex h-full flex-col gap-4">
        <div className="flex items-center justify-between border-b border-border p-4">
          <h2 className="text-base font-semibold">Transfer Details</h2>
          <div className="flex items-center gap-2">
            {transfer?.isIncoming && (transfer?.fromSupplier || transfer?.toSupplier) && (
              <PurchaseOrderAction transferId={transfer?.id} />
            )}
            <Button size="sm" onClick={() => router.push(`/inventory-management/transfers/details/${transfer?.id}`)}>
              View
            </Button>
            <Button variant="outline" size="icon" onClick={onClose}>
              <X className="size-4" />
            </Button>
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-3 overflow-y-auto rounded-xl border border-border bg-muted/30 p-4 mx-4 mb-4">
          <Row label="Transfer ID" value={transfer?.advertisedId ?? "N/A"} />
          <Row label="Created At" value={transfer?.createdAt ? transfer.createdAt.split("T")[0] : "N/A"} />
          <Row label="Total Price" value={`$${transfer?.totalPrice ?? "N/A"}`} />
          <Row label="Source Location" value={transfer?.fromShop?.name ?? "N/A"} />
          <Row label="Destination Location" value={transfer?.toShop?.name ?? "N/A"} />
          <Row label="Notes" value={transfer?.notes ?? "N/A"} />
          {transfer?.toSupplier?.name && <Row label="Destination Supplier" value={transfer.toSupplier.name} />}
          {transfer?.fromSupplier?.name && <Row label="Source Supplier" value={transfer.fromSupplier.name} />}
          <Row
            label="Transfer Type"
            value={<Badge variant={transfer?.isIncoming ? "default" : "destructive"}>{transfer?.isIncoming ? "Incoming" : "Outgoing"}</Badge>}
          />
          <Row label="Status" value={transfer?.isCompleted ? "Completed" : "In Route"} />
          <Row label="Created By" value={transfer?.creatorInfo?.name ?? "N/A"} />
          <Row label="Last Updated By" value={transfer?.lastUpdaterInfo?.name ?? "N/A"} />
        </div>
      </div>
    </Drawer>
  );
}
