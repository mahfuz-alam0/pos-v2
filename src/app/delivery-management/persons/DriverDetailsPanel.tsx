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

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="mb-3 flex flex-col">
      <span className="mb-0.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</span>
      <span className="text-sm text-foreground">{value || <span className="text-muted-foreground italic">—</span>}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <span className="mb-3 block text-xs font-semibold tracking-wider uppercase">{title}</span>
      {children}
    </div>
  );
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
          <div>
            <div className="mb-4 flex items-center gap-3">
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

            <div className="h-px bg-border" />
            <div className="mt-4">
              <Section title="Contact">
                <Field label="Phone" value={driver.phone} />
                <Field label="Email" value={driver.email} />
              </Section>
            </div>

            <div className="h-px bg-border" />
            <div className="mt-4">
              <Section title="License & Identity">
                <Field label="License Number" value={driver.license} />
                <Field label="UBI" value={driver.ubi} />
                <Field label="Country Code" value={driver.countryCode} />
              </Section>
            </div>

            <div className="h-px bg-border" />
            <div className="mt-4">
              <Section title="Address">
                <Field label="Street" value={loc.streetAddress} />
                <div className="flex gap-4">
                  <div className="flex-1">
                    <Field label="City" value={loc.city} />
                  </div>
                  <div className="flex-1">
                    <Field label="State" value={loc.state} />
                  </div>
                  <div className="w-24">
                    <Field label="Zip" value={loc.zipCode} />
                  </div>
                </div>
                <Field label="Country" value={loc.country} />
              </Section>
            </div>

            {driver.description && (
              <>
                <div className="h-px bg-border" />
                <div className="mt-4">
                  <Section title="Description">
                    <p className="m-0 text-sm text-foreground">{driver.description}</p>
                  </Section>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
