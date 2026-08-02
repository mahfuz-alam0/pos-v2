"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";

import { fetchSingleStorageLocation } from "@/services/storageLocations/getSingle";
import { useShop } from "@/context/shop-context";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex w-full items-start justify-between gap-4 py-3 border-b border-foreground/8 last:border-b-0">
      <span className="text-sm font-semibold text-foreground w-[55%]">{label}</span>
      <span className="text-sm text-right w-[45%]">{value}</span>
    </div>
  );
}

function YesNoBadge({ value }: { value: boolean }) {
  return (
    <Badge variant={value ? "default" : "secondary"}>
      {value ? "Yes" : "No"}
    </Badge>
  );
}

interface StorageLocationDetailsProps {
  locationId: string;
  onClose: () => void;
}

export default function StorageLocationDetails({ locationId, onClose }: StorageLocationDetailsProps) {
  const { shopId } = useShop();
  const [data, setData] = useState<{
    name: string;
    openForAcceptingTransfers: boolean;
    isSellableOnPhysicalStore: boolean;
    isSellableOnOnlineStore: boolean;
    isOpenForAcceptingReturns: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!locationId) return;
    (async () => {
      setLoading(true);
      try {
        const res = await fetchSingleStorageLocation(locationId, shopId);
        const loc = res?.data?.data?.location;
        if (loc) {
          setData({
            name: loc.name,
            openForAcceptingTransfers: !!loc.openForAcceptingTransfers,
            isSellableOnPhysicalStore: !!loc.isSellableOnPhysicalStore,
            isSellableOnOnlineStore: !!loc.isSellableOnOnlineStore,
            isOpenForAcceptingReturns: !!loc.isOpenForAcceptingReturns,
          });
        }
      } catch {
        toast.error("Failed to load storage location");
      } finally {
        setLoading(false);
      }
    })();
  }, [locationId, shopId]);

  return (
    <div className="flex w-1/3 shrink-0 flex-col overflow-hidden rounded-xl ring-1 ring-foreground/10">
      <div className="flex items-center justify-between border-b border-foreground/10 px-4 py-3">
        <h2 className="text-sm font-semibold">Storage Location Details</h2>
        <Button variant="outline" size="icon" onClick={onClose} className="h-7 w-7 shrink-0">
          <X className="size-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4 pt-2">
        {loading ? (
          <div className="flex flex-col gap-3 pt-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-5 w-full" />
            ))}
          </div>
        ) : data ? (
          <div className="flex flex-col">
            <DetailRow label="Location Name" value={<span className="font-medium">{data.name}</span>} />
            <DetailRow label="Default Package Destination" value={<YesNoBadge value={data.openForAcceptingTransfers} />} />
            <DetailRow label="Sellable On Physical Store" value={<YesNoBadge value={data.isSellableOnPhysicalStore} />} />
            <DetailRow label="Sellable On Online Store" value={<YesNoBadge value={data.isSellableOnOnlineStore} />} />
            <DetailRow label="Open For Accepting Returns" value={<YesNoBadge value={data.isOpenForAcceptingReturns} />} />
          </div>
        ) : (
          <p className="pt-4 text-sm text-muted-foreground">Location not found.</p>
        )}
      </div>
    </div>
  );
}
