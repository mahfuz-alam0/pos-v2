"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { X } from "lucide-react";

import { useShop } from "@/context/shop-context";
import { fetchSingleMetrcTransfer } from "@/services/metrcTransfers/getSingle";

import Drawer from "@/components/ui/Drawer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import PurchaseOrderAction from "@/app/inventory-management/transfers/PurchaseOrderAction";
import TransferManifest, { printManifest } from "./TransferManifest";

function KeyValueItem({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="flex w-full flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 px-2 py-1.5 text-sm">
      <p className="mb-0 shrink-0 font-medium text-foreground/70">{label}</p>
      <p className="mb-0 min-w-0 flex-1 text-right wrap-break-word">{value ?? "-"}</p>
    </div>
  );
}

// METRC reports potency as a bare number plus a separate UoM name field.
// Render them together, or "-" when either half is missing.
function withUom(value: any, uomName: any) {
  return value != null && uomName ? `${value} ${uomName}` : "-";
}

function transferTypeLabel(transfer: any) {
  if (transfer?.isAccepted) return "Accepted";
  if (transfer?.isPending) return "Pending";
  if (transfer?.isVoided) return "Voided";
  return transfer?.isIncoming ? "Incoming" : "Outgoing";
}

export default function MetrcTransferDetailPanel({ id, onClose }: { id: string | null; onClose: () => void }) {
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
    // 560px rather than PackageDetailsPanel's 50vw — this panel is narrow
    // key/value rows, which look sparse stretched across half an ultrawide.
    <Drawer open={!!id} onClose={onClose} side="right" size={560}>
      <div className="flex h-full flex-col gap-4">
        <div className="flex items-start justify-between gap-3 p-5 pb-0">
          <div className="min-w-0">
            {loading ? (
              <Skeleton className="h-5 w-44" />
            ) : (
              <>
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <h2 className="text-base font-bold">Transfer #{transferData?.Id ?? "-"}</h2>
                  {transfer && <Badge>{transferTypeLabel(transfer)}</Badge>}
                </div>
                <p className="text-xs text-muted-foreground">{transferData?.ShipperFacilityName ?? ""}</p>
              </>
            )}
          </div>
          <Button variant="outline" size="icon" onClick={onClose} className="shrink-0">
            <X className="size-4" />
          </Button>
        </div>

        {!loading && transfer && (
          <div className="flex flex-wrap items-center justify-end gap-2 px-5">
            {transfer?.isIncoming && transfer?.isResolvedOnPOS && <PurchaseOrderAction transferId={id} />}
            <Button
              className="h-9! rounded! px-3.5! text-[14px]! font-normal!"
              onClick={() => router.push(`/metrc/transfers/${id}`)}
            >
              Details
            </Button>
            <Button
              variant="outline"
              className="h-9! rounded! px-3.5! text-[14px]! font-normal!"
              onClick={printManifest}
            >
              Print
            </Button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-5 pb-5">
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
              <div className="rounded-lg bg-muted/40 p-3">
                <p className="mb-2 font-semibold">Transfer Details</p>
                {/* Created At / Received At appear twice by design: the first pair is the
                    POS record's own timestamps, the second pair is METRC's — they differ. */}
                <div>
                  <KeyValueItem label="Created At" value={transfer?.createdAt?.split("T")[0]} />
                  <KeyValueItem label="Received At" value={transfer?.updatedAt?.split("T")[0]} />
                  <KeyValueItem label="Transfer ID:" value={transferData?.Id} />
                  <KeyValueItem label="Transfer Type" value={transferTypeLabel(transfer)} />
                  <KeyValueItem label="Supplier Name" value={transferData?.ShipperFacilityName} />
                  <KeyValueItem
                    label="License Number"
                    value={
                      transferData?.ShipperFacilityLicenseNumber ? (
                        <span className="text-primary underline">{transferData.ShipperFacilityLicenseNumber}</span>
                      ) : undefined
                    }
                  />
                  <KeyValueItem label="Created At" value={transferData?.CreatedDateTime?.split("T")[0]} />
                  <KeyValueItem label="Supplier" value={transferData?.ShipperFacilityName} />
                  <KeyValueItem label="Total Packages" value={transferData?.PackageCount} />
                  <KeyValueItem label="Received At" value={transferData?.ReceivedDateTime?.split("T")[0]} />
                  <KeyValueItem label="Transport Name" value={transferData?.TransporterFacilityName} />
                </div>
              </div>

              <p className="mt-4 mb-2 font-semibold">Packages</p>
              <div className="space-y-3">
                {packages.map((pkg: any, index: number) => (
                  <div key={pkg?.metrcId ?? index} className="rounded-lg ring-1 ring-foreground/10 p-3">
                    {/* Package ID stays visible collapsed or expanded, and links to the
                        package once it's been imported (that route needs a platform id). */}
                    <div className="flex w-full flex-wrap items-baseline justify-between gap-x-3 px-2 py-1.5 text-sm">
                      <p className="mb-0 shrink-0 font-medium text-foreground/70">Package ID</p>
                      {pkg?.packageId ? (
                        <Link
                          href={`/inventory-management/packages/edit/${pkg.packageId}`}
                          target="_blank"
                          className="min-w-0 flex-1 text-right font-medium text-primary underline wrap-break-word"
                        >
                          {pkg?.metrcId ?? "-"}
                        </Link>
                      ) : (
                        <p className="mb-0 min-w-0 flex-1 text-right font-medium wrap-break-word">
                          {pkg?.metrcId ?? "-"}
                        </p>
                      )}
                    </div>

                    {showDetails[index] && (
                      <div className="mt-2">
                        <div className="mb-2 h-px bg-border" />
                        <KeyValueItem label="Created At" value={transferData?.CreatedDateTime?.split("T")[0]} />
                        <KeyValueItem label="Metrc" value={pkg?.metrcId} />
                        <KeyValueItem label="Metrc Name:" value={pkg?.snapshotData?.ProductName} />
                        <KeyValueItem label="Metrc Strain Name:" value={pkg?.snapshotData?.ItemStrainName} />
                        <KeyValueItem

                          label="Metrc Qty:"
                          value={`${pkg?.snapshotData?.ReceivedQuantity ?? "-"} ${pkg?.snapshotData?.ReceivedUnitOfMeasureName ?? ""}`}
                        />
                        <KeyValueItem
                          label="Metrc Source Category Name:"
                          value={pkg?.snapshotData?.ProductCategoryName}
                        />
                        {/* Source-of-truth notes, matching old's wiring: a transfer package
                            snapshot (ITransferPackage) carries no location and no test date, so
                            Location reuses ProductCategoryName and Date Tested is the transfer's
                            LastModified — the same value for every package in the transfer. */}
                        <KeyValueItem label="Metrc Location:" value={pkg?.snapshotData?.ProductCategoryName} />

                        <div className="my-2 h-px bg-border" />

                        <div>
                          <KeyValueItem label="Date Tested:" value={transferData?.LastModified?.split("T")[0]} />
                          <KeyValueItem label="CBD Percent:" value={pkg?.snapshotData?.ItemUnitCbdPercent} />
                          <KeyValueItem
                            label="CBD Content:"
                            value={withUom(
                              pkg?.snapshotData?.ItemUnitCbdContent,
                              pkg?.snapshotData?.ItemUnitCbdContentUnitOfMeasureName
                            )}
                          />
                          <KeyValueItem

                            label="CBD Dose:"
                            value={withUom(
                              pkg?.snapshotData?.ItemUnitCbdContentDose,
                              pkg?.snapshotData?.ItemUnitCbdContentDoseUnitOfMeasureName
                            )}
                          />
                          <KeyValueItem label="THC Percent:" value={pkg?.snapshotData?.ItemUnitThcPercent} />
                          <KeyValueItem

                            label="THC Content:"
                            value={withUom(
                              pkg?.snapshotData?.ItemUnitThcContent,
                              pkg?.snapshotData?.ItemUnitThcContentUnitOfMeasureName
                            )}
                          />
                          <KeyValueItem
                            label="THC Dose:"
                            value={withUom(
                              pkg?.snapshotData?.ItemUnitThcContentDose,
                              pkg?.snapshotData?.ItemUnitThcContentDoseUnitOfMeasureName
                            )}
                          />
                        </div>
                      </div>
                    )}

                    <div className="mt-2 flex items-center justify-between gap-2">
                      <button
                        className="text-sm text-primary underline"
                        onClick={() => setShowDetails((prev) => ({ ...prev, [index]: !prev[index] }))}
                      >
                        {showDetails[index] ? "Hide Details" : "Show Details"}
                      </button>
                      {/* Old also had Print here; printing infra isn't ported yet. Edit needs a
                          platform package id, so it only appears once the package is imported. */}
                      {pkg?.packageId && (
                        <Link href={`/inventory-management/packages/edit/${pkg.packageId}`} target="_blank">
                          <Button variant="outline" size="sm">
                            Edit
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Off-screen; printManifest() isolates it via a print-only stylesheet. */}
      <TransferManifest transfer={transfer} />
    </Drawer>
  );
}
