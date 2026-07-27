"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { useShop } from "@/context/shop-context";
import { createStorageLocation } from "@/services/storageLocations/create";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import StorageLocationFormFields, { StorageLocationBase } from "../StorageLocationFormFields";

const initialValues: StorageLocationBase = {
  name: "",
  isSellableOnPhysicalStore: true,
  isSellableOnOnlineStore: true,
  isOpenForAcceptingTransfers: true,
  isOpenForAcceptingReturns: true,
};

export default function AddStorageLocationForm() {
  const router = useRouter();
  const { shopId } = useShop();
  const [values, setValues] = useState<StorageLocationBase>(initialValues);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!values.name.trim()) {
      toast.error("Please enter a location name");
      return;
    }
    setSaving(true);
    try {
      const res = await createStorageLocation({ ...values, shopId });
      if (res?.data?.success !== false) {
        toast.success("Storage location created successfully");
        router.push("/admin/inventory/storage-locations");
      }
    } catch (err: unknown) {
      toast.error((err as Error)?.message || "Failed to submit your data");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Add Storage Location</h1>
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
