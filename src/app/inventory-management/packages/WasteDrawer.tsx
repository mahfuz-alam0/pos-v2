"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { RefreshCw, TriangleAlert, X } from "lucide-react";

import { useShop } from "@/context/shop-context";
import { fetchMetrcLocations, refreshMetrcLocations } from "@/services/packages/metrcLocations";
import { fetchAvailableMetrcPackageTags } from "@/services/packages/metrcTags";
import { fetchMetrcPackagesSyncStatus } from "@/services/packages/metrcSyncStatus";
import { convertPackagesToWaste } from "@/services/packages/convertToWaste";
import { fetchSinglePackage } from "@/services/packages/getSingle";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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

interface MetrcLocationOption {
  Id: string;
  Name: string;
}

export default function WasteDrawer({
  open,
  onClose,
  selectedPackages,
  onWasted,
}: {
  open: boolean;
  onClose: () => void;
  selectedPackages: any[];
  onWasted: () => void;
}) {
  const { shopId } = useShop();

  const [availableTags, setAvailableTags] = useState<any[]>([]);
  const [metrcLocations, setMetrcLocations] = useState<MetrcLocationOption[]>([]);
  const [metrcTag, setMetrcTag] = useState("");
  const [selectedLocationName, setSelectedLocationName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [refreshingLocations, setRefreshingLocations] = useState(false);
  const [shouldCreateNewPackage, setShouldCreateNewPackage] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // ── Compliance guard: block the whole action if METRC sync is stale ────
  // isSyncStale defaults to true (fail closed) until we get a confirmed
  // fresh sync timestamp back — matches old WasteDrawer.jsx behavior where
  // any failure to determine sync freshness also results in isSyncStale=true.
  const [isSyncStale, setIsSyncStale] = useState(true);
  const [syncCheckLoading, setSyncCheckLoading] = useState(false);

  useEffect(() => {
    if (!open || !shopId) return;

    (async () => {
      try {
        const res = await fetchAvailableMetrcPackageTags(shopId);
        setAvailableTags(res?.data?.data?.tags ?? res?.data?.tags ?? []);
      } catch {
        // non-fatal
      }
    })();

    loadLocations();
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

  // Pre-fill location from the first selected package's current METRC location.
  // List rows don't carry metrcData, so re-fetch the full package detail first —
  // matches old WasteDrawer.jsx's GetSinglePackage prefetch (lines 56-85).
  useEffect(() => {
    if (!open || !selectedPackages?.length || selectedLocationName || !shopId) return;
    const firstItem = selectedPackages[0];
    const packageId = firstItem?.id;
    if (!packageId) return;

    fetchSinglePackage(shopId, { id: packageId })
      .then((res) => {
        const packageData = res?.data?.data?.package ?? res?.data?.data;
        const locationName = packageData?.metrcData?.snapShotData?.metrcSnapshotData?.LocationName;
        if (locationName) setSelectedLocationName(locationName);
      })
      .catch(() => {
        // non-fatal — user can still pick a location manually
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, selectedPackages, shopId]);

  // ── Sync staleness check — compliance guard, must not be diluted ───────
  useEffect(() => {
    if (!open || !shopId) return;

    const checkSyncStatus = async () => {
      setSyncCheckLoading(true);
      try {
        const res = await fetchMetrcPackagesSyncStatus(shopId);
        const lastSynced = res?.data?.data?.lastSynced;
        if (!lastSynced) {
          setIsSyncStale(true);
          return;
        }
        const diffMs = Date.now() - new Date(lastSynced).getTime();
        const diffHours = diffMs / (1000 * 60 * 60);
        setIsSyncStale(diffHours > 24);
      } catch {
        setIsSyncStale(true);
      } finally {
        setSyncCheckLoading(false);
      }
    };

    checkSyncStatus();
  }, [open, shopId]);

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

  const handleClose = () => {
    if (isSaving) return;
    setMetrcTag("");
    setSelectedLocationName("");
    setShouldCreateNewPackage(true);
    onClose();
  };

  const handleSaveClick = () => {
    if (isSyncStale || syncCheckLoading) {
      toast.error("Please sync METRC packages before proceeding");
      return;
    }

    const packageIds = selectedPackages.map((item) => item?.id).filter(Boolean);
    if (packageIds.length === 0) {
      toast.error("No packages selected");
      return;
    }

    if (!metrcTag || !selectedLocationName) {
      toast.error("Metrc Tag and Metrc Location are required");
      return;
    }

    setConfirmOpen(true);
  };

  const performSave = async () => {
    if (!shopId) return;
    const packageIds = selectedPackages.map((item) => item?.id).filter(Boolean);

    setIsSaving(true);
    try {
      await convertPackagesToWaste({
        packageIds,
        newMetrcTag: metrcTag,
        metrcLocationName: selectedLocationName,
        shopId,
        shouldCreateNewPackage,
      });
      toast.success("Packages converted to waste");
      onWasted();
      handleClose();
    } catch (error: any) {
      toast.error(error?.message || "Failed to convert packages to waste");
    } finally {
      setIsSaving(false);
      setConfirmOpen(false);
    }
  };

  return (
    <>
      <Drawer open={open} onClose={handleClose} side="right" size={700}>
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-border p-4">
            <div>
              <h3 className="text-base font-semibold">Assign New Waste Tag</h3>
              <p className="text-xs text-muted-foreground">{selectedPackages.length} selected</p>
            </div>
            <Button variant="outline" size="icon" onClick={handleClose} disabled={isSaving}>
              <X className="size-4" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {isSyncStale ? (
              // Compliance guard: METRC sync stale by more than 24h (or the
              // freshness check failed/could not be confirmed) — block the
              // entire waste action. Do not render the form in this state.
              <div className="flex flex-col items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-destructive dark:border-destructive/50">
                <div className="flex items-center gap-2 font-semibold">
                  <TriangleAlert className="size-4.5" />
                  METRC sync is stale
                </div>
                <p className="text-sm">
                  {syncCheckLoading
                    ? "Checking METRC sync status..."
                    : "This action is only available when Metrc package data is up to date (synced within the last 24 hours). Please perform a Metrc sync first, then reopen this drawer."}
                </p>
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <label className="mb-2 block text-xs font-semibold text-muted-foreground">Package Option</label>
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => setShouldCreateNewPackage(true)}
                      className={`rounded-lg p-3 text-left ring-1 transition-colors ${
                        shouldCreateNewPackage
                          ? "bg-primary/10 ring-primary"
                          : "ring-foreground/10 hover:bg-muted"
                      }`}
                    >
                      <span className="block text-sm font-medium">Create New Package</span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        A new waste package will be created in the system with the new METRC tag.
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShouldCreateNewPackage(false)}
                      className={`rounded-lg p-3 text-left ring-1 transition-colors ${
                        !shouldCreateNewPackage
                          ? "bg-primary/10 ring-primary"
                          : "ring-foreground/10 hover:bg-muted"
                      }`}
                    >
                      <span className="block text-sm font-medium">Use Existing Package</span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        The current package ID will be used, but the underlying METRC information will be changed to
                        the corresponding new METRC tag.
                      </span>
                    </button>
                  </div>
                </div>

                <div className="mb-4 flex flex-col gap-4">
                  <div>
                    <Label className="mb-1 block">
                      Metrc Tag <span className="text-destructive">*</span>
                    </Label>
                    <MetrcTagCombobox value={metrcTag} onChange={setMetrcTag} options={tagOptions} />
                  </div>
                  <div>
                    <div className="mb-1 flex items-center justify-between">
                      <Label>
                        Select METRC Location <span className="text-destructive">*</span>
                      </Label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRefreshLocations}
                        disabled={refreshingLocations}
                      >
                        <RefreshCw className={`size-3.5 ${refreshingLocations ? "animate-spin" : ""}`} />
                        Refresh Locations
                      </Button>
                    </div>
                    <Select
                      items={metrcLocations.map((l) => ({ value: l.Name, label: l.Name }))}
                      value={selectedLocationName || undefined}
                      onValueChange={setSelectedLocationName}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Choose Location" />
                      </SelectTrigger>
                      <SelectContent>
                        {metrcLocations.map((location) => (
                          <SelectItem key={location.Id} value={location.Name}>
                            {location.Name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/60">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium">Package ID</th>
                        <th className="px-3 py-2 text-left font-medium">Name</th>
                        <th className="px-3 py-2 text-center font-medium">Qty Left</th>
                        <th className="px-3 py-2 text-left font-medium">Metrc ID</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedPackages.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">
                            No packages selected
                          </td>
                        </tr>
                      )}
                      {selectedPackages.map((record, i) => (
                        <tr
                          key={record?.id ?? record?.advertisedId ?? i}
                          className={`shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] ${i % 2 === 1 ? "bg-stone-100 dark:bg-stone-800" : ""}`}
                        >
                          <td className="px-3 py-2 font-mono">{record?.advertisedId || "-"}</td>
                          <td className="px-3 py-2">{record?.name || "-"}</td>
                          <td className="px-3 py-2 text-center">
                            {record?.quantityLeft != null ? `${record.quantityLeft} ${record?.uoMShortForm || ""}`.trim() : "-"}
                          </td>
                          <td className="px-3 py-2">{record?.metrcData?.metrcId || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-border p-4">
            <Button variant="outline" onClick={handleClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSaveClick} disabled={isSyncStale || syncCheckLoading || isSaving}>
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </Drawer>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>The operation cannot be rolled back.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSaving}>No</AlertDialogCancel>
            <AlertDialogAction onClick={performSave} disabled={isSaving}>
              {isSaving ? "Saving..." : "Yes"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
