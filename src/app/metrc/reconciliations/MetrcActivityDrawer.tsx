"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { RefreshCw, X } from "lucide-react";

import { useShop } from "@/context/shop-context";
import {
  fetchMetrcLogs,
  deleteMetrcLog,
  clearAllMetrcLogs,
  fetchMetrcQueuedJobs,
  refreshQueuedMetrcJobs,
} from "@/services/metrcCommon/metrcLogs";

import Drawer from "@/components/ui/Drawer";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MetrcJobsList, { type MetrcJob } from "./MetrcJobsList";

type ActivityTab = "ongoing" | "errors" | "logs";

interface MetrcActivityDrawerProps {
  open: boolean;
  onClose: () => void;
}

export default function MetrcActivityDrawer({ open, onClose }: MetrcActivityDrawerProps) {
  const { shopId } = useShop();
  const [tab, setTab] = useState<ActivityTab>("ongoing");

  const [queuedJobs, setQueuedJobs] = useState<MetrcJob[]>([]);
  const [errorLogs, setErrorLogs] = useState<MetrcJob[]>([]);
  const [activityLogs, setActivityLogs] = useState<MetrcJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadQueued = async () => {
    if (!shopId) return;
    setLoading(true);
    try {
      const res = await fetchMetrcQueuedJobs(shopId as string);
      setQueuedJobs(
        (res?.data?.jobs ?? []).map((j: any) => ({ ...j.jobProperties, id: j.id, createdAt: j.createdAt, isPicked: j.isPicked }))
      );
    } catch (err: any) {
      toast.error(err?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const loadLogs = async (isError: boolean) => {
    if (!shopId) return;
    setLoading(true);
    try {
      const res = await fetchMetrcLogs(shopId as string, { limit: 100, page: 1, isError });
      (isError ? setErrorLogs : setActivityLogs)(res?.data?.logs ?? []);
    } catch (err: any) {
      toast.error(err?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open || !shopId) return;
    if (tab === "ongoing") loadQueued();
    else if (tab === "errors") loadLogs(true);
    else loadLogs(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, tab, shopId]);

  const handleRefreshQueue = async () => {
    if (!shopId) return;
    setRefreshing(true);
    try {
      const res = await refreshQueuedMetrcJobs(shopId as string);
      setQueuedJobs(
        (res?.data?.jobs ?? []).map((j: any) => ({ ...j.jobProperties, id: j.id, createdAt: j.createdAt, isPicked: j.isPicked }))
      );
    } catch (err: any) {
      toast.error(err?.message || "Something went wrong");
    } finally {
      setRefreshing(false);
    }
  };

  const handleDeleteLog = async (id: string | number) => {
    if (!shopId) return;
    try {
      await deleteMetrcLog(shopId as string, String(id));
      toast.success("Log deleted successfully");
      if (tab === "errors") setErrorLogs((prev) => prev.filter((j) => j.id !== id));
      else setActivityLogs((prev) => prev.filter((j) => j.id !== id));
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete log");
    }
  };

  const handleClearAll = async () => {
    if (!shopId) return;
    try {
      await clearAllMetrcLogs(shopId as string);
      toast.success("All logs cleared successfully");
      setErrorLogs([]);
    } catch (err: any) {
      toast.error(err?.message || "Failed to clear logs");
    }
  };

  return (
    <Drawer open={open} onClose={onClose} side="right" size={750}>
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between px-5 py-4 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)]">
          <div className="text-base font-semibold">Metrc Activity</div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <Tabs value={tab} onValueChange={(v) => setTab(v as ActivityTab)}>
            <TabsList>
              <TabsTrigger value="ongoing">Ongoing Metrc Jobs</TabsTrigger>
              <TabsTrigger value="errors">Errors/Warnings</TabsTrigger>
              <TabsTrigger value="logs">Metrc Activity Logs</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="mt-4">
            {tab === "ongoing" && (
              <div className="mb-3 flex justify-end">
                <Button variant="outline" size="sm" onClick={handleRefreshQueue} disabled={refreshing}>
                  <RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} />
                  Refresh Queue
                </Button>
              </div>
            )}

            {tab === "errors" && errorLogs.length > 0 && (
              <div className="mb-3 flex justify-end">
                <Button variant="destructive" size="sm" onClick={handleClearAll}>
                  Clear All
                </Button>
              </div>
            )}

            {loading ? (
              <div className="py-8 text-center text-sm text-muted-foreground">Loading...</div>
            ) : tab === "ongoing" ? (
              <MetrcJobsList jobs={queuedJobs} mode="queue" />
            ) : tab === "errors" ? (
              <MetrcJobsList jobs={errorLogs} mode="log" onDelete={handleDeleteLog} />
            ) : (
              <MetrcJobsList jobs={activityLogs} mode="log" onDelete={handleDeleteLog} />
            )}
          </div>
        </div>
      </div>
    </Drawer>
  );
}
