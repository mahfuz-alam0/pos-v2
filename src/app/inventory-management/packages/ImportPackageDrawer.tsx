"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Pencil, Plus } from "lucide-react";

import { useShop } from "@/context/shop-context";
import { attachPackageToProduct } from "@/services/packages/attachToProduct";
import { updateInventoryEcommStatus } from "@/services/inventories/updateEcommStatus";
import { fetchProductsList } from "@/services/products/list";
import { fetchSingleProduct } from "@/services/products/getSingle";
import { listUoms } from "@/services/uoms/listUoms";
import { fetchStorageLocations } from "@/services/storageLocations/list";

import Drawer from "@/components/ui/Drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiSelect } from "@/components/ui/api-select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import PackageIdCard from "./PackageIdCard";
import AddEditProductDrawer from "@/app/catalog/products/AddEditProductDrawer";

interface ImportPackageDrawerProps {
  open: boolean;
  onClose: () => void;
  packageDetail: any;
  onImported: () => void;
}

interface UomOption {
  id: string;
  name: string;
  shortForm?: string;
}

interface StorageLocationOption {
  id: string;
  name: string;
}

function toDateString(date: Date | undefined): string | null {
  if (!date) return null;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default function ImportPackageDrawer({
  open,
  onClose,
  packageDetail,
  onImported,
}: ImportPackageDrawerProps) {
  const { shopId } = useShop();

  // Matches ConvertPackageDialog.tsx's convention: absence of metrcData
  // (=== null/undefined) means NOT metrc.
  const isMetrc = packageDetail?.metrcData !== null && packageDetail?.metrcData !== undefined;
  const snapshot = packageDetail?.metrcData?.snapShotData?.metrcSnapshotData;

  const [selectedProductId, setSelectedProductId] = useState<string | number | null>(null);
  const [selectedProductLabel, setSelectedProductLabel] = useState<string | undefined>(undefined);
  const [addProductOpen, setAddProductOpen] = useState(false);
  // null = the drawer opens in create mode; a product = edit mode.
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  // Total Cost (Wholesale) <-> Unit Cost are two views of the same number,
  // kept in sync via the package's quantity (old app: ImportPackage.jsx's
  // handleTotalCostChange/handleUnitCostFieldChange).
  const [totalCost, setTotalCost] = useState("");
  const [unitCost, setUnitCost] = useState("");

  const [lowStockPoint, setLowStockPoint] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [unitWeight, setUnitWeight] = useState("");
  const [unitWeightUoMId, setUnitWeightUoMId] = useState<string | null>(null);
  const [expiryDate, setExpiryDate] = useState<Date | undefined>(undefined);
  const [externalBatchId, setExternalBatchId] = useState("");
  const [isEcomEnabled, setIsEcomEnabled] = useState(true);
  const [uomOptions, setUomOptions] = useState<UomOption[]>([]);

  const [storageLocations, setStorageLocations] = useState<StorageLocationOption[]>([]);
  const [locationQuantities, setLocationQuantities] = useState<Record<string, number>>({});

  // Lets the incoming package quantity convert into a different sellable
  // unit on the product (e.g. bulk flower package -> pre-rolls), old app:
  // ImportPackage.jsx's showConversionFields/conversionRate/conversionUomId.
  const [showConversionFields, setShowConversionFields] = useState(false);
  const [conversionRate, setConversionRate] = useState("");
  const [conversionUomId, setConversionUomId] = useState<string | null>(null);

  const packageQty = packageDetail?.quantityLeft ?? packageDetail?.originalQuantity ?? 0;
  const uomShortForm = packageDetail?.uoMShortForm ?? "ea";

  // A package that already has a storage-location breakdown has been
  // imported/allocated before — old app (ImportPackage.jsx) locks that
  // allocation on reimport ("isReimport") and only lets a never-allocated
  // package be assigned to a location for the first time here.
  const isReimport = Object.keys(packageDetail?.storageLocationBreakdown ?? {}).length > 0;
  const totalAllocated = Object.values(locationQuantities).reduce((sum, qty) => sum + (Number(qty) || 0), 0);

  useEffect(() => {
    if (!open) return;
    listUoms()
      .then((res) => setUomOptions(res?.data?.data?.uoms ?? []))
      .catch(() => setUomOptions([]));
    if (shopId) {
      fetchStorageLocations(shopId as string)
        .then((res) => setStorageLocations(res?.data?.data?.locations ?? []))
        .catch(() => setStorageLocations([]));
    }
  }, [open, shopId]);

  useEffect(() => {
    if (!open || !packageDetail) return;
    setSelectedProductId(null);
    setSelectedProductLabel(undefined);
    setEditingProduct(null);
    setTotalCost("");
    setUnitCost(packageDetail?.unitCost ? String(packageDetail.unitCost) : "");
    setLowStockPoint("");
    setIsActive(true);
    setUnitWeight("");
    setUnitWeightUoMId(null);
    setExpiryDate(undefined);
    setExternalBatchId("");
    setIsEcomEnabled(true);
    setSubmitting(false);
    setShowConversionFields(false);
    setConversionRate("");
    setConversionUomId(null);

    const existing = packageDetail?.storageLocationBreakdown ?? {};
    setLocationQuantities(
      Object.entries(existing).reduce<Record<string, number>>((acc, [id, qty]) => {
        acc[id] = Number(qty) || 0;
        return acc;
      }, {})
    );
  }, [open, packageDetail]);

  const handleTotalCostChange = (value: string) => {
    setTotalCost(value);
    const total = parseFloat(value);
    if (packageQty > 0 && Number.isFinite(total)) setUnitCost((total / packageQty).toFixed(2));
  };

  const handleUnitCostChange = (value: string) => {
    setUnitCost(value);
    const unit = parseFloat(value);
    if (packageQty > 0 && Number.isFinite(unit)) setTotalCost((unit * packageQty).toFixed(2));
  };

  const unitCostHelper = useMemo(() => {
    if (!packageQty) return null;
    const total = parseFloat(totalCost) || 0;
    return `Unit cost = $${(total / packageQty).toFixed(2)}`;
  }, [totalCost, packageQty]);

  const totalCostHelper = useMemo(() => {
    if (!packageQty) return null;
    const unit = parseFloat(unitCost) || 0;
    return `Total cost = $${unit.toFixed(2)} × ${packageQty} ${uomShortForm} = $${(unit * packageQty).toFixed(2)}`;
  }, [unitCost, packageQty, uomShortForm]);

  const openEditProduct = async () => {
    if (!selectedProductId) return;
    try {
      const res: any = await fetchSingleProduct(selectedProductId);
      const product = res?.data?.data?.product;
      if (!product) {
        toast.error("Could not load that product.");
        return;
      }
      setEditingProduct(product);
      setAddProductOpen(true);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load product");
    }
  };

  const fetchProductPage = async (page: number, search: string) => {
    const res = await fetchProductsList({ page, limit: 20, search: search || undefined });
    return {
      items: (res?.data ?? []).map((p: any) => ({ id: p.id, name: p.name })),
      totalPages: res?.paginationData?.totalPages ?? 1,
    };
  };

  const validate = (): string | null => {
    if (!selectedProductId) return "Please select a product to attach this package to.";
    if (!unitCost || parseFloat(unitCost) <= 0) return "Unit Cost is required and must be greater than 0";
    if (!unitWeight || parseFloat(unitWeight) <= 0) return "Unit Weight is required and must be greater than 0";
    if (!isReimport && packageQty > 0 && totalAllocated !== packageQty) {
      return `Allocated quantity (${totalAllocated}) must match total package quantity (${packageQty})`;
    }
    return null;
  };

  const handleImport = async () => {
    const validationError = validate();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setSubmitting(true);
    try {
      const body = {
        shopId,
        packageId: packageDetail?.id,
        productId: selectedProductId,
        unitCost: unitCost ? parseFloat(unitCost) : null,
        isActive,
        stockThreshold: lowStockPoint ? parseFloat(lowStockPoint) : null,
        unitWeight: unitWeight ? parseFloat(unitWeight) : null,
        unitWeightUoMId: unitWeightUoMId || null,
        expiryDate: toDateString(expiryDate),
        externalBatchId: externalBatchId || null,
        projectedQtyUomId: showConversionFields ? conversionUomId : null,
        projectedQtyConversionRate: showConversionFields && conversionRate ? parseFloat(conversionRate) : null,
        // On reimport, storage locations are locked to the package's existing
        // allocation — moving qty between locations goes through Transfers.
        // First-time import sends whatever the allocator below was filled in with.
        storageLocationBreakdown: Object.entries(locationQuantities)
          .filter(([, qty]) => Number(qty) > 0)
          .map(([storageLocationId, qty]) => ({ storageLocationId, quantity: Number(qty) })),
      };

      const res = await attachPackageToProduct(body, isMetrc);
      const inventoryId = res?.data?.data?.inventoryId;

      // Best-effort: the "Is Ecom Available" toggle drives all 3 channel
      // availability flags together, via a separate call — attach-to-product
      // itself doesn't accept an ecom flag. Don't fail the import over it.
      if (inventoryId) {
        const isDisabled = !isEcomEnabled;
        try {
          await updateInventoryEcommStatus({
            id: inventoryId,
            shopId,
            isDisabledFromIOSEcomm: isDisabled,
            isDisabledFromAndroidEcomm: isDisabled,
            isDisabledFromWEBEcomm: isDisabled,
          });
        } catch (ecomError: any) {
          toast.warning(ecomError?.message || "Failed to sync ecom availability");
        }
      }

      toast.success("Package imported successfully");
      onImported();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Failed to import package");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Drawer open={open} onClose={submitting ? undefined : onClose} side="right" size="70vw">
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between px-5 py-4 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)]">
          <div className="text-base font-semibold leading-tight">Import Package</div>
          <Button variant="outline" size="icon" onClick={submitting ? undefined : onClose}>
            <span className="sr-only">Close</span>
            &times;
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5 [&_.h-8]:h-10 [&_[data-slot=input]]:h-10 [&_[data-slot=select-trigger]]:h-10">
          <PackageIdCard packageDetail={packageDetail} />

          {isMetrc && snapshot && (
            <div className="w-1/2 rounded-xl bg-green-50 p-4 dark:bg-green-950/20">
              <p className="mb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Metrc Tag</p>
              <p className="mb-3 text-sm font-semibold break-all">
                {snapshot.Label ?? packageDetail?.metrcData?.metrcTag ?? packageDetail?.advertisedId ?? "-"}
              </p>
              <div className="grid grid-cols-2 gap-y-1.5 text-sm">
                <div className="text-muted-foreground">Name:</div>
                <div className="font-medium">{snapshot.ProductName ?? packageDetail?.name ?? "-"}</div>
                <div className="text-muted-foreground">Category:</div>
                <div>{snapshot.ProductCategoryName ?? "-"}</div>
                <div className="text-muted-foreground">Strain:</div>
                <div>{snapshot.ItemStrainName ?? "-"}</div>
                <div className="text-muted-foreground">Metrc Qty:</div>
                <div>{snapshot.Quantity != null ? `${snapshot.Quantity} ${snapshot.UnitOfMeasureName ?? ""}` : "-"}</div>
                <div className="text-muted-foreground">Metrc Storage Location:</div>
                <div>{snapshot.LocationName ?? "-"}</div>
              </div>
            </div>
          )}

          {storageLocations.length > 0 && (
            <div className="rounded-xl bg-muted/40 p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-semibold">Storage Locations</span>
                {packageQty > 0 && (
                  <span
                    className={`text-xs font-semibold ${
                      totalAllocated === packageQty ? "text-green-600" : "text-orange-500"
                    }`}
                  >
                    {totalAllocated} / {packageQty} {uomShortForm}
                  </span>
                )}
              </div>
              <div className="space-y-2">
                {storageLocations.map((loc) => (
                  <div key={loc.id} className="flex items-center justify-between gap-3 rounded-lg bg-white p-3 shadow-sm">
                    <span className="text-sm font-medium">{loc.name}</span>
                    <Input
                      type="number"
                      min={0}
                      className="w-28"
                      disabled={isReimport}
                      value={locationQuantities[loc.id] ?? 0}
                      onChange={(e) =>
                        setLocationQuantities((prev) => ({ ...prev, [loc.id]: Number(e.target.value) || 0 }))
                      }
                    />
                  </div>
                ))}
              </div>
              {isReimport ? (
                <p className="mt-3 text-xs text-muted-foreground">
                  Quantity is carried over from the previous import. Use Transfers to move stock between storage
                  locations.
                </p>
              ) : (
                packageQty > 0 &&
                totalAllocated !== packageQty && (
                  <p className="mt-3 text-xs text-orange-600">
                    Allocated quantity ({totalAllocated}) does not match total package quantity ({packageQty}).
                  </p>
                )
              )}
            </div>
          )}

          <div>
            <div className="mb-2 flex items-center justify-between">
              <Label>Select Product from Catalog</Label>
              <div className="flex items-center gap-2">
                {selectedProductId && (
                  <Button type="button" variant="outline" size="sm" onClick={openEditProduct}>
                    <Pencil className="size-3.5" />
                    Edit Product
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditingProduct(null);
                    setAddProductOpen(true);
                  }}
                >
                  <Plus className="size-3.5" />
                  Create New Product
                </Button>
              </div>
            </div>
            <ApiSelect
              placeholder="Search and select a product..."
              value={selectedProductId}
              onChange={(value, option) => {
                setSelectedProductId(value);
                setSelectedProductLabel(option?.name);
              }}
              fetchPage={fetchProductPage}
              triggerClassName="w-full"
              initialLabel={selectedProductLabel}
            />
          </div>

          {selectedProductId && (
            <div className="rounded-xl bg-muted/40 p-4 shadow-sm">
              <label className="flex items-start gap-2">
                <Checkbox
                  className="mt-0.5"
                  checked={showConversionFields}
                  onCheckedChange={(checked) => setShowConversionFields(checked === true)}
                />
                <span>
                  <span className="text-sm font-medium">Enable Conversion</span>
                  <p className="text-xs text-muted-foreground">
                    Convert this package's incoming quantity into a different sellable unit.
                  </p>
                </span>
              </label>

              {showConversionFields && (
                <div className="mt-3 space-y-3">
                  <div>
                    <Label className="mb-2">Target Unit of Measure</Label>
                    <Select
                      items={uomOptions.map((u) => ({ value: u.id, label: u.shortForm || u.name }))}
                      value={conversionUomId ?? undefined}
                      onValueChange={(v) => setConversionUomId(v)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select UoM" />
                      </SelectTrigger>
                      <SelectContent>
                        {uomOptions.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.shortForm || u.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="mb-2">Conversion Rate</Label>
                    <Input
                      type="number"
                      placeholder="Enter conversion rate"
                      value={conversionRate}
                      onChange={(e) => setConversionRate(e.target.value)}
                    />
                  </div>

                  {packageQty > 0 && parseFloat(conversionRate) > 0 && (
                    <div className="flex items-center gap-4 rounded-lg bg-primary/5 p-3 text-center">
                      <div className="flex-1">
                        <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                          Original Quantity
                        </p>
                        <p className="text-sm font-bold">
                          {packageQty} {uomShortForm}
                        </p>
                      </div>
                      <span className="text-muted-foreground">→</span>
                      <div className="flex-1">
                        <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                          Converts To (Rate: {conversionRate})
                        </p>
                        <p className="text-sm font-bold text-primary">
                          {(packageQty / parseFloat(conversionRate)).toFixed(2)}{" "}
                          {uomOptions.find((u) => u.id === conversionUomId)?.shortForm ?? ""}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 rounded-xl bg-[#F9FAFB] p-4 sm:grid-cols-3">
            <div className="rounded-xl bg-white p-4 shadow-sm">
              <Label className="mb-2">
                Total Cost (Wholesale) <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-sm text-muted-foreground">
                  $
                </span>
                <Input
                  type="number"
                  placeholder="0.00"
                  className="pl-6"
                  value={totalCost}
                  onChange={(e) => handleTotalCostChange(e.target.value)}
                />
              </div>
              {unitCostHelper && (
                <p className="mt-2 w-fit rounded-md bg-green-100 px-2 py-1 text-xs font-medium text-green-700 dark:bg-green-950/40 dark:text-green-500">
                  {unitCostHelper}
                </p>
              )}
            </div>
            <div className="rounded-xl bg-white p-4 shadow-sm">
              <Label className="mb-2">
                Unit Cost <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-sm text-muted-foreground">
                  $
                </span>
                <Input
                  type="number"
                  placeholder="0.00"
                  className="pl-6"
                  value={unitCost}
                  onChange={(e) => handleUnitCostChange(e.target.value)}
                />
              </div>
              {totalCostHelper && (
                <p className="mt-2 w-fit rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                  {totalCostHelper}
                </p>
              )}
            </div>
            <div className="rounded-xl bg-white p-4 shadow-sm">
              <Label className="mb-2">Low Stock Point</Label>
              <Input
                type="number"
                placeholder="Enter minimum stock level"
                value={lowStockPoint}
                onChange={(e) => setLowStockPoint(e.target.value)}
              />
              <p className="mt-1 text-xs text-muted-foreground">Minimum quantity before low stock alert</p>
            </div>
          </div>

          <label className="flex items-center justify-between gap-3 rounded-lg bg-muted/40 p-3">
            <span className="text-sm font-medium">Activate package upon import</span>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </label>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <div className="rounded-xl bg-white p-4 shadow-sm">
              <Label className="mb-2">
                Unit Weight <span className="text-destructive">*</span>
              </Label>
              <div className="flex gap-1.5">
                <Input
                  type="number"
                  placeholder="Enter unit weight"
                  value={unitWeight}
                  onChange={(e) => setUnitWeight(e.target.value)}
                />
                <Select
                  items={uomOptions.map((u) => ({ value: u.id, label: u.shortForm || u.name }))}
                  value={unitWeightUoMId ?? undefined}
                  onValueChange={(v) => setUnitWeightUoMId(v)}
                >
                  <SelectTrigger className="w-28 shrink-0">
                    <SelectValue placeholder="Select UoM" />
                  </SelectTrigger>
                  <SelectContent>
                    {uomOptions.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.shortForm || u.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="rounded-xl bg-white p-4 shadow-sm">
              <Label className="mb-2">Expiry Date</Label>
              <DatePicker value={expiryDate} onChange={setExpiryDate} placeholder="Select expiry date" />
            </div>
            <div className="rounded-xl bg-white p-4 shadow-sm">
              <Label className="mb-2">External Batch ID</Label>
              <Input
                placeholder="Enter external batch ID"
                value={externalBatchId}
                onChange={(e) => setExternalBatchId(e.target.value)}
              />
            </div>
            <div className="rounded-xl bg-white p-4 shadow-sm">
              <label className="flex items-start gap-2">
                <Checkbox
                  className="mt-0.5"
                  checked={isEcomEnabled}
                  onCheckedChange={(checked) => setIsEcomEnabled(checked === true)}
                />
                <span>
                  <span className="text-sm font-medium">Is Ecom Available</span>
                  <p className="text-xs text-muted-foreground">Will be enabled for Android, iOS and Web ecommerce</p>
                </span>
              </label>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 shadow-[inset_0_1px_0_rgba(0,0,0,0.06)]">
          <Button className="h-9! text-sm!" variant="outline" disabled={submitting} onClick={onClose}>
            Cancel
          </Button>
          <Button className="h-9! text-sm!" disabled={!selectedProductId || submitting} onClick={handleImport}>
            {submitting ? "Importing..." : "Import Package"}
          </Button>
        </div>
      </div>

      <AddEditProductDrawer
        open={addProductOpen}
        onClose={() => setAddProductOpen(false)}
        product={editingProduct}
        onDone={(created) => {
          setAddProductOpen(false);
          if (created) {
            setSelectedProductId(created.id);
            setSelectedProductLabel(created.name);
          } else if (editingProduct) {
            // An edit can rename the product — keep the select's label in step.
            fetchSingleProduct(editingProduct.id)
              .then((res: any) => setSelectedProductLabel(res?.data?.data?.product?.name))
              .catch(() => {});
          }
        }}
      />
    </Drawer>
  );
}
