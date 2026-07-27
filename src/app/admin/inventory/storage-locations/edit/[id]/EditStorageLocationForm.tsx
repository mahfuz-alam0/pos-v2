"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { useShop } from "@/context/shop-context";
import { fetchSingleStorageLocation } from "@/services/storageLocations/getSingle";
import { fetchStorageLocations } from "@/services/storageLocations/list";
import { updateStorageLocation } from "@/services/storageLocations/update";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import StorageLocationFormFields, { StorageLocationBase } from "../../StorageLocationFormFields";

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

export default function EditStorageLocationForm({ locationId }: { locationId: string }) {
  const router = useRouter();
  const { shopId } = useShop();
  const [values, setValues] = useState<FormValues | null>(null);
  const [originalFlags, setOriginalFlags] = useState<OriginalFlags | null>(null);
  const [otherLocations, setOtherLocations] = useState<LocationOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!shopId || !locationId) return;
    (async () => {
      setLoading(true);
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
  }, [shopId, locationId]);

  const handleSave = async () => {
    if (!values) return;
    if (!values.name.trim()) {
      toast.error("Please enter a location name");
      return;
    }
    setSaving(true);
    try {
      const res = await updateStorageLocation(locationId, { ...values, shopId });
      if (res?.data?.success !== false) {
        toast.success("Storage location updated successfully");
        router.push("/admin/inventory/storage-locations");
      }
    } catch (err: unknown) {
      toast.error((err as Error)?.message || "Failed to submit your data");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !values || !originalFlags) {
    return (
      <div className="flex flex-col gap-4 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-80 w-full max-w-xl" />
      </div>
    );
  }

  // Show a fallback select when a flag was originally true and is now being turned off
  const showTransfersFallback =
    originalFlags.openForAcceptingTransfers && !values.isOpenForAcceptingTransfers;
  const showReturnsFallback =
    originalFlags.isOpenForAcceptingReturns && !values.isOpenForAcceptingReturns;
  const showPhysicalFallback =
    originalFlags.isSellableOnPhysicalStore && !values.isSellableOnPhysicalStore;

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Edit Storage Location</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.push("/admin/inventory/storage-locations")}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Location Details</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
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
        </CardContent>
      </Card>
    </div>
  );
}
