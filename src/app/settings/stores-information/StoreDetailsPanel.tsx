"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { X } from "lucide-react";

import { fetchSingleShop } from "@/services/shops/getSingle";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { StoreDetail } from "./types";

interface StoreDetailsPanelProps {
  storeId: string | number;
  onClose: () => void;
  onEdit: () => void;
}

export default function StoreDetailsPanel({ storeId, onClose, onEdit }: StoreDetailsPanelProps) {
  const [store, setStore] = useState<StoreDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!storeId) return;
    setLoading(true);
    fetchSingleShop(storeId)
      .then((res) => setStore(res?.data ?? null))
      .catch(() => toast.error("Failed to load store details"))
      .finally(() => setLoading(false));
  }, [storeId]);

  return (
    <div className="flex w-1/3 shrink-0 flex-col gap-4 overflow-hidden">
      <div className="flex flex-col overflow-hidden rounded-xl ring-1 ring-foreground/10">
        <div className="flex items-center justify-between px-4 py-3">
          <h2 className="text-sm font-semibold">Store Information Details</h2>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={onEdit}>
              Edit
            </Button>
            <Button variant="outline" size="icon" onClick={onClose} className="size-7 shrink-0">
              <X className="size-4" />
            </Button>
          </div>
        </div>
        <div className="h-px bg-border" />

        <div className="flex-1 overflow-y-auto px-4 py-3">
          {loading ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-5 w-full" />
              ))}
            </div>
          ) : !store ? (
            <p className="py-4 text-sm text-muted-foreground">Store not found.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {store.logo && (
                <img
                  src={store.logo}
                  alt={store.shopName ?? ""}
                  className="size-16 rounded-lg object-cover ring-1 ring-foreground/10"
                />
              )}
              {[
                ["Store Name", store.shopName],
                ["Phone Number", store.phone],
                ["Email ID", store.shopEmail],
                ["Address", store.locationDetails?.streetAddress],
              ].map(([label, value]) => (
                <div key={label} className="flex items-start gap-2">
                  <span className="w-32 shrink-0 text-sm text-muted-foreground">{label}:</span>
                  <span className="flex-1 text-sm font-medium">{value || "N/A"}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
