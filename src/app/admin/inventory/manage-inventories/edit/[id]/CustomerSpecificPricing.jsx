"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ChevronDown, ChevronRight } from "lucide-react";

import { fetchCustomerGroups } from "@/services/customerGroups/list";
import { Card, CardContent } from "@/components/ui/card";

import GeneralPricingType from "./GeneralPricingType";

export default function CustomerSpecificPricing({
  data,
  shopId,
  inventoryId,
  uomData,
  editMode = false,
  targetUoMId,
  inventoryData,
  onSaveSuccess,
}) {
  const [customerGroups, setCustomerGroups] = useState([]);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    fetchCustomerGroups({ limit: 100, page: 1 })
      .then((res) => setCustomerGroups(res?.data?.data?.customerGroups ?? []))
      .catch(() => toast.error("Failed to load customer groups"));
  }, []);

  if (!customerGroups.length) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-2 text-muted-foreground">
        <p className="text-base font-light">No customer groups available</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-base">Edit pricing settings for each customer group</p>
      {customerGroups.map((group) => {
        const isExpanded = expandedId === group.id;
        return (
          <Card key={group.id}>
            <button
              type="button"
              className="flex w-full items-center gap-2 p-4 text-left font-medium"
              onClick={() => setExpandedId(isExpanded ? null : group.id)}
            >
              {isExpanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
              {group.name}
            </button>
            {isExpanded && (
              <CardContent className="border-t pt-4">
                <GeneralPricingType
                  data={data}
                  shopId={shopId}
                  inventoryId={inventoryId}
                  editMode={editMode}
                  uomData={uomData}
                  isCustomerGroupPricing
                  customerGroupId={group.id}
                  targetUoMId={targetUoMId}
                  inventoryData={inventoryData}
                  onSaveSuccess={onSaveSuccess}
                />
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}
