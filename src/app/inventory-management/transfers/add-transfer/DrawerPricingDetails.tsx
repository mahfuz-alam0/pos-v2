"use client";

// Fork of manage-inventories/edit/[id]/PricingDetails.tsx for the "Assign
// Product to Package" drawer: always renders general pricing, no
// General/Customer-group tab toggle. Kept separate so the real Manage
// Inventories edit page is unaffected.

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { fetchAssociatedUoms } from "@/services/uom/listAssociated";
import { Skeleton } from "@/components/ui/skeleton";

import DrawerGeneralPricingType from "./DrawerGeneralPricingType";

export default function DrawerPricingDetails({
  inventoryId,
  shopId,
  editMode,
  inventoryData,
  sellableUoMId,
  onSaveSuccess,
}) {
  const [uomData, setUomData] = useState([]);
  const [uomLoading, setUomLoading] = useState(false);

  const targetUoMId = sellableUoMId || inventoryData?.sellableUoMId;

  useEffect(() => {
    if (!targetUoMId) return;
    setUomLoading(true);
    fetchAssociatedUoms(targetUoMId, { page: 1, limit: 1 })
      .then((res) => setUomData(res?.data?.data?.uoms ?? []))
      .catch(() => toast.error("Failed to fetch associated units of measurement"))
      .finally(() => setUomLoading(false));
  }, [targetUoMId]);

  if (uomLoading) {
    return (
      <div className="flex h-75 w-full items-center justify-center">
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border p-5">
      <DrawerGeneralPricingType
        data={inventoryData?.pricingInfo}
        shopId={shopId}
        inventoryId={inventoryId}
        editMode={editMode}
        uomData={uomData}
        targetUoMId={targetUoMId}
        inventoryData={inventoryData}
        onSaveSuccess={onSaveSuccess}
      />
    </div>
  );
}
