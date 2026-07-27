"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { RefreshCw, X, PackageOpen } from "lucide-react";

import { useShop } from "@/context/shop-context";
import { fetchMetrcLocations, refreshMetrcLocations } from "@/services/packages/metrcLocations";
import { fetchMetrcUom } from "@/services/packages/metrcUom";
import { fetchAvailableMetrcPackageTags } from "@/services/packages/metrcTags";
import { fetchSinglePackage } from "@/services/packages/getSingle";
import { repackageMetrcPackages } from "@/services/packages/repackage";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import Drawer from "@/components/ui/Drawer";

import MetrcTagCombobox from "./MetrcTagCombobox";

interface StorageLocationRow {
  id: string;
  name: string;
  quantity: number;
  derivedQuantity: number;
  quantityToConvert: number;
}

interface PackageState {
  data: any;
  loading: boolean;
  convertWhole: boolean;
  flatQuantityToConvert: string;
  storageLocationBreakdown: StorageLocationRow[];
}

interface MetrcLocationOption {
  Id: string;
  Name: string;
}

function QtyCell({
  value,
  max,
  uomAbbr,
  onChange,
}: {
  value: number;
  max: number;
  uomAbbr: string;
  onChange: (value: number) => void;
}) {
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <div className="flex items-center gap-1.5">
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
              setError(`Cannot exceed ${max} ${uomAbbr}`.trim());
              return;
            }
            setError(null);
            onChange(Math.max(0, parsed));
          }}
          className="w-28"
        />
        {uomAbbr && <span className="text-xs text-muted-foreground">{uomAbbr}</span>}
      </div>
      {error && <div className="mt-1 text-xs text-destructive">{error}</div>}
    </div>
  );
}

function SectionHeader({ number, title, subtitle }: { number: number; title: string; subtitle?: string }) {
  return (
    <div className="mb-3">
      <div className="mb-1 flex items-center gap-2">
        <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
          {number}
        </div>
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      {subtitle && <p className="ml-8 text-xs text-muted-foreground">{subtitle}</p>}
    </div>
  );
}

export default function RepackageDrawer({
  open,
  onClose,
  selectedPackages,
  onRepackaged,
}: {
  open: boolean;
  onClose: () => void;
  selectedPackages: any[];
  onRepackaged: () => void;
}) {
  const { shopId } = useShop();

  const [packageStates, setPackageStates] = useState<Record<string, PackageState>>({});

  const [expectedQty, setExpectedQty] = useState("");
  const [uom, setUom] = useState<string | null>(null);
  const [newMetrcTag, setNewMetrcTag] = useState("");
  const [keepSourceProduct, setKeepSourceProduct] = useState(true);
  const [metrcProductName, setMetrcProductName] = useState("");
  const [metrcLocationId, setMetrcLocationId] = useState("");

  const [metrcUomList, setMetrcUomList] = useState<{ Name: string }[]>([]);
  const [metrcLocations, setMetrcLocations] = useState<MetrcLocationOption[]>([]);
  const [availableTags, setAvailableTags] = useState<any[]>([]);
  const [refreshingLocations, setRefreshingLocations] = useState(false);

  const [submitLoading, setSubmitLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // ── Load lookup data when drawer opens ──────────────────────────────────
  useEffect(() => {
    if (!open || !shopId) return;

    (async () => {
      try {
        const res = await fetchMetrcUom(shopId);
        setMetrcUomList(res?.data?.data?.uoms ?? res?.data?.uoms ?? []);
      } catch {
        // non-fatal
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

  // ── Load per-package detail when packages change ────────────────────────
  useEffect(() => {
    if (!open || !selectedPackages.length || !shopId) return;

    const init: Record<string, PackageState> = {};
    selectedPackages.forEach((row) => {
      init[row.id] = {
        data: null,
        loading: true,
        convertWhole: true,
        flatQuantityToConvert: "",
        storageLocationBreakdown: [],
      };
    });
    setPackageStates(init);

    selectedPackages.forEach(async (row) => {
      try {
        const res = await fetchSinglePackage(shopId, { id: row.id });
        const pkg = res?.data?.data?.package ?? res?.data?.package ?? null;
        const breakdown: StorageLocationRow[] = (pkg?.storageLocationBreakdown ?? []).map((loc: any) => ({
          id: loc.id,
          name: loc.name,
          quantity: loc.quantity,
          derivedQuantity: loc.quantity,
          quantityToConvert: 0,
        }));

        setPackageStates((prev) => ({
          ...prev,
          [row.id]: {
            ...prev[row.id],
            data: pkg,
            loading: false,
            storageLocationBreakdown: breakdown,
          },
        }));
      } catch {
        setPackageStates((prev) => ({
          ...prev,
          [row.id]: { ...prev[row.id], loading: false },
        }));
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, selectedPackages, shopId]);

  const updatePackageState = (id: string, patch: Partial<PackageState>) => {
    setPackageStates((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  };

  const updateStorageQty = (pkgId: string, locationId: string, value: number) => {
    setPackageStates((prev) => {
      const pkg = prev[pkgId];
      return {
        ...prev,
        [pkgId]: {
          ...pkg,
          storageLocationBreakdown: pkg.storageLocationBreakdown.map((loc) =>
            loc.id === locationId ? { ...loc, quantityToConvert: value, derivedQuantity: loc.quantity - value } : loc
          ),
        },
      };
    });
  };

  const tagOptions = (availableTags ?? []).map((tag: any) => ({
    value: tag.Label || tag.name || tag,
    label: tag.Label || tag.name || tag,
  }));

  // ── Validation — matches old RepackageDrawer.jsx `validate()` ───────────
  const validate = (): string[] => {
    const errors: string[] = [];

    if (!expectedQty || Number.isNaN(parseFloat(expectedQty))) {
      errors.push("Expected destination quantity is required");
    }
    if (!uom) errors.push("Destination UoM is required");
    if (!newMetrcTag?.trim()) errors.push("New Metrc Tag is required");

    if (!keepSourceProduct) {
      if (!metrcProductName) errors.push("Product selection is required when assigning new Metrc item");
      if (!metrcLocationId) errors.push("Location selection is required when assigning new Metrc item");
    }

    selectedPackages.forEach((row) => {
      const state = packageStates[row.id];
      if (!state || state.loading) return;

      if (!state.convertWhole) {
        const hasStorageLocs = state.storageLocationBreakdown.some((l) => l.quantity > 0);
        if (hasStorageLocs) {
          const hasQty = state.storageLocationBreakdown.some((l) => l.quantityToConvert > 0);
          if (!hasQty) {
            errors.push(`Package ${row.advertisedId}: at least one storage location must have quantity to convert`);
          }
        } else {
          const flat = parseFloat(state.flatQuantityToConvert);
          if (!state.flatQuantityToConvert || Number.isNaN(flat) || flat <= 0) {
            errors.push(`Package ${row.advertisedId}: quantity to convert must be greater than 0`);
          }
        }
      }
    });

    return errors;
  };

  const handleSubmitClick = () => {
    const errors = validate();
    if (errors.length > 0) {
      errors.forEach((e) => toast.error(e));
      return;
    }
    setConfirmOpen(true);
  };

  const performSubmit = async () => {
    if (!shopId) return;
    setSubmitLoading(true);
    try {
      const packagesToConvert = selectedPackages.map((row) => {
        const state = packageStates[row.id];
        const hasStorageLocs = state.storageLocationBreakdown.some((l) => l.quantity > 0);

        if (state.convertWhole) {
          return { sourcePackageId: row.id, shouldConvertWholePackage: true };
        }

        if (hasStorageLocs) {
          return {
            sourcePackageId: row.id,
            shouldConvertWholePackage: false,
            storageLocationBreakdown: state.storageLocationBreakdown
              .filter((l) => l.quantityToConvert > 0)
              .map((l) => ({ storageLocationId: l.id, quantityToConvert: l.quantityToConvert })),
          };
        }

        return {
          sourcePackageId: row.id,
          shouldConvertWholePackage: false,
          flatQuantityToConvert: parseFloat(state.flatQuantityToConvert),
        };
      });

      const payload: Record<string, any> = {
        shopId,
        packagesToConvert,
        expectedQuantityInDestination: parseFloat(expectedQty),
        destinationQTYMetrcUoM: uom,
        newMetrcTag: newMetrcTag.trim(),
        shouldKeepSourceMetrcProduct: keepSourceProduct,
        ...(keepSourceProduct
          ? {}
          : {
              metrcProductName,
              metrcLocationId,
            }),
      };

      await repackageMetrcPackages(payload);
      toast.success("Packages successfully repackaged");
      onRepackaged();
      handleClose();
    } catch (error: any) {
      toast.error(error?.message || "Failed to repackage packages. Please try again.");
    } finally {
      setSubmitLoading(false);
      setConfirmOpen(false);
    }
  };

  const handleClose = () => {
    if (submitLoading) return;
    setExpectedQty("");
    setUom(null);
    setNewMetrcTag("");
    setKeepSourceProduct(true);
    setMetrcProductName("");
    setMetrcLocationId("");
    setPackageStates({});
    onClose();
  };

  const allLoading = selectedPackages.some((r) => packageStates[r.id]?.loading);

  return (
    <>
      <Drawer open={open} onClose={handleClose} side="right" size="65%">
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-border p-4">
            <div className="flex items-center gap-2">
              <PackageOpen className="size-4.5 text-primary" />
              <h3 className="text-base font-semibold">Repackage METRC Packages</h3>
              <Badge variant="secondary">{selectedPackages.length} selected</Badge>
            </div>
            <Button variant="outline" size="icon" onClick={handleClose}>
              <X className="size-4" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <SectionHeader
              number={1}
              title="Select Convertable Quantity"
              subtitle="Specify how much of each package to include in the repackage"
            />

            {selectedPackages.length === 0 ? (
              <div className="py-4 text-center text-sm text-muted-foreground">No packages selected</div>
            ) : (
              <div className="mb-4 flex flex-col gap-3">
                {selectedPackages.map((row) => {
                  const state = packageStates[row.id];
                  if (!state) return null;
                  const { data, loading, convertWhole, storageLocationBreakdown, flatQuantityToConvert } = state;
                  const hasStorageLocs = storageLocationBreakdown.some((l) => l.quantity > 0);
                  const uomAbbr =
                    data?.metrcData?.snapShotData?.metrcSnapshotData?.UnitOfMeasureAbbreviation ||
                    row?.uoMShortForm ||
                    "";
                  const metrcTag = data?.metrcData?.metrcTag || row?.metrcTag || "N/A";

                  return (
                    <div key={row.id} className="rounded-xl bg-muted/30 p-4 ring-1 ring-foreground/10">
                      <div className="mb-3 flex items-start justify-between">
                        <div className="flex flex-col gap-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                              Package ID
                            </span>
                            <span className="font-mono font-semibold text-primary">{row.advertisedId}</span>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                              Metrc Tag
                            </span>
                            <Badge variant="outline" className="font-mono">
                              {metrcTag}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="mb-0.5 text-xs text-muted-foreground">Total Qty</div>
                          <div className="text-lg font-bold">
                            {row.quantityLeft ?? data?.quantityLeft ?? 0}{" "}
                            <span className="text-sm font-normal text-muted-foreground">{uomAbbr}</span>
                          </div>
                        </div>
                      </div>

                      {loading ? (
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-full" />
                          <Skeleton className="h-4 w-2/3" />
                        </div>
                      ) : (
                        <>
                          <div
                            className={`mb-3 flex items-center gap-2.5 rounded-lg p-2.5 ${
                              convertWhole
                                ? "bg-green-50 ring-1 ring-green-200 dark:bg-green-950/30 dark:ring-green-900"
                                : "bg-amber-50 ring-1 ring-amber-200 dark:bg-amber-950/30 dark:ring-amber-900"
                            }`}
                          >
                            <Switch
                              checked={convertWhole}
                              onCheckedChange={(val) => updatePackageState(row.id, { convertWhole: val })}
                              size="sm"
                            />
                            <span className="text-sm font-medium">
                              Convert whole package{" "}
                              <span
                                className={
                                  convertWhole
                                    ? "text-green-700 dark:text-green-400"
                                    : "text-amber-700 dark:text-amber-400"
                                }
                              >
                                ({convertWhole ? "Yes — entire package will be converted" : "No — specify quantity below"})
                              </span>
                            </span>
                          </div>

                          {!convertWhole && (
                            <div>
                              {hasStorageLocs ? (
                                <div className="overflow-hidden rounded-lg ring-1 ring-foreground/10">
                                  <table className="w-full text-sm">
                                    <thead className="bg-muted/60">
                                      <tr>
                                        <th className="px-3 py-1.5 text-left font-medium">Location</th>
                                        <th className="px-3 py-1.5 text-center font-medium">Available</th>
                                        <th className="px-3 py-1.5 text-center font-medium">Convert Qty</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {storageLocationBreakdown
                                        .filter((loc) => loc.quantity > 0)
                                        .map((loc, i) => (
                                          <tr
                                            key={loc.id}
                                            className={`shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] ${i % 2 === 1 ? "bg-stone-100 dark:bg-stone-800" : ""}`}
                                          >
                                            <td className="px-3 py-1.5 font-medium">{loc.name}</td>
                                            <td className="px-3 py-1.5 text-center text-muted-foreground">
                                              {loc.quantity} <span className="text-xs">{uomAbbr}</span>
                                            </td>
                                            <td className="px-3 py-1.5 text-center">
                                              <QtyCell
                                                value={loc.quantityToConvert}
                                                max={loc.quantity}
                                                uomAbbr={uomAbbr}
                                                onChange={(val) => updateStorageQty(row.id, loc.id, val)}
                                              />
                                            </td>
                                          </tr>
                                        ))}
                                    </tbody>
                                  </table>
                                </div>
                              ) : (
                                <div className="flex items-center gap-3">
                                  <span className="text-sm whitespace-nowrap text-muted-foreground">
                                    Quantity to Convert:
                                  </span>
                                  <Input
                                    type="number"
                                    min={0}
                                    max={row.quantityLeft ?? data?.quantityLeft ?? undefined}
                                    value={flatQuantityToConvert}
                                    placeholder="Enter qty"
                                    className="w-40"
                                    onChange={(e) => updatePackageState(row.id, { flatQuantityToConvert: e.target.value })}
                                  />
                                  {uomAbbr && <span className="text-xs text-muted-foreground">{uomAbbr}</span>}
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="my-4 h-px bg-border" />

            <SectionHeader
              number={2}
              title="Destination Details"
              subtitle="Configure the destination package that will be created"
            />

            <div className="mb-4">
              <Label className="mb-1 block">Destination Quantity &amp; Unit</Label>
              <div className="flex gap-2">
                <Input
                  className="w-3/5"
                  placeholder="Expected Quantity"
                  type="number"
                  value={expectedQty}
                  onChange={(e) => setExpectedQty(e.target.value)}
                />
                <Select items={metrcUomList.map((u) => ({ value: u.Name, label: u.Name }))} value={uom ?? undefined} onValueChange={setUom}>
                  <SelectTrigger className="w-2/5">
                    <SelectValue placeholder="Select UoM" />
                  </SelectTrigger>
                  <SelectContent>
                    {metrcUomList.map((item) => (
                      <SelectItem key={item.Name} value={item.Name}>
                        {item.Name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mb-4">
              <Label className="mb-1 block">
                New Metrc Tag <span className="text-destructive">*</span>
              </Label>
              <MetrcTagCombobox value={newMetrcTag} onChange={setNewMetrcTag} options={tagOptions} />
            </div>

            <div className="rounded-xl bg-muted/30 p-4 ring-1 ring-foreground/10">
              <label className="flex items-center gap-2">
                <Checkbox
                  checked={keepSourceProduct}
                  onCheckedChange={(checked) => {
                    const isChecked = checked === true;
                    setKeepSourceProduct(isChecked);
                    if (isChecked) {
                      setMetrcProductName("");
                      setMetrcLocationId("");
                    }
                  }}
                />
                <span className="text-sm font-medium">Keep source Metrc product &amp; location</span>
              </label>
              <div className="mt-1 ml-6 text-xs text-muted-foreground">
                Uncheck to assign a different Metrc item and location for the destination package
              </div>

              {!keepSourceProduct && (
                <div className="mt-4 flex flex-col gap-3">
                  <div>
                    <Label className="mb-1 block">
                      Metrc Product <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      placeholder="Metrc product name"
                      value={metrcProductName}
                      onChange={(e) => setMetrcProductName(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="mb-1 block">
                      Metrc Location <span className="text-destructive">*</span>
                    </Label>
                    <div className="flex items-center gap-2">
                      <Select
                        items={metrcLocations.map((l) => ({ value: l.Id, label: l.Name }))}
                        value={metrcLocationId || undefined}
                        onValueChange={setMetrcLocationId}
                      >
                        <SelectTrigger className="flex-1">
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
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={handleRefreshLocations}
                        disabled={refreshingLocations}
                        title="Refresh locations"
                      >
                        <RefreshCw className={`size-4 ${refreshingLocations ? "animate-spin" : ""}`} />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 rounded-lg bg-sky-50 p-3 text-sm text-sky-800 ring-1 ring-sky-200 dark:bg-sky-950/30 dark:text-sky-400 dark:ring-sky-900">
              <strong>Note:</strong> Source packages will be partially or fully zeroed out based on the quantities
              specified above. A new destination package will be created with the combined quantity.
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-border p-4">
            <Button variant="outline" onClick={handleClose} disabled={submitLoading}>
              Cancel
            </Button>
            <Button onClick={handleSubmitClick} disabled={submitLoading || allLoading}>
              {submitLoading ? "Repackaging..." : "Confirm Repackage"}
            </Button>
          </div>
        </div>
      </Drawer>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Repackage</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to repackage {selectedPackages.length} package{selectedPackages.length > 1 ? "s" : ""}.
              Source packages will be partially or fully zeroed out. This action cannot be undone. Proceed?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitLoading}>No, Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={performSubmit} disabled={submitLoading}>
              {submitLoading ? "Repackaging..." : "Yes, Repackage"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
