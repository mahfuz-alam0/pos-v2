"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { fetchAssociatedUoms } from "@/services/uom/listAssociated";
import { Skeleton } from "@/components/ui/skeleton";

import GeneralPricingType from "./GeneralPricingType";
import CustomerSpecificPricing from "./CustomerSpecificPricing";

const TABS = [
  { label: "General Pricing Details", value: "general" },
  { label: "Customer group pricing", value: "customerGroup" },
];

export default function PricingDetails({
  inventoryId,
  shopId,
  editMode,
  inventoryData,
  sellableUoMId,
  onSaveSuccess,
}) {
  const [selectedTab, setSelectedTab] = useState("general");
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
      <div className="flex h-[300px] w-full items-center justify-center">
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const commonProps = {
    data: inventoryData?.pricingInfo,
    shopId,
    inventoryId,
    editMode,
    uomData,
    targetUoMId,
    inventoryData,
    onSaveSuccess,
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-4">
        {TABS.map((tab) => (
          <label key={tab.value} className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              checked={selectedTab === tab.value}
              onChange={() => setSelectedTab(tab.value)}
            />
            {tab.label}
          </label>
        ))}
      </div>

      {selectedTab === "general" ? (
        <GeneralPricingType {...commonProps} />
      ) : (
        <CustomerSpecificPricing {...commonProps} isCustomerGroupPricing />
      )}
    </div>
  );
}
