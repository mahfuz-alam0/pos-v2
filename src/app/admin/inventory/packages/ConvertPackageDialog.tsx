"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { RefreshCw, X } from "lucide-react";

import { useShop } from "@/context/shop-context";
import { fetchMetrcLocations, refreshMetrcLocations } from "@/services/packages/metrcLocations";
import { fetchMetrcUom } from "@/services/packages/metrcUom";
import { fetchAvailableMetrcPackageTags } from "@/services/packages/metrcTags";
import { convertPackage, convertMetrcPackage } from "@/services/packages/convert";
import { fetchSinglePackage } from "@/services/packages/getSingle";
import { listUoms } from "@/services/uoms/listUoms";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Drawer from "@/components/ui/Drawer";

import MetrcTagCombobox from "./MetrcTagCombobox";
import type { PackageDetail } from "./types";

interface StorageLocationRow {
  id: string;
  name: string;
  quantity: number;
  derivedQuantity: number;
  quantityToConvert: number;
}

interface MetrcLocationOption {
  Id: string;
  Name: string;
}

interface MetrcUomOption {
  Name: string;
}

interface RegularUomOption {
  id: string;
  name: string;
}

function QuantityToConvertCell({
  value,
  max,
  onChange,
}: {
  value: number;
  max: number;
  onChange: (value: number) => void;
}) {
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <Input
        type="number"
        min={0}
        max={max}
        value={value || 0}
        onChange={(e) => {
          const raw = e.target.value;
          const parsed = raw === "" ? 0 : Math.abs(parseFloat(raw));
          if (Number.isNaN(parsed)) return;
          if (parsed > max) {
            setError(`Cannot exceed available quantity (${max})`);
            return;
          }
          setError(null);
          onChange(Math.max(0, parsed));
        }}
        className="w-40"
      />
      {error && <div className="mt-1 text-xs text-destructive">{error}</div>}
    </div>
  );
}

export default function ConvertPackageDialog({
  open,
  onClose,
  packageDetail,
  onConverted,
}: {
  open: boolean;
  onClose: () => void;
  packageDetail: PackageDetail | any;
  onConverted: () => void;
}) {
  const { shopId } = useShop();

  const [initLoading, setInitLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [data, setData] = useState<any>(null);

  // isMetrc: matches old ConvertModal.jsx exactly — absence of metrcData
  // (=== null) means NOT metrc, anything else means it IS metrc.
  const isMetrc = packageDetail?.metrcData !== null && packageDetail?.metrcData !== undefined;

  const [storageLocationBreakdown, setStorageLocationBreakdown] = useState<StorageLocationRow[]>([]);
  const [isFloatingPackage, setIsFloatingPackage] = useState(false);

  // METRC branch state
  const [metrcUomList, setMetrcUomList] = useState<MetrcUomOption[]>([]);
  const [metrcLocations, setMetrcLocations] = useState<MetrcLocationOption[]>([]);
  const [availableTags, setAvailableTags] = useState<any[]>([]);
  const [refreshingLocations, setRefreshingLocations] = useState(false);
  const [expectedQty, setExpectedQty] = useState("");
  const [uom, setUom] = useState<string | null>(null);
  const [newMetrcTag, setNewMetrcTag] = useState("");
  const [flatQuantityToConvert, setFlatQuantityToConvert] = useState<string>("");
  const [addMetrcItem, setAddMetrcItem] = useState(false);
  const [metrcProductName, setMetrcProductName] = useState("");
  const [metrcLocationId, setMetrcLocationId] = useState<string>("");

  // Regular (non-METRC) branch state
  const [regularUoms, setRegularUoms] = useState<RegularUomOption[]>([]);
  const [name, setName] = useState("");
  const [advertisedId, setAdvertisedId] = useState("");
  const [keepSourceProperties, setKeepSourceProperties] = useState(true);
  const [regularFlatQty, setRegularFlatQty] = useState<string>("");
  const [unitCost, setUnitCost] = useState("");
  const [originalQuantityUomId, setOriginalQuantityUomId] = useState<string>("");
  const [originalBrandName, setOriginalBrandName] = useState("");
  const [originalCategoryName, setOriginalCategoryName] = useState("");
  const [originalSupplierId, setOriginalSupplierId] = useState("");
  const [externalBatchId, setExternalBatchId] = useState("");
  const [manufacturerSKU, setManufacturerSKU] = useState("");
  const [isSample, setIsSample] = useState(false);

  const hasStorageLocations = useMemo(
    () => (data?.storageLocationBreakdown ?? []).filter((item: any) => item.quantity !== 0).length > 0,
    [data]
  );

  const uomAbbr =
    packageDetail?.metrcData?.snapShotData?.metrcSnapshotData?.UnitOfMeasureAbbreviation ||
    packageDetail?.uoMShortForm ||
    "N/A";

  // ── Load lookups + source package detail on open ────────────────────────
  useEffect(() => {
    if (!open || !packageDetail?.id || !shopId) return;

    const init = async () => {
      setInitLoading(true);
      try {
        const res = await fetchSinglePackage(shopId, { id: packageDetail.id });
        const pkg = res?.data?.data?.package ?? res?.data?.package ?? null;
        setData(pkg);

        const breakdown = (pkg?.storageLocationBreakdown ?? []).map((loc: any) => ({
          id: loc.id,
          name: loc.name,
          quantity: loc.quantity,
          derivedQuantity: loc.quantity,
          quantityToConvert: 0,
        }));
        setStorageLocationBreakdown(breakdown);
        setIsFloatingPackage(
          breakdown.length > 0 ? breakdown.every((loc: StorageLocationRow) => loc.quantity === 0) : true
        );

        const currentDate = new Date().toLocaleDateString("en-US", {
          month: "2-digit",
          day: "2-digit",
          year: "numeric",
        });
        if (pkg?.name) setName(`${pkg.name} (converted at ${currentDate})`);
        setAdvertisedId(pkg?.advertisedId ?? "");
      } catch {
        toast.error("Failed to load package details");
      } finally {
        setInitLoading(false);
      }
    };

    init();
  }, [open, packageDetail?.id, shopId]);

  useEffect(() => {
    if (!open || !shopId) return;

    (async () => {
      try {
        const res = await fetchMetrcUom(shopId);
        setMetrcUomList(res?.data?.data?.uoms ?? res?.data?.uoms ?? []);
      } catch {
        // non-fatal — dropdown will just be empty
      }
    })();

    loadLocations();

    (async () => {
      try {
        const res = await fetchAvailableMetrcPackageTags(shopId);
        setAvailableTags(res?.data?.data?.tags ?? res?.data?.tags ?? []);
      } catch {
        // non-fatal
      }
    })();

    (async () => {
      try {
        const res = await listUoms();
        setRegularUoms(res?.data?.data?.uoms ?? res?.data?.uoms ?? []);
      } catch {
        // non-fatal
      }
    })();
  }, [open, shopId]);

  const loadLocations = async () => {
    if (!shopId) return;
    try {
      const res = await fetchMetrcLocations(shopId);
      setMetrcLocations(res?.data?.data?.locations?.packageLocations ?? res?.data?.locations?.packageLocations ?? []);
    } catch {
      // non-fatal
    }
  };

  const handleRefreshLocations = async () => {
    if (!shopId) return;
    setRefreshingLocations(true);
    try {
      await refreshMetrcLocations(shopId);
      await loadLocations();
      toast.success("Metrc locations refreshed");
    } catch (error: any) {
      toast.error(error?.message || "Failed to refresh Metrc locations");
    } finally {
      setRefreshingLocations(false);
    }
  };

  const tagOptions = (availableTags ?? []).map((tag: any) => ({
    value: tag.Label || tag.name || tag,
    label: tag.Label || tag.name || tag,
  }));

  // Reset form state whenever drawer closes so re-opening on a different
  // package doesn't leak stale field values.
  const resetState = () => {
    setData(null);
    setStorageLocationBreakdown([]);
    setExpectedQty("");
    setUom(null);
    setNewMetrcTag("");
    setFlatQuantityToConvert("");
    setAddMetrcItem(false);
    setMetrcProductName("");
    setMetrcLocationId("");
    setName("");
    setAdvertisedId("");
    setKeepSourceProperties(true);
    setRegularFlatQty("");
    setUnitCost("");
    setOriginalQuantityUomId("");
    setOriginalBrandName("");
    setOriginalCategoryName("");
    setOriginalSupplierId("");
    setExternalBatchId("");
    setManufacturerSKU("");
    setIsSample(false);
  };

  const handleClose = () => {
    if (submitLoading) return;
    resetState();
    onClose();
  };

  const handleStorageQtyChange = (id: string, value: number) => {
    setStorageLocationBreakdown((prev) =>
      prev.map((loc) => (loc.id === id ? { ...loc, derivedQuantity: loc.quantity - value, quantityToConvert: value } : loc))
    );
  };

  // ── Validation — matches old validateMetrcForm exactly ──────────────────
  const validateMetrcForm = (): string[] => {
    const errors: string[] = [];

    if (!expectedQty || expectedQty.trim() === "") {
      errors.push("Expected quantity is required");
    }
    if (!uom || uom.trim() === "") {
      errors.push("Unit of Measurement (UoM) is required");
    }
    if (!newMetrcTag || newMetrcTag.trim() === "") {
      errors.push("Metrc tag is required");
    }

    if (hasStorageLocations) {
      const hasValidQuantity = storageLocationBreakdown.some((loc) => loc.quantityToConvert > 0);
      if (!hasValidQuantity) {
        errors.push("At least one storage location must have quantity to convert");
      }
    } else {
      const flat = parseFloat(flatQuantityToConvert);
      if (!flatQuantityToConvert || Number.isNaN(flat) || flat <= 0) {
        errors.push("Quantity to convert must be greater than 0");
      }
    }

    if (addMetrcItem) {
      if (!metrcProductName) {
        errors.push('Metrc item selection is required when "use same Metrc Item" is disabled');
      }
      if (!metrcLocationId) {
        errors.push('Location selection is required when "use same Metrc Item" is disabled');
      }
    }

    return errors;
  };

  const handleSubmit = async () => {
    if (!shopId || !data) return;

    if (isMetrc) {
      const errors = validateMetrcForm();
      if (errors.length > 0) {
        errors.forEach((e) => toast.error(e));
        return;
      }
    } else if (!name.trim()) {
      toast.error("Package name is required");
      return;
    }

    setSubmitLoading(true);
    try {
      if (isMetrc) {
        const finalFlatQuantityToConvert = hasStorageLocations ? 0 : parseFloat(flatQuantityToConvert) || 0;

        const metrcPayload: Record<string, any> = {
          shopId,
          sourcePackageId: data.id,
          storageLocationBreakdown: hasStorageLocations
            ? storageLocationBreakdown
                .filter((item) => item.quantityToConvert > 0)
                .map((item) => ({
                  storageLocationId: item.id,
                  quantityToConvert: item.quantityToConvert,
                }))
            : [],
          expectedQuantityInDestination: parseFloat(expectedQty) || 1,
          destinationQTYMetrcUoM: uom,
          // Metrc Tag is always required in the original design — the source
          // tag is NEVER kept, a new tag is always generated. Do not add a
          // toggle for this; it is intentionally hard-coded.
          shouldKeepSourceTag: false,
          newMetrcTag: newMetrcTag,
          shouldKeepSourceMetrcProduct: !addMetrcItem,
          metrcProductName: addMetrcItem && metrcProductName ? metrcProductName : undefined,
          metrcLocationId: addMetrcItem && metrcLocationId ? metrcLocationId : undefined,
        };

        if (finalFlatQuantityToConvert > 0) {
          metrcPayload.flatQuantityToConvert = finalFlatQuantityToConvert;
        }

        await convertMetrcPackage(metrcPayload);
        toast.success("METRC Package Successfully Converted");
      } else {
        const body = {
          shopId,
          sourcePackageId: data.id,
          name,
          advertisedId,
          keepSourceProperties,
          flatQuantityToConvert: isFloatingPackage ? parseFloat(regularFlatQty) || 1 : 1,
          storageLocationBreakdown: storageLocationBreakdown.map((item) => ({
            storageLocationId: item.id,
            quantityToConvert: item.quantityToConvert,
          })),
          overridePackageProperties: keepSourceProperties
            ? undefined
            : {
                unitCost: unitCost ? parseFloat(unitCost) : undefined,
                originalQuantityUomId: originalQuantityUomId || undefined,
                originalBrandName: originalBrandName || undefined,
                originalCategoryName: originalCategoryName || undefined,
                originalSupplierId: originalSupplierId || undefined,
                externalBatchId: externalBatchId || undefined,
                manufacturerSKU: manufacturerSKU || undefined,
                isSample,
              },
        };

        await convertPackage(body);
        toast.success("Package Successfully Converted");
      }

      onConverted();
      handleClose();
    } catch (error: any) {
      toast.error(
        error?.message || (isMetrc ? "METRC Package failed to convert" : "Package failed to convert")
      );
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <Drawer open={open} onClose={handleClose} side="right" size="60%">
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-border p-4">
          <h3 className="text-base font-semibold">Convert Package ({data?.advertisedId ?? packageDetail?.advertisedId})</h3>
          <Button variant="outline" size="icon" onClick={handleClose}>
            <X className="size-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {initLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-6 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : isMetrc ? (
            <div className="flex flex-col gap-5">
              <div>
                <h4 className="mb-2 text-sm font-semibold text-muted-foreground">Converted From</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-muted/40 p-3">
                    <p className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">Product</p>
                    <p className="text-sm font-medium">{packageDetail?.productName ?? "-"}</p>
                  </div>
                  <div className="rounded-lg bg-muted/40 p-3">
                    <p className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">Package</p>
                    <p className="text-sm font-medium">{data?.name ?? "-"}</p>
                  </div>
                </div>
              </div>

              <div className="h-px bg-border" />

              <div>
                <h4 className="mb-2 text-sm font-semibold text-muted-foreground">Conversion Details</h4>

                {hasStorageLocations ? (
                  <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/60">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium">Name</th>
                          <th className="px-3 py-2 text-left font-medium">Quantity</th>
                          <th className="px-3 py-2 text-left font-medium">Qty to Convert</th>
                        </tr>
                      </thead>
                      <tbody>
                        {storageLocationBreakdown.map((loc, i) => (
                          <tr
                            key={loc.id}
                            className={`shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] ${i % 2 === 1 ? "bg-stone-100 dark:bg-stone-800" : ""}`}
                          >
                            <td className="px-3 py-2">{loc.name}</td>
                            <td className="px-3 py-2 font-mono">
                              {parseFloat(String(loc.quantity)).toFixed(2)} {uomAbbr}
                            </td>
                            <td className="px-3 py-2">
                              <QuantityToConvertCell
                                value={loc.quantityToConvert}
                                max={loc.quantity}
                                onChange={(val) => handleStorageQtyChange(loc.id, val)}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    <div className="rounded-lg bg-muted/40 p-3">
                      <p className="text-xs text-muted-foreground">Quantity Left</p>
                      <p className="text-xl font-semibold">
                        {packageDetail?.quantityLeft || 0} <span className="text-sm font-normal text-muted-foreground">{uomAbbr}</span>
                      </p>
                    </div>
                    <div>
                      <Label className="mb-1 block">Quantity to Convert</Label>
                      <Input
                        type="number"
                        min={0}
                        max={packageDetail?.quantityLeft || 0}
                        placeholder="Enter quantity to convert"
                        value={flatQuantityToConvert}
                        onChange={(e) => setFlatQuantityToConvert(e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <Label className="mb-1 block">Destination</Label>
                <div className="flex gap-2">
                  <Input
                    className="w-3/5"
                    placeholder="Expected Quantity"
                    value={expectedQty}
                    onChange={(e) => setExpectedQty(e.target.value)}
                  />
                  <Select items={metrcUomList.map((u) => ({ value: u.Name, label: u.Name }))} value={uom ?? undefined} onValueChange={setUom}>
                    <SelectTrigger className="w-2/5">
                      <SelectValue placeholder="UoM" />
                    </SelectTrigger>
                    <SelectContent>
                      {metrcUomList.map((u) => (
                        <SelectItem key={u.Name} value={u.Name}>
                          {u.Name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label className="mb-1 block">
                  Metrc Tag <span className="text-destructive">*</span>
                </Label>
                <MetrcTagCombobox value={newMetrcTag} onChange={setNewMetrcTag} options={tagOptions} />
              </div>

              <label className="flex items-center gap-2">
                <Checkbox checked={addMetrcItem} onCheckedChange={(checked) => setAddMetrcItem(checked === true)} />
                <span className="text-sm">Assign a different Metrc item &amp; location</span>
              </label>

              {addMetrcItem && (
                <div className="flex flex-col gap-3 rounded-lg bg-muted/30 p-3">
                  <div>
                    <Label className="mb-1 block">
                      Metrc Item <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      placeholder="Metrc product name"
                      value={metrcProductName}
                      onChange={(e) => setMetrcProductName(e.target.value)}
                    />
                  </div>
                  <div>
                    <div className="mb-1 flex items-center justify-between">
                      <Label>
                        Metrc Location <span className="text-destructive">*</span>
                      </Label>
                      <Button variant="outline" size="icon-sm" onClick={handleRefreshLocations} disabled={refreshingLocations} title="Refresh locations">
                        <RefreshCw className={`size-3.5 ${refreshingLocations ? "animate-spin" : ""}`} />
                      </Button>
                    </div>
                    <Select
                      items={metrcLocations.map((l) => ({ value: l.Id, label: l.Name }))}
                      value={metrcLocationId || undefined}
                      onValueChange={setMetrcLocationId}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Choose Location" />
                      </SelectTrigger>
                      <SelectContent>
                        {metrcLocations.map((loc) => (
                          <SelectItem key={loc.Id} value={loc.Id}>
                            {loc.Name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              <div>
                <h4 className="mb-2 text-sm font-semibold text-muted-foreground">Converted From</h4>
                <div className="rounded-lg bg-muted/40 p-3">
                  <p className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">Package</p>
                  <p className="text-sm font-medium">{data?.name ?? "-"}</p>
                </div>
              </div>

              <div className="h-px bg-border" />

              <div>
                <h4 className="mb-2 text-sm font-semibold text-muted-foreground">Conversion Details</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="mb-1 block">
                      Name <span className="text-destructive">*</span>
                    </Label>
                    <Input placeholder="Define a name for your converted package" value={name} onChange={(e) => setName(e.target.value)} />
                  </div>
                  <div>
                    <Label className="mb-1 block">Package ID</Label>
                    <Input placeholder="Package ID" value={advertisedId} onChange={(e) => setAdvertisedId(e.target.value)} />
                  </div>
                </div>

                <div className="mt-3">
                  {!isFloatingPackage ? (
                    <>
                      <p className="mb-2 text-sm text-muted-foreground">Amount To Convert</p>
                      <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
                        <table className="w-full text-sm">
                          <thead className="bg-muted/60">
                            <tr>
                              <th className="px-3 py-2 text-left font-medium">Name</th>
                              <th className="px-3 py-2 text-left font-medium">Qty</th>
                              <th className="px-3 py-2 text-left font-medium">Qty to Convert</th>
                            </tr>
                          </thead>
                          <tbody>
                            {storageLocationBreakdown.map((loc, i) => (
                              <tr
                                key={loc.id}
                                className={`shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] ${i % 2 === 1 ? "bg-stone-100 dark:bg-stone-800" : ""}`}
                              >
                                <td className="px-3 py-2">{loc.name}</td>
                                <td className="px-3 py-2 font-mono">{loc.derivedQuantity}</td>
                                <td className="px-3 py-2">
                                  <QuantityToConvertCell
                                    value={loc.quantityToConvert}
                                    max={loc.quantity}
                                    onChange={(val) => handleStorageQtyChange(loc.id, val)}
                                  />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  ) : (
                    <div>
                      <Label className="mb-1 block">Quantity To Convert</Label>
                      <Input type="number" value={regularFlatQty} onChange={(e) => setRegularFlatQty(e.target.value)} />
                    </div>
                  )}
                </div>
              </div>

              <div className="h-px bg-border" />

              <div>
                <h4 className="mb-2 text-sm font-semibold text-muted-foreground">Conversion Properties</h4>
                <label className="mb-3 flex items-center gap-2">
                  <Switch checked={keepSourceProperties} onCheckedChange={setKeepSourceProperties} />
                  <span className="text-sm font-medium">Keep Source Properties?</span>
                </label>

                {!keepSourceProperties && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="mb-1 block">
                        Unit Cost <span className="text-destructive">*</span>
                      </Label>
                      <Input type="number" value={unitCost} onChange={(e) => setUnitCost(e.target.value)} />
                    </div>
                    <div>
                      <Label className="mb-1 block">Unit Of Measurement (UoM)</Label>
                      <Select
                        items={regularUoms.map((u) => ({ value: u.id, label: u.name }))}
                        value={originalQuantityUomId || undefined}
                        onValueChange={setOriginalQuantityUomId}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select UOM for Original Quantity" />
                        </SelectTrigger>
                        <SelectContent>
                          {regularUoms.map((u) => (
                            <SelectItem key={u.id} value={u.id}>
                              {u.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="mb-1 block">Brand Name</Label>
                      <Input placeholder="Original Brand Name" value={originalBrandName} onChange={(e) => setOriginalBrandName(e.target.value)} />
                    </div>
                    <div>
                      <Label className="mb-1 block">Category</Label>
                      <Input placeholder="Original Category Name" value={originalCategoryName} onChange={(e) => setOriginalCategoryName(e.target.value)} />
                    </div>
                    <div>
                      <Label className="mb-1 block">Supplier ID</Label>
                      <Input placeholder="Original Supplier ID" value={originalSupplierId} onChange={(e) => setOriginalSupplierId(e.target.value)} />
                    </div>
                    <div>
                      <Label className="mb-1 block">External Batch ID</Label>
                      <Input placeholder="Provide your external batch ID" value={externalBatchId} onChange={(e) => setExternalBatchId(e.target.value)} />
                    </div>
                    <div>
                      <Label className="mb-1 block">Manufacturer SKU</Label>
                      <Input placeholder="SKU" value={manufacturerSKU} onChange={(e) => setManufacturerSKU(e.target.value)} />
                    </div>
                    <label className="flex items-center gap-2 self-end">
                      <Switch checked={isSample} onCheckedChange={setIsSample} />
                      <span className="text-sm font-medium">Is that sample?</span>
                    </label>
                  </div>
                )}
              </div>

              <div className="rounded-lg bg-sky-50 p-3 text-sky-800 ring-1 ring-sky-200 dark:bg-sky-950/30 dark:text-sky-400 dark:ring-sky-900">
                <p className="mb-1 text-sm font-semibold">Source package will be empty after this conversion</p>
                <p className="text-xs">
                  Upon completing this conversion, your source package will be zeroed out and finished.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border p-4">
          <Button variant="outline" onClick={handleClose} disabled={submitLoading}>
            Close
          </Button>
          <Button onClick={handleSubmit} disabled={submitLoading || initLoading}>
            {submitLoading ? "Saving..." : "Save & Convert"}
          </Button>
        </div>
      </div>
    </Drawer>
  );
}
