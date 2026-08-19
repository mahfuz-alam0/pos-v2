"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2, Sparkles, X } from "lucide-react";

import { useShop } from "@/context/shop-context";
import { fetchRecommendedProduct } from "@/services/packages/getRecommendedProduct";
import { fetchProductsList } from "@/services/products/list";
import { fetchSingleProduct } from "@/services/products/getSingle";
import { fetchStorageLocations } from "@/services/storageLocations/list";
import { fetchSinglePackage } from "@/services/packages/getSingle";
import { fetchSingleInventoryByProductId } from "@/services/inventories/getSingleByProductId";
import { fetchPricingTemplates, fetchSinglePricingTemplate } from "@/services/pricingTemplates";

import Drawer from "@/components/ui/Drawer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { ApiSelect } from "@/components/ui/api-select";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";

import AddEditProductDrawer from "@/app/catalog/products/AddEditProductDrawer";

import type { PackageAssignment } from "./types";

interface AssignPackageDrawerProps {
  open: boolean;
  onClose: () => void;
  pkg: any; // raw transfer package record (metrcTag, snapshotData, ...)
  existingAssignment?: PackageAssignment;
  uomOptions: { id: string; name: string; shortForm?: string }[];
  onSaved: (assignment: PackageAssignment) => void;
}

function parseNum(value: any): number | null {
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function YesNo({ value }: { value?: boolean }) {
  return (
    <span
      className={`rounded px-1.5 py-0.5 font-medium ${
        value
          ? "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400"
          : "bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400"
      }`}
    >
      {value ? "Yes" : "No"}
    </span>
  );
}

export default function AssignPackageDrawer({
  open,
  onClose,
  pkg,
  existingAssignment,
  uomOptions,
  onSaved,
}: AssignPackageDrawerProps) {
  const { shopId } = useShop();

  const [loadingRecommendation, setLoadingRecommendation] = useState(false);
  const [recommendedProduct, setRecommendedProduct] = useState<any>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | number | null>(
    existingAssignment?.productId ?? null
  );

  // Total Cost (Wholesale) is the field the user actually types — unitCost
  // in the payload is always this divided by quantity downstream, never a
  // per-unit value entered directly here. Matches old ImportPackage.jsx.
  const [totalCost, setTotalCost] = useState(existingAssignment?.unitCost ? String(existingAssignment.unitCost) : "");
  const [recommendedUnitPrice, setRecommendedUnitPrice] = useState(
    existingAssignment?.recommendedUnitPrice != null ? String(existingAssignment.recommendedUnitPrice) : ""
  );
  const [stockThreshold, setStockThreshold] = useState(
    existingAssignment?.stockThreshold != null ? String(existingAssignment.stockThreshold) : ""
  );
  const [unitWeight, setUnitWeight] = useState(
    existingAssignment?.unitWeight != null ? String(existingAssignment.unitWeight) : ""
  );
  const [unitWeightUoMId, setUnitWeightUoMId] = useState<string | null>(existingAssignment?.unitWeightUoMId ?? null);
  const [expiryDate, setExpiryDate] = useState<Date | undefined>(
    existingAssignment?.expiryDate ? new Date(existingAssignment.expiryDate) : undefined
  );
  const [externalBatchId, setExternalBatchId] = useState(existingAssignment?.externalBatchId ?? "");
  const [shouldActivate, setShouldActivate] = useState(existingAssignment?.shouldActivate ?? true);

  const [enableProjectedQty, setEnableProjectedQty] = useState(existingAssignment?.enableProjectedQty ?? false);
  const [projectedQtyConversionRate, setProjectedQtyConversionRate] = useState(
    existingAssignment?.projectedQtyConversionRate != null ? String(existingAssignment.projectedQtyConversionRate) : ""
  );
  const [projectedQtyUomId, setProjectedQtyUomId] = useState<string | null>(
    existingAssignment?.projectedQtyUomId ?? null
  );

  // Existing inventory record for the selected product — the source of the
  // current retail price, the sellable UoM that scopes pricing templates, and
  // any conversion already configured on the product.
  const [inventory, setInventory] = useState<any>(null);
  const [pricingTemplates, setPricingTemplates] = useState<any[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [useTemplate, setUseTemplate] = useState(Boolean(existingAssignment?.pricingTemplateId));
  const [pricingTemplateId, setPricingTemplateId] = useState<string | null>(
    existingAssignment?.pricingTemplateId ?? null
  );

  const [storageLocations, setStorageLocations] = useState<any[]>([]);
  const [storageLocationQuantities, setStorageLocationQuantities] = useState<Record<string, number>>(() => {
    const breakdown = existingAssignment?.storageLocationBreakdown;
    if (!Array.isArray(breakdown)) return {};
    return breakdown.reduce((acc, entry) => ({ ...acc, [entry.storageLocationId]: entry.quantity }), {});
  });

  // The transfer package snapshot has no location. Metrc Storage Location lives
  // on the *platform* package's metrc snapshot, so it needs its own lookup by
  // tag — same source old read via GetSinglePackage.
  const [metrcSnapshot, setMetrcSnapshot] = useState<any>(null);

  // Full product record for the selected id — powers the summary row's brand /
  // category badges and the Edit Product drawer.
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [editProductOpen, setEditProductOpen] = useState(false);

  const [unitCostField, setUnitCostField] = useState("");
  const [lastEditedCost, setLastEditedCost] = useState<"total" | "unit">("total");
  const [isEcomEnabled, setIsEcomEnabled] = useState(existingAssignment?.isEcomEnabled ?? true);

  const [submitting, setSubmitting] = useState(false);

  const snapshotData = pkg?.snapshotData ?? {};
  const rawQty = snapshotData?.ReceivedQuantity ?? snapshotData?.ShippedQuantity ?? null;
  const quantity = rawQty != null && !isNaN(Number(rawQty)) ? Number(rawQty) : 0;
  const packageUomShortForm = snapshotData?.ShippedUnitOfMeasureName || snapshotData?.ReceivedUnitOfMeasureName || "";

  useEffect(() => {
    if (!shopId) return;
    fetchStorageLocations(shopId as string)
      .then((res: any) => setStorageLocations(res?.data?.data?.locations ?? []))
      .catch(() => setStorageLocations([]));
  }, [shopId]);

  useEffect(() => {
    if (!open || !shopId || !pkg?.metrcTag) return;
    let cancelled = false;
    fetchSinglePackage(shopId as string, { metrcTag: pkg.metrcTag })
      .then((res: any) => {
        if (cancelled) return;
        setMetrcSnapshot(res?.data?.data?.package?.metrcData?.snapShotData?.metrcSnapshotData ?? null);
      })
      .catch(() => {
        if (!cancelled) setMetrcSnapshot(null);
      });
    return () => {
      cancelled = true;
    };
  }, [open, shopId, pkg?.metrcTag]);

  useEffect(() => {
    if (!open || !pkg) return;
    if (existingAssignment) {
      setRecommendedProduct(null);
      return;
    }
    setLoadingRecommendation(true);
    fetchRecommendedProduct({ id: pkg?.id, metrcTag: pkg?.metrcTag, shopId })
      .then((res: any) => {
        const product = res?.data?.data?.product ?? null;
        setRecommendedProduct(product);
        if (product?.id) setSelectedProductId(product.id);
      })
      .catch(() => setRecommendedProduct(null))
      .finally(() => setLoadingRecommendation(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, pkg]);

  // Whenever a product is picked, pull its inventory record and the pricing
  // templates scoped to that product's sellable UoM. Mirrors old's
  // handlePricingAssignment, which did the same two lookups before opening its
  // separate per-product pricing drawer.
  useEffect(() => {
    if (!shopId || !selectedProductId) {
      setInventory(null);
      setPricingTemplates([]);
      setSelectedProduct(null);
      return;
    }

    let cancelled = false;

    fetchSingleProduct(selectedProductId)
      .then((res: any) => setSelectedProduct(res?.data?.data?.product ?? null))
      .catch(() => setSelectedProduct(null));

    (async () => {
      let inventoryData: any = null;
      try {
        const res: any = await fetchSingleInventoryByProductId(selectedProductId, shopId);
        inventoryData = res?.data?.data?.inventory ?? null;
      } catch {
        inventoryData = null;
      }
      if (cancelled) return;
      setInventory(inventoryData);

      // Prefill the price with the product's live retail price so the user sees
      // (and can edit) what's already set rather than starting from blank.
      const currentPrice = inventoryData?.pricingInfo?.unitPrice;
      if (currentPrice != null) {
        setRecommendedUnitPrice((prev) => (prev === "" ? String(currentPrice) : prev));
      }

      // If the product already has a transfer conversion configured, carry it in.
      if (inventoryData?.projectQtyConversionRate && inventoryData?.projectQtyUomId && !existingAssignment) {
        setEnableProjectedQty(true);
        setProjectedQtyConversionRate(String(inventoryData.projectQtyConversionRate));
        setProjectedQtyUomId(inventoryData.projectQtyUomId);
      }

      const sellableUoMId = inventoryData?.sellableUoMId;
      if (!sellableUoMId) {
        setPricingTemplates([]);
        return;
      }

      setTemplatesLoading(true);
      try {
        const res: any = await fetchPricingTemplates(shopId, sellableUoMId);
        if (!cancelled) setPricingTemplates(res?.data?.data?.templates ?? []);
      } catch {
        if (!cancelled) setPricingTemplates([]);
      } finally {
        if (!cancelled) setTemplatesLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopId, selectedProductId]);

  // Applying a template fills price and low-stock only where the user hasn't
  // already typed something — never clobbers manual input (matches old).
  const handleTemplateSelect = async (templateId: string | null) => {
    setPricingTemplateId(templateId);
    if (!templateId) return;
    try {
      const res: any = await fetchSinglePricingTemplate(templateId);
      const pricingInfo = res?.data?.data?.template?.pricingInfo;
      if (!pricingInfo) return;
      if (pricingInfo.unitPrice != null) {
        setRecommendedUnitPrice((prev) => (prev === "" ? String(pricingInfo.unitPrice) : prev));
      }
      if (pricingInfo.stockThreshold != null) {
        setStockThreshold((prev) => (prev === "" ? String(pricingInfo.stockThreshold) : prev));
      }
    } catch {
      toast.error("Failed to load pricing template details");
    }
  };

  // Default the full quantity into the only storage location, or into
  // whichever is marked as the default transfer destination when there are
  // several — mirrors old's pre-fill behavior, still fully editable.
  useEffect(() => {
    if (Object.values(storageLocationQuantities).some((q) => q)) return;
    if (!quantity) return;
    if (storageLocations.length === 1) {
      setStorageLocationQuantities({ [storageLocations[0].id]: quantity });
    } else if (storageLocations.length > 1) {
      const def = storageLocations.find((l) => l.openForAcceptingTransfers);
      if (def) setStorageLocationQuantities({ [def.id]: quantity });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageLocations, quantity]);

  const totalAllocated = useMemo(
    () => Object.values(storageLocationQuantities).reduce((sum, q) => sum + (Number(q) || 0), 0),
    [storageLocationQuantities]
  );

  const unitCostPreview = useMemo(() => {
    const total = parseNum(totalCost);
    if (!total || !quantity) return null;
    return total / quantity;
  }, [totalCost, quantity]);

  // Total Cost and Unit Cost are two views of the same number. Whichever the
  // user last typed in is authoritative; the other is derived from it via the
  // package quantity. Mirrors old ImportPackage.jsx's lastEditedCostField.
  const handleTotalCostChange = (value: string) => {
    setLastEditedCost("total");
    setTotalCost(value);
  };

  const handleUnitCostChange = (value: string) => {
    setLastEditedCost("unit");
    setUnitCostField(value);
    const unit = parseNum(value);
    if (quantity && unit) setTotalCost(String(unit * quantity));
  };

  const unitCostDisplay =
    lastEditedCost === "unit" ? unitCostField : unitCostPreview !== null ? unitCostPreview.toFixed(2) : "";

  // Margin against the per-unit cost, same formula as old's step-0 card:
  // (price - unitCost) / price. Undiscounted here — the bulk discount is only
  // applied at the Step 1 -> Step 2 transition.
  const marginPreview = useMemo(() => {
    const price = parseNum(recommendedUnitPrice);
    if (!price || price <= 0 || unitCostPreview == null) return null;
    return ((price - unitCostPreview) / price) * 100;
  }, [recommendedUnitPrice, unitCostPreview]);

  const fetchProductPage = async (page: number, search: string) => {
    const res: any = await fetchProductsList({ page, limit: 20, search: search || undefined });
    return {
      items: (res?.data ?? []).map((p: any) => ({ id: p.id, name: p.name })),
      totalPages: res?.paginationData?.totalPages ?? 1,
    };
  };

  const handleSave = () => {
    const parsedTotalCost = parseNum(totalCost);
    if (!parsedTotalCost || parsedTotalCost <= 0) {
      toast.error("Total Cost (Wholesale) is required and must be greater than 0");
      return;
    }
    if (!selectedProductId) {
      toast.error("Please select a product");
      return;
    }
    const parsedUnitWeight = parseNum(unitWeight);
    if (!parsedUnitWeight || parsedUnitWeight <= 0) {
      toast.error("Unit Weight is required and must be greater than 0");
      return;
    }
    if (quantity && totalAllocated !== quantity) {
      toast.error(`Allocated quantity (${totalAllocated}) must match total package quantity (${quantity})`);
      return;
    }

    setSubmitting(true);
    const assignment: PackageAssignment = {
      packageId: pkg?.id,
      metrcTag: pkg?.metrcTag,
      productId: selectedProductId,
      unitCost: parsedTotalCost,
      quantity,
      metrcQuantityValue: snapshotData?.ShippedQuantity
        ? `${snapshotData.ShippedQuantity} ${packageUomShortForm}`
        : undefined,
      metrcQuantityNumber: quantity,
      shouldActivate,
      recommendedUnitPrice: parseNum(recommendedUnitPrice),
      stockThreshold: parseNum(stockThreshold),
      unitWeight: parsedUnitWeight,
      unitWeightUoMId: unitWeightUoMId || null,
      expiryDate: expiryDate ? expiryDate.toISOString().split("T")[0] : null,
      externalBatchId: externalBatchId || null,
      enableProjectedQty,
      projectedQtyConversionRate: enableProjectedQty ? parseNum(projectedQtyConversionRate) : null,
      projectedQtyUomId: enableProjectedQty ? projectedQtyUomId : null,
      storageLocationBreakdown: Object.entries(storageLocationQuantities)
        .filter(([, qty]) => Number(qty) > 0)
        .map(([storageLocationId, qty]) => ({ storageLocationId, quantity: Number(qty) })),
      discountPercent: existingAssignment?.discountPercent ?? 0,
      pricingTemplateId: useTemplate ? pricingTemplateId : null,
      isEcomEnabled,
      inventoryUnitPrice: parseNum(inventory?.pricingInfo?.unitPrice),
      sellableUoMShortForm: inventory?.sellableUoMShortForm ?? null,
    };

    onSaved(assignment);
    toast.success("Product assignment saved successfully");
    setSubmitting(false);
  };

  return (
    // 76vw matches EditPackageForm's drawer — this form is multi-column
    // (cost row, bottom row), so it needs the width to lay out properly.
    <Drawer open={open} onClose={submitting ? undefined : onClose} side="right" size="76vw">
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between px-5 py-4 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)]">
          <div className="text-lg font-semibold leading-tight">Import Package</div>
          <Button variant="outline" size="icon" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>

        {/* One step taller than the h-8 defaults on Input/SelectTrigger. The
            select needs `!` — its own height is behind a data-[size] variant,
            which outranks a plain utility class. */}
        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4 [&_[data-slot=input]]:h-9 [&_[data-slot=select-trigger]]:h-9!">
          {/* Capped width — stretched across the full drawer the labels and values
              end up separated by a lane of empty space. */}
          <div className="max-w-3xl rounded-lg bg-green-50 p-4 dark:bg-green-950/30">
            <div className="text-sm font-medium tracking-wide text-muted-foreground uppercase">Metrc Tag</div>
            <div className="mb-3 font-mono text-lg font-bold wrap-break-word">{pkg?.metrcTag ?? "-"}</div>

            <dl className="space-y-1 text-base">
              {[
                ["Name:", snapshotData?.ProductName],
                ["Category:", snapshotData?.ProductCategoryName],
                ["Strain:", snapshotData?.ItemStrainName],
                ["Metrc Qty:", `${snapshotData?.ShippedQuantity ?? "-"} ${packageUomShortForm}`.trim()],
                // Same fallback chain old used, off the platform package's metrc
                // snapshot rather than the transfer package's.
                ["Metrc Storage Location:", metrcSnapshot?.LocationName ?? metrcSnapshot?.ReceivedFromFacilityName],
              ].map(([label, value]) => (
                <div key={label as string} className="grid grid-cols-[180px_1fr] items-baseline gap-x-4">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="mb-0 min-w-0 font-medium wrap-break-word">{value || "-"}</dd>
                </div>
              ))}
            </dl>
          </div>

          {loadingRecommendation && (
            <div className="flex items-center gap-2 text-base text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Looking for a recommended product...
            </div>
          )}

          {!loadingRecommendation && recommendedProduct && (
            <Card className="ring-1 ring-primary/30">
              <CardContent className="flex items-center gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Sparkles className="size-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-base font-medium">{recommendedProduct.name}</div>
                  <div className="truncate text-sm text-muted-foreground">Recommended product</div>
                </div>
              </CardContent>
            </Card>
          )}

          <div>
            <Label className="mb-2 font-semibold">Select Product from Catalog</Label>
            <ApiSelect
              placeholder="Search and select a product..."
              value={selectedProductId}
              onChange={(value) => setSelectedProductId(value)}
              fetchPage={fetchProductPage}
              triggerClassName="w-full"
            />

            {selectedProduct && (
              <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg bg-muted/40 px-3 py-2">
                <span className="min-w-0 flex-1 truncate text-base font-semibold">{selectedProduct.name}</span>
                {selectedProduct.brand?.name && (
                  <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400">
                    {selectedProduct.brand.name}
                  </Badge>
                )}
                {selectedProduct.category?.name && (
                  <Badge className="bg-pink-100 text-pink-700 dark:bg-pink-950/50 dark:text-pink-400">
                    {selectedProduct.category.name}
                  </Badge>
                )}
                <Button variant="outline" size="sm" onClick={() => setEditProductOpen(true)}>
                  Edit Product
                </Button>
              </div>
            )}
          </div>

          {/* Current pricing and storage allocation sit side by side — both are
              read-while-you-fill context for the fields below. */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {inventory ? (
              <div className="rounded-lg p-4 ring-1 ring-foreground/10">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold">Current Pricing Overview</span>
                  {inventory?.id && (
                    <Link
                      href={`/inventory-management/inventory-and-pricing/edit/${inventory.id}`}
                      target="_blank"
                    >
                      <Button size="sm">Edit Pricing →</Button>
                    </Link>
                  )}
                </div>

                <div className="flex items-center justify-between py-2 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)]">
                  <span className="text-base text-muted-foreground">Unit Price:</span>
                  <span className="font-semibold">
                    ${Number(inventory?.pricingInfo?.unitPrice ?? 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)]">
                  <span className="text-base text-muted-foreground">UoM:</span>
                  <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400">
                    {inventory?.sellableUoMShortForm ?? "-"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-base text-muted-foreground">Tiered Pricing:</span>
                  <Badge
                    className={
                      inventory?.pricingInfo?.isTieredPricingApplicable
                        ? "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400"
                        : "bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400"
                    }
                  >
                    {inventory?.pricingInfo?.isTieredPricingApplicable ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
              </div>
            ) : null}

            {/* With no product picked there's no pricing card, so storage takes
                the whole row rather than sitting beside an empty column. */}
            <div className={`rounded-lg bg-muted/40 p-3 ${inventory ? "" : "lg:col-span-2"}`}>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-base font-medium">Storage Locations</span>
                {quantity > 0 && (
                  <span
                    className={`text-sm font-semibold ${
                      totalAllocated === quantity
                        ? "text-green-700 dark:text-green-400"
                        : "text-orange-600 dark:text-orange-400"
                    }`}
                  >
                    {totalAllocated} / {quantity} {packageUomShortForm}
                  </span>
                )}
              </div>
              <div className="max-h-64 space-y-2 overflow-y-auto">
                {storageLocations.map((location) => {
                  const allocated = Number(storageLocationQuantities[location.id]) > 0;
                  return (
                    <div
                      key={location.id}
                      className={`rounded-lg p-3 ring-1 ${
                        allocated ? "bg-blue-50 ring-primary/40 dark:bg-blue-950/30" : "bg-background ring-foreground/10"
                      }`}
                    >
                      <div className="font-medium">{location.name}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                        <span className="text-muted-foreground">
                          Default Destination: <YesNo value={location.openForAcceptingTransfers} />
                        </span>
                        <span className="text-muted-foreground">
                          Physical Store: <YesNo value={location.isSellableOnPhysicalStore} />
                        </span>
                      </div>
                      <div className="mt-2">
                        <Label className="mb-1 text-sm">Quantity</Label>
                        <div className="flex items-stretch gap-0">
                          <Input
                            type="number"
                            min={0}
                            className="rounded-r-none"
                            value={storageLocationQuantities[location.id] ?? 0}
                            onChange={(e) =>
                              setStorageLocationQuantities((prev) => ({
                                ...prev,
                                [location.id]: Number(e.target.value) || 0,
                              }))
                            }
                          />
                          <span className="flex items-center rounded-r-md bg-muted px-3 text-base text-muted-foreground">
                            {packageUomShortForm || "ea"}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {storageLocations.length === 0 && (
                  <p className="text-base text-muted-foreground">No storage locations found.</p>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-muted/40 p-3 space-y-3">
            <div className="flex items-center gap-2">
              <Switch
                checked={useTemplate}
                onCheckedChange={(checked) => {
                  setUseTemplate(checked);
                  if (!checked) setPricingTemplateId(null);
                }}
              />
              <span className="text-base font-medium">Apply pricing from pricing template</span>
            </div>
            {useTemplate && (
              <div>
                <Label className="mb-2">Pricing Template</Label>
                <Select
                  items={pricingTemplates.map((t: any) => ({
                    value: t.id,
                    label: `${t.name}${t.sellableUoMShortForm ? ` (${t.sellableUoMShortForm})` : ""}`,
                  }))}
                  value={pricingTemplateId ?? undefined}
                  onValueChange={(v) => handleTemplateSelect(v as string)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue
                      placeholder={templatesLoading ? "Loading templates..." : "Select a pricing template..."}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {pricingTemplates.map((t: any) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                        {t.sellableUoMShortForm ? ` (${t.sellableUoMShortForm})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!templatesLoading && pricingTemplates.length === 0 && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    No pricing templates found for this product&apos;s unit of measure. Enter pricing manually below.
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-lg p-3 ring-1 ring-foreground/10">
              <Label className="mb-2 font-semibold">
                Total Cost (Wholesale) <span className="text-destructive">*</span>
              </Label>
              <Input
                type="number"
                placeholder="0.00"
                value={totalCost}
                onChange={(e) => handleTotalCostChange(e.target.value)}
              />
              <div className="mt-2 inline-block rounded bg-green-50 px-2 py-1 text-sm font-medium text-green-700 dark:bg-green-950/40 dark:text-green-400">
                Unit cost = ${(unitCostPreview ?? 0).toFixed(2)}
              </div>
            </div>

            <div className="rounded-lg p-3 ring-1 ring-foreground/10">
              <Label className="mb-2 font-semibold">
                Unit Cost <span className="text-destructive">*</span>
              </Label>
              <Input
                type="number"
                placeholder="0.00"
                value={unitCostDisplay}
                onChange={(e) => handleUnitCostChange(e.target.value)}
              />
              <div className="mt-2 inline-block rounded bg-blue-50 px-2 py-1 text-sm font-medium text-blue-700 dark:bg-blue-950/40 dark:text-blue-400">
                Total cost = ${(parseNum(unitCostDisplay) ?? 0).toFixed(2)} × {quantity} {packageUomShortForm} = $
                {(parseNum(totalCost) ?? 0).toFixed(2)}
              </div>
            </div>

            <div className="rounded-lg p-3 ring-1 ring-foreground/10">
              <Label className="mb-2 font-semibold">Low Stock Point</Label>
              <Input
                type="number"
                placeholder="Enter minimum stock level"
                value={stockThreshold}
                onChange={(e) => setStockThreshold(e.target.value)}
              />
              <p className="mt-2 mb-0 text-sm text-muted-foreground">Minimum quantity before low stock alert</p>
            </div>
          </div>

          <div>
            <Label className="mb-2">Recommended Unit Price</Label>
            <Input
              type="number"
              placeholder="0.00"
              value={recommendedUnitPrice}
              onChange={(e) => setRecommendedUnitPrice(e.target.value)}
            />
            {marginPreview !== null && (
              <div
                className={`mt-1 text-sm font-medium ${
                  marginPreview > 0
                    ? "text-green-700 dark:text-green-400"
                    : marginPreview < 0
                      ? "text-red-600 dark:text-red-400"
                      : "text-muted-foreground"
                }`}
              >
                Margin: {marginPreview.toFixed(2)}%
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <Label className="mb-2">
                Unit Weight <span className="text-destructive">*</span>
              </Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="Enter unit weight"
                  value={unitWeight}
                  onChange={(e) => setUnitWeight(e.target.value)}
                />
                <Select
                  items={uomOptions.map((u) => ({ value: u.id, label: u.name }))}
                  value={unitWeightUoMId ?? undefined}
                  onValueChange={(v) => setUnitWeightUoMId(v as string)}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="UoM" />
                  </SelectTrigger>
                  <SelectContent>
                    {uomOptions.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="mb-2">Expiry Date</Label>
              <DatePicker
                value={expiryDate}
                onChange={setExpiryDate}
                placeholder="Select expiry date"
                className="h-9"
              />
            </div>
            <div>
              <Label className="mb-2">External Batch ID</Label>
              <Input
                placeholder="Enter external batch ID"
                value={externalBatchId}
                onChange={(e) => setExternalBatchId(e.target.value)}
              />
            </div>
            <div className="rounded-lg p-3 ring-1 ring-foreground/10">
              <div className="flex items-start gap-2">
                <Checkbox checked={isEcomEnabled} onCheckedChange={(v) => setIsEcomEnabled(Boolean(v))} />
                <div>
                  <span className="text-base font-semibold">Is Ecom Available</span>
                  <p className="mb-0 text-sm text-muted-foreground">
                    Will be enabled for Android, iOS and Web ecommerce
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-muted/40 p-3 space-y-3">
            <div className="flex items-center gap-2">
              <Switch checked={enableProjectedQty} onCheckedChange={setEnableProjectedQty} />
              <span className="text-base font-medium">Enable Conversion for Transfers</span>
            </div>
            {enableProjectedQty && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="mb-2">Target Unit of Measure</Label>
                  <Select
                    items={uomOptions.map((u) => ({ value: u.id, label: u.name }))}
                    value={projectedQtyUomId ?? undefined}
                    onValueChange={(v) => setProjectedQtyUomId(v as string)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select target UOM" />
                    </SelectTrigger>
                    <SelectContent>
                      {uomOptions.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="mb-2">Conversion Rate</Label>
                  <Input
                    type="number"
                    placeholder="e.g. 12"
                    value={projectedQtyConversionRate}
                    onChange={(e) => setProjectedQtyConversionRate(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>


          <div className="flex items-center justify-between rounded-lg bg-muted/40 p-3">
            <span className="text-base font-semibold">Activate package upon import</span>
            <Switch checked={shouldActivate} onCheckedChange={setShouldActivate} />
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 shadow-[inset_0_1px_0_rgba(0,0,0,0.06)]">
          <Button variant="outline" className="h-9 text-sm" disabled={submitting} onClick={onClose}>
            Cancel
          </Button>
          <Button className="h-9 text-sm" disabled={!selectedProductId || submitting} onClick={handleSave}>
            Save Assignment
          </Button>
        </div>

        <AddEditProductDrawer
          open={editProductOpen}
          onClose={() => setEditProductOpen(false)}
          product={selectedProduct}
          onDone={() => {
            setEditProductOpen(false);
            // Pick up a renamed/recategorised product in the summary row.
            fetchSingleProduct(selectedProductId)
              .then((res: any) => setSelectedProduct(res?.data?.data?.product ?? null))
              .catch(() => {});
          }}
        />
      </div>
    </Drawer>
  );
}
