"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2, Sparkles, X } from "lucide-react";

import { useShop } from "@/context/shop-context";
import { fetchRecommendedProduct } from "@/services/packages/getRecommendedProduct";
import { fetchProductsList } from "@/services/products/list";
import { fetchStorageLocations } from "@/services/storageLocations/list";

import Drawer from "@/components/ui/Drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { ApiSelect } from "@/components/ui/api-select";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { DatePicker } from "@/components/ui/date-picker";

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

  const [storageLocations, setStorageLocations] = useState<any[]>([]);
  const [storageLocationQuantities, setStorageLocationQuantities] = useState<Record<string, number>>(() => {
    const breakdown = existingAssignment?.storageLocationBreakdown;
    if (!Array.isArray(breakdown)) return {};
    return breakdown.reduce((acc, entry) => ({ ...acc, [entry.storageLocationId]: entry.quantity }), {});
  });

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
    };

    onSaved(assignment);
    toast.success("Product assignment saved successfully");
    setSubmitting(false);
  };

  return (
    <Drawer open={open} onClose={submitting ? undefined : onClose} side="right" size={640}>
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between px-5 py-4 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)]">
          <div>
            <div className="text-base font-semibold leading-tight">Assign Package</div>
            <div className="text-xs text-muted-foreground leading-tight">{pkg?.metrcTag}</div>
          </div>
          <Button variant="outline" size="icon" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
          <div className="rounded-lg bg-muted/40 p-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Product</span>
              <span className="font-medium">{snapshotData?.ProductName ?? "-"}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Quantity</span>
              <span className="font-medium">
                {snapshotData?.ShippedQuantity ?? "-"} {packageUomShortForm}
              </span>
            </div>
          </div>

          {loadingRecommendation && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
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
                  <div className="truncate text-sm font-medium">{recommendedProduct.name}</div>
                  <div className="truncate text-xs text-muted-foreground">Recommended product</div>
                </div>
              </CardContent>
            </Card>
          )}

          <div>
            <Label className="mb-2">Product</Label>
            <ApiSelect
              placeholder="Search products..."
              value={selectedProductId}
              onChange={(value) => setSelectedProductId(value)}
              fetchPage={fetchProductPage}
              triggerClassName="w-full"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-2">Total Cost (Wholesale)</Label>
              <Input
                type="number"
                placeholder="0.00"
                value={totalCost}
                onChange={(e) => setTotalCost(e.target.value)}
              />
              {unitCostPreview !== null && (
                <div className="mt-1 text-xs text-muted-foreground">Unit Cost: ${unitCostPreview.toFixed(2)}</div>
              )}
            </div>
            <div>
              <Label className="mb-2">Recommended Unit Price</Label>
              <Input
                type="number"
                placeholder="0.00"
                value={recommendedUnitPrice}
                onChange={(e) => setRecommendedUnitPrice(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-2">Unit Weight</Label>
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
              <Label className="mb-2">Low Stock Point</Label>
              <Input
                type="number"
                placeholder="Minimum stock level"
                value={stockThreshold}
                onChange={(e) => setStockThreshold(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-2">Expiry Date</Label>
              <DatePicker value={expiryDate} onChange={setExpiryDate} placeholder="Select expiry date" />
            </div>
            <div>
              <Label className="mb-2">External Batch ID</Label>
              <Input
                placeholder="Enter external batch ID"
                value={externalBatchId}
                onChange={(e) => setExternalBatchId(e.target.value)}
              />
            </div>
          </div>

          <div className="rounded-lg bg-muted/40 p-3 space-y-3">
            <div className="flex items-center gap-2">
              <Switch checked={enableProjectedQty} onCheckedChange={setEnableProjectedQty} />
              <span className="text-sm font-medium">Enable Conversion for Transfers</span>
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

          <div className="rounded-lg bg-muted/40 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium">Storage Locations</span>
              {quantity > 0 && (
                <span className={`text-xs font-semibold ${totalAllocated === quantity ? "text-green-600" : "text-orange-500"}`}>
                  {totalAllocated} / {quantity} {packageUomShortForm}
                </span>
              )}
            </div>
            <div className="max-h-64 space-y-2 overflow-y-auto">
              {storageLocations.map((location) => (
                <div key={location.id} className="rounded-lg bg-background p-3 ring-1 ring-foreground/10">
                  <div className="font-medium">{location.name}</div>
                  <div className="mt-2">
                    <Label className="mb-1 text-xs">Quantity</Label>
                    <Input
                      type="number"
                      min={0}
                      value={storageLocationQuantities[location.id] ?? 0}
                      onChange={(e) =>
                        setStorageLocationQuantities((prev) => ({
                          ...prev,
                          [location.id]: Number(e.target.value) || 0,
                        }))
                      }
                    />
                  </div>
                </div>
              ))}
              {storageLocations.length === 0 && (
                <p className="text-sm text-muted-foreground">No storage locations found.</p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg bg-muted/40 p-3">
            <span className="text-sm font-semibold">Activate package upon import</span>
            <Switch checked={shouldActivate} onCheckedChange={setShouldActivate} />
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 shadow-[inset_0_1px_0_rgba(0,0,0,0.06)]">
          <Button variant="outline" disabled={submitting} onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={!selectedProductId || submitting} onClick={handleSave}>
            Save
          </Button>
        </div>
      </div>
    </Drawer>
  );
}
