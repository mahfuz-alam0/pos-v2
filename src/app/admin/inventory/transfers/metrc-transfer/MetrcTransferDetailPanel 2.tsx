"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

import { useShop } from "@/context/shop-context";
import { fetchSingleMetrcTransfer } from "@/services/metrcTransfers/getSingle";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import PurchaseOrderAction from "../PurchaseOrderAction";

function KeyValueItem({ label, value, alt }: { label: string; value?: React.ReactNode; alt?: boolean }) {
  return (
    <div
      className={`flex w-full flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 rounded-md px-2 py-1.5 ${
        alt ? "bg-stone-100 dark:bg-stone-800" : ""
      }`}
    >
      <p className="mb-0 shrink-0 font-medium text-muted-foreground">{label}</p>
      <p className="mb-0 min-w-0 flex-1 text-right wrap-break-word">{value ?? "-"}</p>
    </div>
  );
}

function transferTypeLabel(transfer: any) {
  if (transfer?.isAccepted) return "Accepted";
  if (transfer?.isPending) return "Pending";
  if (transfer?.isVoided) return "Voided";
  return transfer?.isIncoming ? "Incoming" : "Outgoing";
}

export default function MetrcTransferDetailPanel({ id, onClose }: { id: string; onClose: () => void }) {
  const { shopId } = useShop();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [transfer, setTransfer] = useState<any>(null);
  const [showDetails, setShowDetails] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (!shopId || !id) return;
    setLoading(true);
    fetchSingleMetrcTransfer(shopId as string, id)
      .then((res: any) => setTransfer(res?.data?.transfer ?? null))
      .finally(() => setLoading(false));
  }, [shopId, id]);

  const transferData = transfer?.defSnapshot;
  const packages = transfer?.packages ?? [];

  return (
    <div className="flex w-full shrink-0 flex-col gap-4 self-start rounded-xl ring-1 ring-foreground/10 sm:w-105 lg:w-120 max-h-[calc(100vh-2rem)] overflow-y-auto">
      <div className="sticky top-0 z-10 flex items-center justify-between gap-2 rounded-t-xl bg-card px-4 pt-4 pb-2 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)]">
        <Button variant="outline" size="icon" onClick={onClose}>
          <X className="size-4" />
        </Button>

        {!loading && (
          <div className="flex flex-wrap items-center justify-end gap-2">
            {transfer?.isIncoming && transfer?.isResolvedOnPOS && <PurchaseOrderAction transferId={id} />}
            <Button onClick={() => router.push(`/admin/inventory/transfers/metrc-transfer/${id}`)}>Details</Button>
          </div>
        )}
      </div>

      <div className="px-4 pb-4">
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-5 w-full" />
            ))}
          </div>
        ) : !transfer ? (
          <p className="text-sm text-muted-foreground">Transfer not found.</p>
        ) : (
          <>
            <div className="mb-3 flex items-center justify-between">
              <span className="text-lg font-medium">Transfer #{transferData?.Id}</span>
              <Badge>{transferTypeLabel(transfer)}</Badge>
            </div>

            <div className="rounded-lg bg-muted/40 p-3">
              <p className="mb-2 font-semibold">Transfer Details</p>
              <div>
                <KeyValueItem alt label="Created At" value={transfer?.createdAt?.split("T")[0]} />
                <KeyValueItem label="Received At" value={transfer?.updatedAt?.split("T")[0]} />
                <KeyValueItem alt label="Transfer ID" value={transferData?.Id} />
                <KeyValueItem label="Transfer Type" value={transferTypeLabel(transfer)} />
                <KeyValueItem alt label="Supplier Name" value={transferData?.ShipperFacilityName} />
                <KeyValueItem label="License Number" value={transferData?.ShipperFacilityLicenseNumber} />
                <KeyValueItem alt label="Total Packages" value={transferData?.PackageCount} />
                <KeyValueItem label="Transport Name" value={transferData?.TransporterFacilityName} />
              </div>
            </div>

            <p className="mt-4 mb-2 font-semibold">Packages</p>
            <div className="space-y-3">
              {packages.map((pkg: any, index: number) => (
                <div key={pkg?.metrcId ?? index} className="rounded-lg ring-1 ring-foreground/10 p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{pkg?.metrcId ?? "-"}</span>
                  </div>

                  {showDetails[index] && (
                    <div className="mt-2 pt-2 shadow-[inset_0_1px_0_rgba(0,0,0,0.06)]">
                      <KeyValueItem alt label="Metrc Name" value={pkg?.snapshotData?.ProductName} />
                      <KeyValueItem label="Metrc Strain Name" value={pkg?.snapshotData?.ItemStrainName} />
                      <KeyValueItem
                        alt
                        label="Metrc Qty"
                        value={`${pkg?.snapshotData?.ReceivedQuantity ?? "-"} ${pkg?.snapshotData?.ReceivedUnitOfMeasureName ?? ""}`}
                      />
                      <KeyValueItem label="Category" value={pkg?.snapshotData?.ProductCategoryName} />
                      <KeyValueItem alt label="CBD Percent" value={pkg?.snapshotData?.ItemUnitCbdPercent} />
                      <KeyValueItem label="THC Percent" value={pkg?.snapshotData?.ItemUnitThcPercent} />
                    </div>
                  )}

                  <div className="mt-2 flex items-center justify-between">
                    <button
                      className="text-sm text-primary hover:underline"
                      onClick={() => setShowDetails((prev) => ({ ...prev, [index]: !prev[index] }))}
                    >
                      {showDetails[index] ? "Hide Details" : "Show Details"}
                    </button>
                    {/* Print omitted — printing infra not ported (out of scope). */}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
