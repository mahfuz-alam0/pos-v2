"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { useShop } from "@/context/shop-context";
import { fetchDriversList } from "@/services/drivers/list";
import { fetchVehiclesList } from "@/services/vehicles/list";
import { createDeliveryJob } from "@/services/deliveryJobs/create";

import Drawer from "@/components/ui/Drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/admin/form-fields";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function toLocalInputValue(date?: Date | null) {
  if (!date) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

interface DeliveryOptionsDrawerProps {
  open: boolean;
  onClose: () => void;
  saleId: string | number;
  // "Standard" just advances the order status normally (same as any other
  // Next click); "Via new Delivery Job" hands the delivery off to a job
  // instead, which then drives the order's status on its own.
  onStandard: () => void;
  onJobCreated: () => void;
}

// Ported from the old app's Delivery Options drawer (OrderCard.jsx) — shown
// instead of the normal Next click when a Packaged & Ready order is a
// DELIVERY-method order with no delivery job yet.
export default function DeliveryOptionsDrawer({
  open,
  onClose,
  saleId,
  onStandard,
  onJobCreated,
}: DeliveryOptionsDrawerProps) {
  const { shopId } = useShop();
  const [option, setOption] = useState<"STANDARD" | "NEW_JOB">("STANDARD");

  const [driverId, setDriverId] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [departureTimestamp, setDepartureTimestamp] = useState("");
  const [estimatedArrivalTimestamp, setEstimatedArrivalTimestamp] = useState("");
  const [plannedRoute, setPlannedRoute] = useState("");

  const [drivers, setDrivers] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [dropdownLoading, setDropdownLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setOption("STANDARD");
    setDriverId("");
    setVehicleId("");
    setDepartureTimestamp(toLocalInputValue(new Date()));
    setEstimatedArrivalTimestamp("");
    setPlannedRoute("");
  }, [open]);

  useEffect(() => {
    if (!open || !shopId) return;
    setDropdownLoading(true);
    Promise.all([
      fetchDriversList(shopId, { page: 1, limit: 100 }),
      fetchVehiclesList(shopId, { page: 1, limit: 100 }),
    ])
      .then(([dRes, vRes]) => {
        setDrivers(dRes?.data ?? []);
        setVehicles(vRes?.data ?? []);
      })
      .finally(() => setDropdownLoading(false));
  }, [open, shopId]);

  const handleConfirm = async () => {
    if (option === "STANDARD") {
      onClose();
      onStandard();
      return;
    }

    if (!driverId) {
      toast.error("Please select a driver");
      return;
    }
    if (!vehicleId) {
      toast.error("Please select a vehicle");
      return;
    }
    if (!departureTimestamp || !estimatedArrivalTimestamp) {
      toast.error("Please select departure and estimated arrival times");
      return;
    }
    if (!shopId) return;

    setSubmitting(true);
    try {
      await createDeliveryJob({
        shopId,
        saleId,
        driverId,
        vehicleId,
        deliveryEstimationWindow: {
          departureTimestamp: new Date(departureTimestamp).toISOString(),
          estimatedArrivalTimestamp: new Date(estimatedArrivalTimestamp).toISOString(),
          plannedRoute: plannedRoute || undefined,
        },
      });
      toast.success("Delivery job created successfully");
      onClose();
      onJobCreated();
    } catch (err: any) {
      toast.error(err?.message || "Failed to create delivery job");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Drawer open={open} onClose={submitting ? undefined : onClose} side="right" size={600}>
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between px-5 py-4 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)]">
          <div className="text-base font-semibold">Delivery Options</div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <p className="mb-3 text-sm text-muted-foreground">
            How would you like to fulfill this delivery?
          </p>

          <div className="mb-4 flex flex-col gap-3">
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="radio"
                checked={option === "STANDARD"}
                onChange={() => setOption("STANDARD")}
                className="size-4 shrink-0 accent-primary"
              />
              Standard (update order status)
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="radio"
                checked={option === "NEW_JOB"}
                onChange={() => setOption("NEW_JOB")}
                className="size-4 shrink-0 accent-primary"
              />
              Via new Delivery Job
            </label>
          </div>

          {option === "NEW_JOB" && (
            <div className="flex flex-col gap-4 border-t border-border pt-4">
              <Field label="Driver" required>
                <Select
                  items={drivers.map((d) => ({ value: String(d.id), label: d.name }))}
                  value={driverId}
                  onValueChange={(v) => setDriverId(v as string)}
                  disabled={dropdownLoading}>
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
                  disabled={dropdownLoading}>
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
                <Input
                  value={plannedRoute}
                  onChange={(e) => setPlannedRoute(e.target.value)}
                  placeholder="e.g. 123 Main St → 456 Oak Ave"
                />
              </Field>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 shadow-[inset_0_1px_0_rgba(0,0,0,0.06)]">
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={submitting}>
            {submitting ? "Creating…" : option === "NEW_JOB" ? "Create Job" : "Continue"}
          </Button>
        </div>
      </div>
    </Drawer>
  );
}
