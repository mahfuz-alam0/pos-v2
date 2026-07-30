"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";

import { useShop } from "@/context/shop-context";
import { fetchSingleMetrcTransfer } from "@/services/metrcTransfers/getSingle";
import { fetchMetrcTransferEligibility } from "@/services/metrcTransfers/getEligibility";
import { completeIncomingMetrcTransfer } from "@/services/metrcTransfers/completeIncoming";
import { createPurchaseOrderFromMetrcTransfer } from "@/services/purchaseOrders/createFromMetrcTransfer";
import { fetchSingleProduct } from "@/services/products/getSingle";
import { listUoms } from "@/services/uoms/listUoms";
import { fetchStorageLocations } from "@/services/storageLocations/list";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { DatePicker } from "@/components/ui/date-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

import AssignPackageDrawer from "./AssignPackageDrawer";
import type { PackageAssignment } from "./types";

const PAYMENT_TERMS = ["Due on Receipt", "Net 15", "Net 30", "Net 45", "Net 60", "50% Upfront"];

// Same as old assign-package.js's getEffectiveTotalCost — applies the bulk
// discount tag on top of the untouched, original unitCost for display/margin
// purposes only. unitCost itself is never mutated by the discount.
function effectiveTotalCost(assignment: PackageAssignment) {
  const raw = parseFloat(String(assignment.unitCost)) || 0;
  const pct = assignment.discountPercent || 0;
  return raw * (1 - pct / 100);
}

function StepIndicator({ step }: { step: 0 | 1 }) {
  const steps = ["Assign Products & Pricing", "Review & Complete"];
  return (
    <div className="mx-auto flex w-fit rounded-lg bg-muted p-0.5">
      {steps.map((label, i) => (
        <div
          key={label}
          className={`rounded-[7px] px-4 py-1.5 text-sm font-medium ${
            i === step ? "bg-primary text-primary-foreground" : "text-muted-foreground"
          }`}
        >
          {i + 1}. {label}
        </div>
      ))}
    </div>
  );
}

export default function AssignPackageWizard({ id }: { id: string }) {
  const { shopId } = useShop();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<0 | 1>(0);
  const [packages, setPackages] = useState<any[]>([]);
  const [eligibility, setEligibility] = useState<any>(null);
  const [uomOptions, setUomOptions] = useState<{ id: string; name: string; shortForm?: string }[]>([]);
  const [storageLocations, setStorageLocations] = useState<any[]>([]);

  const [assignments, setAssignments] = useState<Record<string, PackageAssignment>>({});
  const [productNames, setProductNames] = useState<Record<string, string>>({});

  const [discountEnabled, setDiscountEnabled] = useState(false);
  const [discountPercent, setDiscountPercent] = useState<string>("");

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedPkg, setSelectedPkg] = useState<any>(null);

  const [paymentTerms, setPaymentTerms] = useState<string | undefined>(undefined);
  const [expectedDate, setExpectedDate] = useState<Date | undefined>(undefined);

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!shopId || !id) return;
    setLoading(true);
    Promise.all([
      fetchSingleMetrcTransfer(shopId as string, id),
      fetchMetrcTransferEligibility(shopId as string, id),
      listUoms(),
      fetchStorageLocations(shopId as string),
    ])
      .then(([transferRes, eligibilityRes, uomRes, storageRes]: any[]) => {
        setPackages(transferRes?.data?.transfer?.packages ?? []);
        setEligibility(eligibilityRes?.data ?? null);
        setUomOptions(uomRes?.data?.data?.uoms ?? []);
        setStorageLocations(storageRes?.data?.data?.locations ?? []);
      })
      .catch(() => toast.error("Failed to fetch transfer details."))
      .finally(() => setLoading(false));
  }, [shopId, id]);

  const eligiblePackages = useMemo(() => {
    const tags: string[] | undefined = eligibility?.metrcPackageTagsWithPendingImport;
    if (!tags) return packages;
    return packages.filter((pkg) => tags.includes(pkg?.metrcTag));
  }, [packages, eligibility]);

  const assignedTags = Object.keys(assignments);

  const handleOpenAssign = (pkg: any) => {
    setSelectedPkg(pkg);
    setDrawerOpen(true);
  };

  const handleAssignmentSaved = (assignment: PackageAssignment) => {
    setAssignments((prev) => ({ ...prev, [assignment.metrcTag]: assignment }));
    setDrawerOpen(false);
    setSelectedPkg(null);

    // Fetch the product's display name for Step 2's summary grouping.
    fetchSingleProduct(assignment.productId)
      .then((res: any) => {
        const product = res?.data?.data?.product;
        if (product?.name) setProductNames((prev) => ({ ...prev, [String(assignment.productId)]: product.name }));
      })
      .catch(() => {});
  };

  const handleNext = () => {
    if (assignedTags.length === 0) {
      toast.error("Please assign at least one package to proceed.");
      return;
    }

    // Tag every assigned package with the chosen bulk discount (if any).
    // unitCost itself is never mutated — only this tag — so toggling the
    // discount and clicking Next again stays idempotent.
    const nextDiscountPercent = discountEnabled && Number(discountPercent) > 0 ? Number(discountPercent) : 0;
    setAssignments((prev) =>
      Object.fromEntries(
        Object.entries(prev).map(([tag, a]) => [tag, { ...a, discountPercent: nextDiscountPercent }])
      )
    );

    setStep(1);
  };

  const groupedByProduct = useMemo(() => {
    const groups: Record<string, { productId: string; productName: string; packages: PackageAssignment[] }> = {};
    Object.values(assignments).forEach((assignment) => {
      const key = String(assignment.productId);
      if (!groups[key]) {
        groups[key] = { productId: key, productName: productNames[key] || `Product ID: ${key}`, packages: [] };
      }
      groups[key].packages.push(assignment);
    });
    return Object.values(groups);
  }, [assignments, productNames]);

  const handleSubmit = async () => {
    if (!paymentTerms) {
      toast.error("Please select payment terms before completing the transfer");
      return;
    }
    const withoutStorage = Object.values(assignments).find((a) => !a.storageLocationBreakdown?.length);
    if (withoutStorage) {
      toast.error(`Please set a storage location for package ${withoutStorage.metrcTag} in Step 1`);
      return;
    }

    setSubmitting(true);
    try {
      const payloadPackages = Object.values(assignments).map((assignment) => {
        const originalQty = assignment.metrcQuantityNumber ?? assignment.quantity ?? null;
        const baseUnitCost =
          originalQty && originalQty > 0
            ? parseFloat(String(assignment.unitCost)) / originalQty
            : parseFloat(String(assignment.unitCost));

        return {
          unitCost: baseUnitCost,
          discountPercentage: assignment.discountPercent || 0,
          productId: assignment.productId,
          metrcTag: assignment.metrcTag,
          shouldActivate: assignment.shouldActivate,
          externalBatchId: assignment.externalBatchId || null,
          expiryDate: assignment.expiryDate || null,
          storageLocationBreakdown: assignment.storageLocationBreakdown?.length
            ? assignment.storageLocationBreakdown
            : null,
        };
      });

      const productPriceRecommendations = groupedByProduct.map((group) => {
        const first = group.packages[0];
        const unitPrice = first?.recommendedUnitPrice ?? 0;
        return {
          productId: group.productId,
          price: parseFloat(String(unitPrice || 0)),
          pricingTemplateId: null,
          stockThreshold: first?.stockThreshold ? parseInt(String(first.stockThreshold)) : 0,
          preferredProductCategoryId: null,
          projectedQtyConversionRate: first?.enableProjectedQty
            ? first.projectedQtyConversionRate
              ? parseFloat(String(first.projectedQtyConversionRate))
              : null
            : null,
          projectedQtyUomId: first?.enableProjectedQty ? first.projectedQtyUomId || null : null,
          unitWeight: first?.unitWeight ? parseFloat(String(first.unitWeight)) : null,
          unitWeightUoMId: first?.unitWeightUoMId || null,
        };
      });

      const payload = {
        shopId,
        transferId: id,
        packages: payloadPackages,
        productPriceRecommendations,
        storageLocationPreference: null,
      };

      await completeIncomingMetrcTransfer(payload);
      toast.success("Transfer completed successfully");

      // costPerUnit reflects the discounted (effective) cost — the actual
      // amount owed — while payload.packages[].unitCost stays the original,
      // undiscounted cost recorded on the package alongside discountPercentage.
      const lineItemCosts = payloadPackages.map((pkg) => ({
        metrcTag: pkg.metrcTag,
        costPerUnit: pkg.unitCost * (1 - (pkg.discountPercentage || 0) / 100),
      }));

      try {
        await createPurchaseOrderFromMetrcTransfer(id, shopId as string, {
          paymentTerms,
          expectedAt: expectedDate ? expectedDate.toISOString().split("T")[0] : undefined,
          lineItemCosts,
        });
      } catch (poErr: any) {
        toast.error(poErr?.message || "Transfer completed, but failed to create the Purchase Order");
      }

      router.push(`/admin/inventory/transfers/metrc-transfer/${id}`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to complete transfer");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3 p-6">
        <Skeleton className="h-6 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link href="/admin/inventory" />}>Inventory Management</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link href="/admin/inventory/transfers/metrc-transfer" />}>
              METRC Transfers
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link href={`/admin/inventory/transfers/metrc-transfer/${id}`} />}>
              Transfer Details
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Assign Package</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div>
        <h1 className="text-2xl font-bold">Assign Package</h1>
        <p className="text-muted-foreground">Create and assign a new package to this transfer</p>
      </div>

      <StepIndicator step={step} />

      <Card className="p-4">
        {step === 0 ? (
          <div className="space-y-4">
            {eligibility && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-muted/40 p-4">
                <div className="flex items-center gap-2">
                  <Badge variant={eligibility.isEligibleForImporting ? "default" : "destructive"}>
                    {eligibility.isEligibleForImporting ? "Eligible for Import" : "Not Eligible"}
                  </Badge>
                  {eligibility.metrcPackageTagsWithPendingImport && (
                    <Badge variant="outline">{eligibility.metrcPackageTagsWithPendingImport.length} Eligible Tags</Badge>
                  )}
                  {assignedTags.length > 0 && <Badge variant="outline">{assignedTags.length} Assigned</Badge>}
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3 rounded-lg bg-amber-50 p-4 dark:bg-amber-950/30">
              <Switch
                checked={discountEnabled}
                onCheckedChange={(checked) => {
                  setDiscountEnabled(checked);
                  if (!checked) setDiscountPercent("");
                }}
              />
              <span className="text-sm font-medium">Apply Bulk Discount</span>
              {discountEnabled && (
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(e.target.value)}
                  placeholder="e.g. 10"
                  className="w-24"
                />
              )}
              {discountEnabled && Number(discountPercent) > 0 && (
                <span className="text-xs text-muted-foreground">
                  This will discount the unit cost of every assigned package by {discountPercent}% when you continue
                  to Review.
                </span>
              )}
            </div>

            {eligiblePackages.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl bg-muted/30 py-12 text-muted-foreground">
                <p className="text-lg font-medium">No Eligible Packages</p>
                <p>No packages in this transfer are currently eligible for importing.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {eligiblePackages.map((pkg) => {
                  const isAssigned = assignedTags.includes(pkg.metrcTag);
                  const assignment = assignments[pkg.metrcTag];
                  const snapshotData = pkg?.snapshotData ?? {};

                  return (
                    <div
                      key={pkg.metrcId}
                      className={`rounded-lg ring-2 ${isAssigned ? "ring-green-500" : "ring-foreground/10"}`}
                    >
                      <div className="flex flex-wrap items-center gap-6 rounded-t-lg bg-muted/40 px-4 py-2">
                        <span className="text-sm">
                          <span className="text-muted-foreground">Metrc Tag: </span>
                          <span className="font-mono font-semibold">{pkg?.metrcTag ?? "-"}</span>
                        </span>
                        <span className="text-sm">
                          <span className="text-muted-foreground">Category: </span>
                          {snapshotData?.ProductCategoryName ?? "-"}
                        </span>
                        {isAssigned && <Badge className="bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400">Assigned</Badge>}
                      </div>

                      <div className="flex flex-wrap items-center gap-6 px-4 py-2">
                        <span className="min-w-0 flex-1 truncate text-sm">
                          <span className="text-muted-foreground">Product: </span>
                          {snapshotData?.ProductName ?? "-"}
                        </span>
                        <span className="text-sm whitespace-nowrap">
                          <span className="text-muted-foreground">Quantity: </span>
                          {snapshotData?.ShippedQuantity ?? "-"} {snapshotData?.ShippedUnitOfMeasureName ?? ""}
                        </span>
                      </div>

                      {isAssigned && assignment && (
                        <div className="mx-4 mb-3 flex flex-wrap gap-5 rounded bg-muted/30 p-3 text-xs">
                          <div>
                            <div className="text-muted-foreground">Total Wholesale Cost</div>
                            <div className="font-semibold">${effectiveTotalCost(assignment).toFixed(2)}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Unit Cost</div>
                            <div className="font-semibold">
                              $
                              {assignment.quantity
                                ? (effectiveTotalCost(assignment) / assignment.quantity).toFixed(2)
                                : effectiveTotalCost(assignment).toFixed(2)}
                            </div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Unit Price</div>
                            <div className="font-semibold">
                              {assignment.recommendedUnitPrice != null ? `$${Number(assignment.recommendedUnitPrice).toFixed(2)}` : "-"}
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="flex justify-end gap-2 rounded-b-lg bg-muted/20 px-4 py-2">
                        <Button variant="outline" size="sm" onClick={() => handleOpenAssign(pkg)}>
                          {isAssigned ? "Edit Import" : "Import"}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <Card className="border-primary/20 p-4">
              <p className="mb-3 text-sm text-muted-foreground">
                Completing this transfer will automatically create a Purchase Order using these payment terms.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="mb-2">
                    Payment Terms <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    items={PAYMENT_TERMS.map((t) => ({ value: t, label: t }))}
                    value={paymentTerms}
                    onValueChange={(v) => setPaymentTerms(v as string)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select payment terms..." />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_TERMS.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="mb-2">Expected Date</Label>
                  <DatePicker value={expectedDate} onChange={setExpectedDate} placeholder="Select expected date" />
                </div>
              </div>
            </Card>

            {(() => {
              const discounted = Object.values(assignments).find((a) => (a.discountPercent || 0) > 0);
              if (!discounted) return null;
              return (
                <div className="rounded-lg bg-green-50 p-3 text-sm dark:bg-green-950/30">
                  <span className="font-medium">{discounted.discountPercent}% Bulk Discount Applied</span> — totals and
                  margins below reflect the discounted cost.
                </div>
              );
            })()}

            {groupedByProduct.length === 0 ? (
              <div className="rounded-lg border-2 border-dashed py-8 text-center text-muted-foreground">
                No products assigned. Go back to Step 1 to assign products to packages.
              </div>
            ) : (
              groupedByProduct.map((group) => (
                <Card key={group.productId} className="p-4">
                  <div className="mb-3">
                    <span className="text-lg font-semibold">{group.productName}</span>
                    <div className="text-sm text-muted-foreground">{group.packages.length} package(s) assigned</div>
                  </div>

                  <div className="space-y-3">
                    {group.packages.map((assignment) => {
                      const originalQty = assignment.metrcQuantityNumber ?? assignment.quantity ?? 0;
                      const originalCost = parseFloat(String(assignment.unitCost)) || 0;
                      const effCost = effectiveTotalCost(assignment);
                      const unitCost = originalQty > 0 ? effCost / originalQty : effCost;

                      return (
                        <div key={assignment.metrcTag} className="rounded-lg bg-muted/30 p-3">
                          <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
                            <div>
                              <div className="text-xs font-medium text-muted-foreground">METRC Tag</div>
                              <div className="font-mono text-xs">{assignment.metrcTag}</div>
                            </div>
                            <div>
                              <div className="text-xs font-medium text-muted-foreground">Quantity</div>
                              <div>{assignment.metrcQuantityValue ?? originalQty}</div>
                            </div>
                            <div>
                              <div className="text-xs font-medium text-muted-foreground">Storage Location</div>
                              <div>
                                {assignment.storageLocationBreakdown?.length
                                  ? assignment.storageLocationBreakdown.map((entry) => (
                                      <div key={entry.storageLocationId}>
                                        {storageLocations.find((l) => l.id === entry.storageLocationId)?.name ?? "-"}:{" "}
                                        {entry.quantity}
                                      </div>
                                    ))
                                  : <span className="text-orange-500">Not set</span>}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs font-medium text-muted-foreground">Total Wholesale Cost</div>
                              <div>
                                {(assignment.discountPercent || 0) > 0 ? (
                                  <>
                                    <span className="mr-1 text-muted-foreground line-through">
                                      ${originalCost.toFixed(2)}
                                    </span>
                                    <span className="font-semibold text-green-700 dark:text-green-400">
                                      ${effCost.toFixed(2)}
                                    </span>
                                  </>
                                ) : (
                                  `$${effCost.toFixed(2)}`
                                )}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs font-medium text-muted-foreground">Unit Cost</div>
                              <div>${unitCost.toFixed(2)}</div>
                            </div>
                            <div>
                              <div className="text-xs font-medium text-muted-foreground">Unit Price</div>
                              <div>
                                {assignment.recommendedUnitPrice != null
                                  ? `$${Number(assignment.recommendedUnitPrice).toFixed(2)}`
                                  : "-"}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs font-medium text-muted-foreground">Expiry Date</div>
                              <div>{assignment.expiryDate ?? "-"}</div>
                            </div>
                            <div>
                              <div className="text-xs font-medium text-muted-foreground">External Batch ID</div>
                              <div>{assignment.externalBatchId ?? "-"}</div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              ))
            )}
          </div>
        )}
      </Card>

      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => {
            if (step === 0) router.back();
            else setStep(0);
          }}
        >
          {step === 0 ? "Back to Transfer" : "Previous"}
        </Button>

        {step === 0 ? (
          <Button onClick={handleNext}>Next</Button>
        ) : (
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Finalizing..." : "Finalize Transfer"}
          </Button>
        )}
      </div>

      {selectedPkg && (
        <AssignPackageDrawer
          open={drawerOpen}
          onClose={() => {
            setDrawerOpen(false);
            setSelectedPkg(null);
          }}
          pkg={selectedPkg}
          existingAssignment={assignments[selectedPkg.metrcTag]}
          uomOptions={uomOptions}
          onSaved={handleAssignmentSaved}
        />
      )}
    </div>
  );
}
