"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { useShop } from "@/context/shop-context";
import { fetchMetrcCredentials } from "@/services/metrcConfig/getCredentials";
import { fetchSingleMetrcTransfer } from "@/services/metrcTransfers/getSingle";
import { fetchMetrcTransferEligibility } from "@/services/metrcTransfers/getEligibility";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

function DetailCard({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-muted/40 p-4">
      <div className="mb-1 text-xs tracking-wide text-muted-foreground uppercase">{label}</div>
      <div className="truncate text-sm font-medium" title={typeof value === "string" ? value : undefined}>
        {value ?? "-"}
      </div>
    </div>
  );
}

// Mirrors old's renderStatus(): Voided > Completed (isResolvedOnPOS) >
// Importing (isImportInProgress) > Accepted > Pending > Unknown.
function renderStatus(transfer: any): "Voided" | "Completed" | "Importing" | "Accepted" | "Pending" | "Unknown" {
  if (transfer?.isVoided || transfer?.defSnapshot?.IsVoided) return "Voided";
  if (transfer?.isResolvedOnPOS) return "Completed";
  if (transfer?.isImportInProgress) return "Importing";
  if (transfer?.isAccepted) return "Accepted";
  if (transfer?.isPending) return "Pending";
  return "Unknown";
}

const STATUS_BADGE_CLASS: Record<string, string> = {
  Completed: "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400",
  Accepted: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400",
  Importing: "bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-400",
  Voided: "bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400",
  Pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950/50 dark:text-yellow-400",
  Unknown: "bg-muted text-muted-foreground",
};

export default function MetrcTransferDetailPage({ id }: { id: string }) {
  const { shopId } = useShop();
  const router = useRouter();

  const [checkingCredentials, setCheckingCredentials] = useState(true);
  const [credentialsValid, setCredentialsValid] = useState(false);

  const [loading, setLoading] = useState(true);
  const [transfer, setTransfer] = useState<any>(null);
  const [eligibility, setEligibility] = useState<any>(null);

  useEffect(() => {
    if (!shopId) return;
    (async () => {
      setCheckingCredentials(true);
      try {
        const res: any = await fetchMetrcCredentials(shopId as string);
        const credentials = res?.data?.data?.credentials;
        setCredentialsValid(Boolean(res?.data?.success && credentials?.enabled));
      } catch {
        setCredentialsValid(false);
      } finally {
        setCheckingCredentials(false);
      }
    })();
  }, [shopId]);

  useEffect(() => {
    if (!shopId || !id) return;
    setLoading(true);
    Promise.all([
      fetchSingleMetrcTransfer(shopId as string, id),
      fetchMetrcTransferEligibility(shopId as string, id),
    ])
      .then(([transferRes, eligibilityRes]: any[]) => {
        setTransfer(transferRes?.data?.transfer ?? null);
        setEligibility(eligibilityRes?.data ?? null);
      })
      .finally(() => setLoading(false));
  }, [shopId, id]);

  if (checkingCredentials || loading) {
    return (
      <div className="space-y-3 p-6">
        <Skeleton className="h-6 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  // Matches old behavior — render nothing if Metrc credentials aren't valid.
  if (!credentialsValid) return null;

  const status = renderStatus(transfer);
  const packages = transfer?.packages ?? [];
  const eligibleTags: string[] | undefined = eligibility?.metrcPackageTagsWithPendingImport;
  const hasEligiblePackages = eligibleTags === undefined || eligibleTags.length > 0;
  const importDisabled = status === "Completed" || !hasEligiblePackages;

  return (
    <div className="flex flex-col gap-4 p-6 pb-24">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link href="/metrc/transfers" />}>METRC Transfers</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Details</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="rounded-xl bg-muted/30 p-6">
        <div className="mb-6 flex flex-wrap items-center gap-6">
          <div>
            <div className="text-xs tracking-wide text-muted-foreground uppercase">Transfer ID</div>
            <div className="text-lg font-bold">{transfer?.defSnapshot?.Id ?? "-"}</div>
          </div>
          <div>
            <div className="text-xs tracking-wide text-muted-foreground uppercase">Status</div>
            <Badge className={STATUS_BADGE_CLASS[status]}>{status}</Badge>
          </div>
          <div>
            <div className="text-xs tracking-wide text-muted-foreground uppercase">Type</div>
            <Badge variant={transfer?.isIncoming ? "default" : "secondary"}>
              {transfer?.isIncoming ? "Incoming" : "Outgoing"}
            </Badge>
          </div>
          <div>
            <div className="text-xs tracking-wide text-muted-foreground uppercase">Total Packages</div>
            <div className="text-lg font-bold">{packages.length || "-"}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <DetailCard label="Created At" value={transfer?.createdAt?.split("T")[0]} />
          <DetailCard label="Received At" value={transfer?.updatedAt?.split("T")[0]} />
          <DetailCard label="Metrc Created" value={transfer?.defSnapshot?.CreatedDateTime?.split("T")[0]} />
          <DetailCard label="Metrc Received" value={transfer?.defSnapshot?.ReceivedDateTime?.split("T")[0]} />
          <DetailCard label="Supplier Name" value={transfer?.defSnapshot?.ShipperFacilityName} />
          <DetailCard label="License Number" value={transfer?.defSnapshot?.ShipperFacilityLicenseNumber} />
          <DetailCard label="Transport Name" value={transfer?.defSnapshot?.TransporterFacilityName} />
        </div>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Packages</h2>
        </div>

        {packages.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl bg-muted/30 py-12 text-muted-foreground">
            <p className="text-lg font-medium">No Packages Found</p>
            <p>This transfer doesn&apos;t contain any packages.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {packages.map((pkg: any) => (
              <div key={pkg.metrcId} className="rounded-lg ring-1 ring-foreground/10">
                <div className="flex flex-wrap items-center gap-6 rounded-t-lg bg-muted/40 px-4 py-2">
                  <span className="text-sm">
                    <span className="text-muted-foreground">Metrc Tag: </span>
                    <span className="font-mono font-semibold">{pkg?.metrcTag ?? "-"}</span>
                  </span>
                  <span className="text-sm">
                    <span className="text-muted-foreground">Package ID: </span>
                    {pkg?.snapshotData?.PackageId ?? "-"}
                  </span>
                  <span className="text-sm">
                    <span className="text-muted-foreground">Category: </span>
                    {pkg?.snapshotData?.ProductCategoryName ?? "-"}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-6 px-4 py-2">
                  <span className="min-w-0 flex-1 truncate text-sm">
                    <span className="text-muted-foreground">Product: </span>
                    {pkg?.snapshotData?.ProductName ?? "-"}
                  </span>
                  <span className="text-sm whitespace-nowrap">
                    <span className="text-muted-foreground">Quantity: </span>
                    {pkg?.snapshotData?.ShippedQuantity ?? "-"} {pkg?.snapshotData?.ShippedUnitOfMeasureName ?? ""}
                  </span>
                  <span className="text-sm whitespace-nowrap">
                    <span className="text-muted-foreground">Unit Weight: </span>
                    {pkg?.snapshotData?.ItemUnitWeight ?? "-"} {pkg?.snapshotData?.ItemUnitWeightUnitOfMeasureName ?? ""}
                  </span>
                </div>
                <div className="flex justify-end gap-2 rounded-b-lg bg-muted/20 px-4 py-2">
                  {/* Per-package Edit routes to the existing package-edit page (avoids
                      re-porting EditPackages as its own drawer/component — out of scope).
                      That route only accepts a platform package id, which a transfer
                      package only has once it's been imported — hide the link until then
                      rather than linking to an id that doesn't resolve. */}
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
        )}
      </div>

      {packages.length > 0 && (
        <div className="fixed bottom-4 left-0 z-40 flex w-full justify-center md:left-(--sidebar-width,0px)">
          <div className="rounded-2xl bg-card p-4 shadow-xl ring-1 ring-foreground/10">
            <Button
              size="lg"
              disabled={importDisabled}
              onClick={() => router.push(`/metrc/transfers/${id}/assign-package`)}
            >
              {status === "Completed"
                ? "Transfer Completed"
                : !hasEligiblePackages
                  ? "No packages found to import"
                  : "Start Importing Packages"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
