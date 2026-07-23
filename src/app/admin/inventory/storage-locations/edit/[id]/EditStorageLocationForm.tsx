"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { useShop } from "@/context/shop-context";
import { fetchSingleStorageLocation } from "@/services/storageLocations/getSingle";
import { updateStorageLocation } from "@/services/storageLocations/update";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import StorageLocationFormFields from "../../StorageLocationFormFields";

export default function EditStorageLocationForm({ locationId }) {
  const router = useRouter();
  const { shopId } = useShop();
  const [values, setValues] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!shopId || !locationId) return;
    (async () => {
      setLoading(true);
      try {
        const res = await fetchSingleStorageLocation(locationId, shopId);
        const location = res?.data?.data?.location;
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
      } catch (err) {
        toast.error(err?.message || "Failed to load storage location");
      } finally {
        setLoading(false);
      }
    })();
  }, [shopId, locationId]);

  const handleSave = async () => {
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
    } catch (err) {
      toast.error(err?.message || "Failed to submit your data");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !values) {
    return (
      <div className="flex flex-col gap-4 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-80 w-full max-w-xl" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Edit Storage Location</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push("/admin/inventory/storage-locations")}>
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
        <CardContent>
          <StorageLocationFormFields values={values} onChange={setValues} />
        </CardContent>
      </Card>
    </div>
  );
}
