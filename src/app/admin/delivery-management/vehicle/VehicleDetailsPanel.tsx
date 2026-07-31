"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { X } from "lucide-react";

import { useShop } from "@/context/shop-context";
import { fetchSingleVehicle } from "@/services/vehicles/getSingle";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface VehicleDetailsPanelProps {
  vehicleId: string | number;
  onClose: () => void;
  onEdit: () => void;
}

export default function VehicleDetailsPanel({ vehicleId, onClose, onEdit }: VehicleDetailsPanelProps) {
  const { shopId } = useShop();
  const [vehicle, setVehicle] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!vehicleId || !shopId) return;
    setLoading(true);
    fetchSingleVehicle(vehicleId, shopId as string)
      .then((res) => setVehicle(res?.data ?? null))
      .catch(() => toast.error("Failed to load vehicle details"))
      .finally(() => setLoading(false));
  }, [vehicleId, shopId]);

  const initials = vehicle?.name
    ? vehicle.name
        .split(" ")
        .map((w: string) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "V";

  return (
    <div className="flex w-1/3 shrink-0 flex-col overflow-hidden rounded-xl ring-1 ring-foreground/10">
      <div className="flex items-center justify-between px-4 py-3">
        <h2 className="text-sm font-semibold">Vehicle Details</h2>
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
        ) : !vehicle ? (
          <p className="py-4 text-sm text-muted-foreground">Vehicle not found.</p>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                {initials}
              </div>
              <div>
                <p className="text-base font-semibold leading-tight">{vehicle.name}</p>
                <Badge variant={vehicle.isActive ? "default" : "outline"} className="mt-1">
                  {vehicle.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
            </div>

            {[
              ["Make", vehicle.make],
              ["Model", vehicle.model],
              ["Color", vehicle.color],
              ["License Plate", vehicle.licensePlateData],
              ["VIN", vehicle.vin],
            ].map(([label, value]) => (
              <div key={label} className="flex items-start gap-2 border-b border-foreground/5 pb-2">
                <span className="w-32 shrink-0 text-sm text-muted-foreground">{label}</span>
                <span className="flex-1 text-sm font-medium">{value || "N/A"}</span>
              </div>
            ))}

            {vehicle.description && (
              <div>
                <span className="mb-1 block text-sm text-muted-foreground">Description</span>
                <p className="text-sm">{vehicle.description}</p>
              </div>
            )}

            {vehicle.images?.length > 0 && (
              <div>
                <span className="mb-2 block text-sm text-muted-foreground">Images</span>
                <div className="flex flex-wrap gap-2">
                  {vehicle.images.map((url: string, i: number) => (
                    <img
                      key={i}
                      src={url}
                      alt={`Vehicle ${i + 1}`}
                      className="size-20 rounded-lg object-cover ring-1 ring-foreground/10"
                    />
                  ))}
                </div>
              </div>
            )}

            {vehicle.documentLinks?.length > 0 && (
              <div>
                <span className="mb-2 block text-sm text-muted-foreground">Documents</span>
                <div className="flex flex-col gap-2">
                  {vehicle.documentLinks.map((url: string, i: number) => (
                    <a
                      key={i}
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="truncate text-sm text-primary hover:underline"
                    >
                      Document {i + 1}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
