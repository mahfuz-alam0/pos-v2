"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { X } from "lucide-react";

import { useShop } from "@/context/shop-context";
import { fetchSingleDriver } from "@/services/drivers/getSingle";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface DriverDetailsPanelProps {
  driverId: string | number;
  onClose: () => void;
  onEdit: () => void;
}

export default function DriverDetailsPanel({ driverId, onClose, onEdit }: DriverDetailsPanelProps) {
  const { shopId } = useShop();
  const [driver, setDriver] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!driverId || !shopId) return;
    setLoading(true);
    fetchSingleDriver(driverId, shopId as string)
      .then((res) => setDriver(res?.data ?? null))
      .catch(() => toast.error("Failed to load driver details"))
      .finally(() => setLoading(false));
  }, [driverId, shopId]);

  const loc = driver?.locationDetails ?? {};
  const initials = driver?.name
    ? driver.name
        .split(" ")
        .map((w: string) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  return (
    <div className="flex w-1/3 shrink-0 flex-col overflow-hidden rounded-xl ring-1 ring-foreground/10">
      <div className="flex items-center justify-between px-4 py-3">
        <h2 className="text-sm font-semibold">Driver Details</h2>
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
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-5 w-full" />
            ))}
          </div>
        ) : !driver ? (
          <p className="py-4 text-sm text-muted-foreground">Driver not found.</p>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              {driver.avatarUrl ? (
                <img src={driver.avatarUrl} alt={driver.name} className="size-12 rounded-full object-cover ring-1 ring-foreground/10" />
              ) : (
                <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  {initials}
                </div>
              )}
              <div>
                <p className="text-base font-semibold leading-tight">{driver.name}</p>
                <p className="text-xs text-muted-foreground">{driver.email}</p>
              </div>
            </div>

            {[
              ["Phone", driver.phone],
              ["Email", driver.email],
              ["License Number", driver.license],
              ["UBI", driver.ubi],
              ["Country Code", driver.countryCode],
              ["Street", loc.streetAddress],
              ["City", loc.city],
              ["State", loc.state],
              ["Zip", loc.zipCode],
              ["Country", loc.country],
            ].map(([label, value]) => (
              <div key={label} className="flex items-start gap-2 border-b border-foreground/5 pb-2">
                <span className="w-32 shrink-0 text-sm text-muted-foreground">{label}</span>
                <span className="flex-1 text-sm font-medium">{value || "N/A"}</span>
              </div>
            ))}

            {driver.description && (
              <div>
                <span className="mb-1 block text-sm text-muted-foreground">Description</span>
                <p className="text-sm">{driver.description}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
