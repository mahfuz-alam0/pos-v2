"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { useShop } from "@/context/shop-context";
import { fetchMetrcTransfersSyncStatus } from "@/services/metrcTransfers/syncStatus";
import { fetchMetrcTransfersLiveSyncStatus } from "@/services/metrcTransfers/syncLiveStatus";
import { createMetrcTransfersSyncJob } from "@/services/metrcTransfers/createSyncJob";

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

// Faithful port of old sync-transfer.jsx: initial status fetch, then a
// 5s poll of the "live" endpoint to reflect a queued/in-progress sync job
// started from elsewhere (another tab, another user).
export default function SyncTransfer() {
  const { shopId } = useShop();
  const [label, setLabel] = useState("Fetching sync status...");
  const [errorMessages, setErrorMessages] = useState<string[]>([]);
  const [lastSynced, setLastSynced] = useState<string | undefined>();
  const [buttonDisabled, setButtonDisabled] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!shopId) return;

    const fetchStatus = () => {
      fetchMetrcTransfersSyncStatus(shopId as string)
        .then((res: any) => {
          const d = res?.data?.data;
          if (!d) return setLabel("Sync Transfers");
          setLastSynced(d.lastSynced);
          setLabel(d.lastSynced ? `Last synced ${timeAgo(d.lastSynced)}` : "Sync Transfers");
          setErrorMessages(d.errorMessages ?? []);
        })
        .catch(() => setLabel("Sync Transfers"));
    };

    const fetchLiveStatus = () => {
      fetchMetrcTransfersLiveSyncStatus(shopId as string)
        .then((res: any) => {
          const d = res?.data?.data;
          if (res?.data?.success === false) {
            setButtonDisabled(false);
            setLabel("Sync Transfers");
          } else if (d?.isPicked) {
            setButtonDisabled(true);
            setLabel("Sync in Progress");
          } else if (d && !d.isPicked) {
            setButtonDisabled(true);
            setLabel(`Sync Job Queued ${timeAgo(d.createdAt)}`);
          }
        })
        .catch(() => {
          setButtonDisabled(false);
          setLabel("Sync Transfers");
        });
    };

    fetchStatus();
    const intervalId = setInterval(fetchLiveStatus, 5000);
    return () => clearInterval(intervalId);
  }, [shopId]);

  const handleSync = async () => {
    if (!shopId) return;
    const numOfDays = lastSynced
      ? Math.max(1, Math.floor((Date.now() - new Date(lastSynced).getTime()) / 86400000))
      : 1;

    setLoading(true);
    try {
      await createMetrcTransfersSyncJob({ shopId, numOfDays });
      toast.success("Transfer sync request generated successfully");
      setLabel("Sync Transfers");
    } catch (err: any) {
      toast.error(err?.message || "Error generating sync request");
    } finally {
      setLoading(false);
    }
  };

  const button = (
    <Button className="h-10 text-[14px]" onClick={handleSync} disabled={loading || buttonDisabled}>
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
