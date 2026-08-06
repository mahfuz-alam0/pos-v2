"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Truck, X } from "lucide-react";

import { useShop } from "@/context/shop-context";
import { fetchSingleDeliveryJob } from "@/services/deliveryJobs/getSingle";
import { updateDeliveryJob } from "@/services/deliveryJobs/update";
import { fetchDriversList } from "@/services/drivers/list";
import { fetchVehiclesList } from "@/services/vehicles/list";

import Drawer from "@/components/ui/Drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field } from "@/components/admin/form-fields";

interface JobFormDrawerProps {
  open: boolean;
  jobId: string | number | null;
  onClose: () => void;
  onSaved: () => void;
}

function toLocalInputValue(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function JobFormDrawer({ open, jobId, onClose, onSaved }: JobFormDrawerProps) {
  const { shopId } = useShop();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [driverId, setDriverId] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [departureTimestamp, setDepartureTimestamp] = useState("");
  const [estimatedArrivalTimestamp, setEstimatedArrivalTimestamp] = useState("");
  const [plannedRoute, setPlannedRoute] = useState("");

  const [drivers, setDrivers] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [dropdownLoading, setDropdownLoading] = useState(false);

  useEffect(() => {
    if (!open || !shopId) return;
    setDropdownLoading(true);
    Promise.all([fetchDriversList(shopId, { page: 1, limit: 100 }), fetchVehiclesList(shopId, { page: 1, limit: 100 })])
      .then(([dRes, vRes]) => {
        setDrivers(dRes?.data ?? []);
        setVehicles(vRes?.data ?? []);
      })
      .finally(() => setDropdownLoading(false));
  }, [open, shopId]);

  useEffect(() => {
    if (!open || !jobId || !shopId) return;
    setLoading(true);
    fetchSingleDeliveryJob(jobId, shopId)
      .then((res) => {
        const job = res?.data;
        if (!job) {
          toast.error("Delivery job not found");
          return;
        }
        const dew = job.deliveryEstimationWindow || {};
        setDriverId(job.driverInfo?.id ? String(job.driverInfo.id) : "");
        setVehicleId(job.vehicleInfo?.id ? String(job.vehicleInfo.id) : "");
        setDepartureTimestamp(toLocalInputValue(dew.departureTimestamp));
        setEstimatedArrivalTimestamp(toLocalInputValue(dew.estimatedArrivalTimestamp));
        setPlannedRoute(dew.plannedRoute || "");
      })
      .catch((err: any) => toast.error(err?.message || "Failed to load delivery job"))
      .finally(() => setLoading(false));
  }, [open, jobId, shopId]);

  const handleUpdate = async () => {
    if (!driverId) {
      toast.error("Please select a driver");
      return;
    }
    if (!vehicleId) {
      toast.error("Please select a vehicle");
      return;
    }
    if (!departureTimestamp) {
      toast.error("Please select departure time");
      return;
    }
    if (!estimatedArrivalTimestamp) {
      toast.error("Please select estimated arrival time");
      return;
    }
    if (!shopId || !jobId) return;

    setSaving(true);
    try {
      await updateDeliveryJob({
        shopId,
        id: jobId,
        driverId,
        vehicleId,
        deliveryEstimationWindow: {
          departureTimestamp: new Date(departureTimestamp).toISOString(),
          estimatedArrivalTimestamp: new Date(estimatedArrivalTimestamp).toISOString(),
          plannedRoute: plannedRoute || undefined,
        },
      });
      toast.success("Delivery job updated successfully");
      onSaved();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update delivery job");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer open={open} onClose={saving ? undefined : onClose} side="right" size={640}>
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-3 px-5 py-4 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)]">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Truck className="size-4 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-base font-semibold leading-tight">Edit Delivery Job</div>
            <div className="text-xs leading-tight text-muted-foreground">Update driver, vehicle, and delivery window</div>
          </div>
          <Button variant="outline" size="icon-sm" onClick={onClose} disabled={saving}>
            <X className="size-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="flex flex-col gap-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-11 w-full" />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <Field label="Driver" required>
                <Select
                  items={drivers.map((d) => ({ value: String(d.id), label: d.name }))}
                  value={driverId}
                  onValueChange={(v) => setDriverId(v as string)}
                  disabled={dropdownLoading}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a driver" />
                  </SelectTrigger>
                  <SelectContent>
                    {drivers.map((d) => (
                      <SelectItem key={d.id} value={String(d.id)}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Vehicle" required>
                <Select
                  items={vehicles.map((v) => ({ value: String(v.id), label: v.name }))}
                  value={vehicleId}
                  onValueChange={(v) => setVehicleId(v as string)}
                  disabled={dropdownLoading}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a vehicle" />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicles.map((v) => (
                      <SelectItem key={v.id} value={String(v.id)}>
                        {v.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <div className="h-px bg-border" />
              <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Delivery Window</p>

              <Field label="Departure Time" required>
                <input
                  type="datetime-local"
                  value={departureTimestamp}
                  onChange={(e) => setDepartureTimestamp(e.target.value)}
                  className="h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm dark:bg-input/30"
                />
              </Field>

              <Field label="Estimated Arrival Time" required>
                <input
                  type="datetime-local"
                  value={estimatedArrivalTimestamp}
                  onChange={(e) => setEstimatedArrivalTimestamp(e.target.value)}
                  className="h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm dark:bg-input/30"
                />
              </Field>

              <Field label="Planned Route">
                <Input value={plannedRoute} onChange={(e) => setPlannedRoute(e.target.value)} placeholder="e.g. 123 Main St → 456 Oak Ave" />
              </Field>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 shadow-[inset_0_1px_0_rgba(0,0,0,0.06)]">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleUpdate} disabled={saving || loading}>
            {saving ? "Saving..." : "Update"}
          </Button>
        </div>
      </div>
    </Drawer>
  );
}
