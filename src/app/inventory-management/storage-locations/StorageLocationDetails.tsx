"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";

import { fetchSingleStorageLocation } from "@/services/storageLocations/getSingle";
import { useShop } from "@/context/shop-context";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import Drawer from "@/components/ui/Drawer";

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex w-full items-center gap-8 py-3">
      <span className="w-[60%] text-sm font-semibold text-foreground">{label}:</span>
      <span className="text-sm text-muted-foreground">{value}</span>
    </div>
  );
}

function YesNoText({ value }: { value: boolean }) {
  return <span>{value ? "Yes" : "No"}</span>;
}

interface StorageLocationDetailsProps {
  locationId: string | null;
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
    <Drawer open={!!locationId} onClose={onClose} side="right" size={420}>
      <div className="relative flex h-full flex-col bg-muted/30 p-5">
        <Button variant="outline" size="icon" onClick={onClose} className="absolute top-5 right-5 h-7 w-7 shrink-0">
          <X className="size-4" />
        </Button>

        <h2 className="mb-4 text-xl font-bold text-foreground">Storage Location details</h2>

        <div className="flex-1 overflow-y-auto rounded-xl bg-background p-5 shadow-sm">
          {loading ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-5 w-full" />
              ))}
            </div>
          ) : data ? (
            <div className="flex flex-col">
              <DetailRow label="Location Name" value={data.name} />
              <DetailRow label="Open For Accepting Transfers" value={<YesNoText value={data.openForAcceptingTransfers} />} />
              <DetailRow label="Sellable On Physical Store" value={<YesNoText value={data.isSellableOnPhysicalStore} />} />
              <DetailRow label="Sellable On Online Store" value={<YesNoText value={data.isSellableOnOnlineStore} />} />
              <DetailRow label="Open For Accepting Returns" value={<YesNoText value={data.isOpenForAcceptingReturns} />} />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Location not found.</p>
          )}
        </div>
      </div>
    </Drawer>
  );
}
