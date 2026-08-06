"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { X } from "lucide-react";
import Image from "next/image";

import { getAeropayConfigs } from "@/services/aeropay/getConfigs";
import { saveAeropayConfigs } from "@/services/aeropay/saveConfigs";

import Drawer from "@/components/ui/Drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function AeropaySettings({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved?: () => void }) {
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [merchantId, setMerchantId] = useState("");
  const [merchantLocationUuid, setMerchantLocationUuid] = useState("");
  const [merchantLocationId, setMerchantLocationId] = useState("");

  useEffect(() => {
    if (!open) return;
    setInitialLoading(true);
    getAeropayConfigs()
      .then((res) => {
        const config = res?.data?.data;
        if (!config) return;
        setMerchantId(config.merchantId || "");
        setMerchantLocationUuid(config.merchantLocationUuid || "");
        setMerchantLocationId(config.merchantLocationId || "");
      })
      .finally(() => setInitialLoading(false));
  }, [open]);

  const handleSubmit = async () => {
    if (!merchantId.trim() || !merchantLocationUuid.trim() || !merchantLocationId.trim()) {
      toast.error("All fields are required.");
      return;
    }

    setLoading(true);
    try {
      const shopId = JSON.parse(localStorage.getItem("shopId") || "null");
      await saveAeropayConfigs({ shopId, merchantId, merchantLocationUuid, merchantLocationId });
      toast.success("Bleaum Pay configuration saved successfully!");
      onSaved?.();
    } catch (err: any) {
      toast.error(err?.message || "Failed to save Bleaum Pay configuration.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Drawer open={open} onClose={loading ? undefined : onClose} side="right" size={520}>
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-3 px-5 py-4 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)]">
          <div className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
            <Image src="/images/bleaumPay.jpeg" alt="Bleaum Pay" width={32} height={32} className="object-contain" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-base font-semibold leading-tight">Bleaum Pay Integration</div>
            <div className="text-xs leading-tight text-muted-foreground">Accept digital payments securely</div>
          </div>
          <Button variant="outline" size="icon-sm" onClick={onClose} disabled={loading}>
            <X className="size-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <p className="mb-4 text-sm text-muted-foreground">Configure your Bleaum Pay API credentials to accept digital payments securely.</p>

          {initialLoading ? (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-9 w-full" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-9 w-full" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-9 w-full" />
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="merchant-id">Merchant ID</Label>
                <Input id="merchant-id" placeholder="Enter your Bleaum Pay Merchant ID" value={merchantId} onChange={(e) => setMerchantId(e.target.value)} />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="merchant-location-uuid">Merchant Location UUID</Label>
                <Input
                  id="merchant-location-uuid"
                  placeholder="Enter your Bleaum Pay Merchant Location UUID"
                  value={merchantLocationUuid}
                  onChange={(e) => setMerchantLocationUuid(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="merchant-location-id">Merchant Location ID</Label>
                <Input
                  id="merchant-location-id"
                  placeholder="Enter your Bleaum Pay Merchant Location ID"
                  value={merchantLocationId}
                  onChange={(e) => setMerchantLocationId(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 shadow-[inset_0_1px_0_rgba(0,0,0,0.06)]">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading || initialLoading}>
            {loading ? "Saving..." : "Save Configuration"}
          </Button>
        </div>
      </div>
    </Drawer>
  );
}
