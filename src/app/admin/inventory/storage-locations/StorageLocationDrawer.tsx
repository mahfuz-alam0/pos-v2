"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { MapPin, X } from "lucide-react";

import { useShop } from "@/context/shop-context";
import { createStorageLocation } from "@/services/storageLocations/create";
import { updateStorageLocation } from "@/services/storageLocations/update";
import { fetchSingleStorageLocation } from "@/services/storageLocations/getSingle";
import { fetchStorageLocations } from "@/services/storageLocations/list";

import Drawer from "@/components/ui/Drawer";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import StorageLocationFormFields, { StorageLocationBase } from "./StorageLocationFormFields";

const EMPTY_VALUES: StorageLocationBase = {
  name: "",
  isSellableOnPhysicalStore: true,
  isSellableOnOnlineStore: true,
  isOpenForAcceptingTransfers: true,
  isOpenForAcceptingReturns: true,
};

interface FormValues extends StorageLocationBase {
  storageLocationForAcceptingTransfers?: string;
  storageLocationOpenForAcceptingReturns?: string;
  storageLocationForMarkingAsSellable?: string;
}

interface OriginalFlags {
  openForAcceptingTransfers: boolean;
  isOpenForAcceptingReturns: boolean;
  isSellableOnPhysicalStore: boolean;
}

interface LocationOption {
  id: string | number;
  name: string;
}

interface StorageLocationDrawerProps {
  open: boolean;
  mode: "add" | "edit";
  locationId?: string | number | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function StorageLocationDrawer({
  open,
  mode,
  locationId,
  onClose,
  onSaved,
}: StorageLocationDrawerProps) {
  const { shopId } = useShop();

  const [values, setValues] = useState<FormValues>(EMPTY_VALUES);
  const [originalFlags, setOriginalFlags] = useState<OriginalFlags | null>(null);
  const [otherLocations, setOtherLocations] = useState<LocationOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;

    if (mode === "add") {
      setValues(EMPTY_VALUES);
      setOriginalFlags(null);
      setOtherLocations([]);
      return;
    }

    if (mode === "edit" && locationId && shopId) {
      setLoading(true);
      (async () => {
        try {
          const [singleRes, listRes] = await Promise.all([
            fetchSingleStorageLocation(locationId, shopId),
            fetchStorageLocations(shopId),
          ]);

          const location = singleRes?.data?.data?.location;
          if (!location) {
            toast.error("Storage location not found");
            return;
          }

          setValues({
            name: location.name,
            isSellableOnPhysicalStore: !!location.isSellableOnPhysicalStore,
            isSellableOnOnlineStore: !!location.isSellableOnOnlineStore,
            isOpenForAcceptingTransfers: !!location.openForAcceptingTransfers,
            isOpenForAcceptingReturns: !!location.isOpenForAcceptingReturns,
          });

          setOriginalFlags({
            openForAcceptingTransfers: !!location.openForAcceptingTransfers,
            isOpenForAcceptingReturns: !!location.isOpenForAcceptingReturns,
            isSellableOnPhysicalStore: !!location.isSellableOnPhysicalStore,
          });

          const allLocations: LocationOption[] = listRes?.data?.data?.locations ?? [];
          setOtherLocations(
            allLocations.filter((loc) => String(loc.id) !== String(locationId))
          );
        } catch (err: unknown) {
          toast.error((err as Error)?.message || "Failed to load storage location");
        } finally {
          setLoading(false);
        }
      })();
    }
  }, [open, mode, locationId, shopId]);

  const handleSave = async () => {
    if (!values.name.trim()) {
      toast.error("Please enter a location name");
      return;
    }
    setSaving(true);
    try {
      if (mode === "add") {
        const res = await createStorageLocation({ ...values, shopId });
        if (res?.data?.success === false) return;
        toast.success("Storage location created successfully");
      } else {
        const res = await updateStorageLocation(locationId, { ...values, shopId });
        if (res?.data?.success === false) return;
        toast.success("Storage location updated successfully");
      }
      onSaved();
      onClose();
    } catch (err: unknown) {
      toast.error((err as Error)?.message || "Failed to submit your data");
    } finally {
      setSaving(false);
    }
  };

  const showTransfersFallback =
    mode === "edit" &&
    originalFlags?.openForAcceptingTransfers &&
    !values.isOpenForAcceptingTransfers;
  const showReturnsFallback =
    mode === "edit" &&
    originalFlags?.isOpenForAcceptingReturns &&
    !values.isOpenForAcceptingReturns;
  const showPhysicalFallback =
    mode === "edit" &&
    originalFlags?.isSellableOnPhysicalStore &&
    !values.isSellableOnPhysicalStore;

  return (
    <Drawer open={open} onClose={saving ? undefined : onClose} side="right" size={440}>
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-3 px-5 py-4 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)]">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <MapPin className="size-4 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-base font-semibold leading-tight">
              {mode === "add" ? "Add Storage Location" : "Edit Storage Location"}
            </div>
            <div className="text-xs text-muted-foreground leading-tight">
              {mode === "add" ? "Create a new storage location" : "Update location details"}
            </div>
          </div>
          <Button variant="outline" size="icon-sm" onClick={onClose} disabled={saving}>
            <X className="size-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="flex flex-col gap-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-11 w-full" />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <StorageLocationFormFields
                values={values}
                onChange={(base) => setValues((prev) => ({ ...prev, ...base }))}
              />

              {showTransfersFallback && (
                <div className="flex flex-col gap-1.5">
                  <Label>Storage Location For Accepting Transfers</Label>
                  <Select
                    value={values.storageLocationForAcceptingTransfers ?? ""}
                    onValueChange={(val) =>
                      setValues({ ...values, storageLocationForAcceptingTransfers: val })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a storage location" />
                    </SelectTrigger>
                    <SelectContent>
                      {otherLocations.map((loc) => (
                        <SelectItem key={loc.id} value={String(loc.id)}>
                          {loc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {showReturnsFallback && (
                <div className="flex flex-col gap-1.5">
                  <Label>Storage Location For Accepting Returns</Label>
                  <Select
                    value={values.storageLocationOpenForAcceptingReturns ?? ""}
                    onValueChange={(val) =>
                      setValues({ ...values, storageLocationOpenForAcceptingReturns: val })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a storage location" />
                    </SelectTrigger>
                    <SelectContent>
                      {otherLocations.map((loc) => (
                        <SelectItem key={loc.id} value={String(loc.id)}>
                          {loc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {showPhysicalFallback && (
                <div className="flex flex-col gap-1.5">
                  <Label>Storage Location For Marking As Sellable</Label>
                  <Select
                    value={values.storageLocationForMarkingAsSellable ?? ""}
                    onValueChange={(val) =>
                      setValues({ ...values, storageLocationForMarkingAsSellable: val })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a storage location" />
                    </SelectTrigger>
                    <SelectContent>
                      {otherLocations.map((loc) => (
                        <SelectItem key={loc.id} value={String(loc.id)}>
                          {loc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 shadow-[inset_0_1px_0_rgba(0,0,0,0.06)]">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>
    </Drawer>
  );
}
