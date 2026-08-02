"use client";

import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
    <div className="flex w-1/3 flex-col gap-4 rounded-xl ring-1 ring-foreground/10">
      <div className="flex items-center justify-between p-4 pb-0">
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

      <div className="mx-4 flex flex-col gap-3 rounded-lg p-4 shadow-[0_0_5px_5px_rgba(0,0,0,0.03)]">
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
  );
}
