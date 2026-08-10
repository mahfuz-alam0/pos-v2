"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ExternalLink, Package } from "lucide-react";

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
      <div className="flex h-75 w-full items-center justify-center">
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
      <div className="flex w-full overflow-hidden rounded-lg border border-gray-200 text-sm font-medium">
        {TABS.map((tab, idx) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setSelectedTab(tab.value)}
            className={`flex-1 py-2.5 text-center transition-colors ${idx === 0 ? "border-r border-gray-200" : ""} ${
              selectedTab === tab.value ? "bg-gray-100 text-foreground" : "bg-white text-muted-foreground hover:bg-gray-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <p className="text-sm font-semibold">Pricing Details</p>

      <div className="flex items-center gap-3 rounded-lg border border-gray-200 p-4">
        <div className="flex size-9 items-center justify-center rounded-md border border-gray-200 text-muted-foreground">
          <Package className="size-4" />
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-medium text-muted-foreground">PRODUCT NAME</span>
          <Link
            href={`/catalog/products?id=${inventoryData?.productId}`}
            className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            {inventoryData?.productName}
            <ExternalLink className="size-3.5" />
          </Link>
        </div>
      </div>

      {selectedTab === "general" ? (
        <GeneralPricingType {...commonProps} />
      ) : (
        <CustomerSpecificPricing {...commonProps} isCustomerGroupPricing />
      )}
    </div>
  );
}
