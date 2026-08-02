"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { useShop } from "@/context/shop-context";
import { fetchMetrcPackagesSyncStatus } from "@/services/packages/metrcSyncStatus";
import { createMetrcSyncJob } from "@/services/packages/createMetrcSyncJob";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days} day${days > 1 ? "s" : ""} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
  return `${seconds} second${seconds > 1 ? "s" : ""} ago`;
}

export default function SyncPackagesButton() {
  const { shopId } = useShop();
  const [label, setLabel] = useState("Fetching sync status...");
  const [errorMessages, setErrorMessages] = useState<string[]>([]);
  const [lastSynced, setLastSynced] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);

  const loadStatus = () => {
    if (!shopId) return;
    fetchMetrcPackagesSyncStatus(shopId as string)
      .then((res) => {
        const d = res?.data?.data;
        if (!d) return setLabel("Sync Packages");
        setLastSynced(d.lastSynced);
        setLabel(d.lastSynced ? `Last synced ${timeAgo(d.lastSynced)}` : "Sync Packages");
        setErrorMessages(d.errorMessages ?? []);
      })
      .catch(() => setLabel("Sync Packages"));
  };

  useEffect(loadStatus, [shopId]);

  const handleSync = async () => {
    if (!shopId) return;
    const numOfDays = lastSynced
      ? Math.max(1, Math.floor((Date.now() - new Date(lastSynced).getTime()) / 86400000))
      : 1;

    setLoading(true);
    try {
      await createMetrcSyncJob({ shopId, numOfDays });
      toast.success("Packages sync request generated successfully");
      loadStatus();
    } catch (err: any) {
      toast.error(err?.message || "Error generating sync request");
    } finally {
      setLoading(false);
    }
  };

  const button = (
    <Button variant="outline" onClick={handleSync} disabled={loading}>
      {loading && <Loader2 className="size-4 animate-spin" />}
      {label}
    </Button>
  );

  if (errorMessages.length === 0) return button;

  return (
    <Tooltip>
      <TooltipTrigger render={button} />
      <TooltipContent>{errorMessages.join(", ")}</TooltipContent>
    </Tooltip>
  );
}
