"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

import { useShop } from "@/context/shop-context";
import { fetchSingleDeliveryProfile } from "@/services/deliveryProfiles/getSingle";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface DeliveryProfileDetailsPanelProps {
  profileId: string;
  onClose: () => void;
}

export default function DeliveryProfileDetailsPanel({ profileId, onClose }: DeliveryProfileDetailsPanelProps) {
  const { shopId } = useShop();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!profileId || !shopId) return;
    setLoading(true);
    fetchSingleDeliveryProfile(profileId, shopId as string)
      .then((res) => setProfile(res?.data ?? null))
      .finally(() => setLoading(false));
  }, [profileId, shopId]);

  const rows = [
    { label: "Region", value: profile?.zipCodePreference?.region ?? "-" },
    { label: "Zip Code Preference", value: profile?.zipCodePreference?.zipCodePreference ?? "-" },
    {
      label: "Target Zip Code(s)",
      value: (profile?.zipCodePreference?.targetZipCodes ?? []).length > 0
        ? profile.zipCodePreference.targetZipCodes.join(", ")
        : "-",
    },
    { label: "Last Updated By", value: profile?.lastUpdater?.name ?? "-" },
  ];

  return (
    <div className="flex flex-col gap-3 rounded-xl ring-1 ring-foreground/10">
      <div className="flex items-center justify-between gap-3 px-4 py-3 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)]">
        <div className="text-sm font-semibold">Delivery Profile Details</div>
        <div className="flex items-center gap-2">
          {profile && (
            <Badge variant={profile.isEnabled ? "default" : "destructive"}>
              {profile.isEnabled ? "Enabled" : "Disabled"}
            </Badge>
          )}
          <Button variant="outline" size="icon-sm" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-2 px-4 pb-4 text-sm">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-5 w-full" />)
          : rows.map((row) => (
              <div key={row.label} className="flex items-center justify-between border-b border-foreground/5 pb-2">
                <span className="w-2/5 text-muted-foreground">{row.label}</span>
                <span className="w-3/5 text-right font-medium">{row.value}</span>
              </div>
            ))}
      </div>
    </div>
  );
}
