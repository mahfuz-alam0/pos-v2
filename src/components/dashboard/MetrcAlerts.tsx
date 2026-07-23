"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { fetchMetrcLogs, deleteMetrcLog, clearAllMetrcLogs } from "@/services/metrc/logs";
import { Button } from "@/components/ui/button";
import { formatToShopTimezone } from "@/util/dateUtil";
import { useShop } from "@/context/shop-context";

function jobTypeHeading(jobType, details) {
  switch (jobType) {
    case "PACKAGE_SYNC":
      return "Retrieving latest active package data from METRC";
    case "SALE_REPORT":
      return `Reporting sale to METRC. Sale ID: ${details?.advertisedSaleId}`;
    case "SALE_RETURN_REPORT":
      return `Reporting sale return to METRC. Return ID: ${details?.advertisedSaleId}`;
    case "BATCH_PACKAGE_UPDATE":
      return `Package reconciliation with METRC. Total packages: ${details?.packages?.length}`;
    default:
      return jobType;
  }
}

export default function MetrcAlerts() {
  const { shopId } = useShop();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [clearingAll, setClearingAll] = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetchMetrcLogs(shopId, { limit: 100, page: 1, isError: "true" });
      setLogs(res?.data?.logs || []);
    } catch (err) {
      console.error("Error fetching metrc logs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!shopId) return;
    fetchLogs();
  }, [shopId]);

  const handleDelete = async (logId) => {
    setDeletingId(logId);
    try {
      await deleteMetrcLog(logId, shopId);
      setLogs((prev) => prev.filter((job) => job.id !== logId));
    } catch (err) {
      console.error("Failed to delete log:", err);
    } finally {
      setDeletingId(null);
    }
  };

  const handleClearAll = async () => {
    if (!confirm("This will permanently delete all metrc error logs. Continue?")) return;
    setClearingAll(true);
    try {
      await clearAllMetrcLogs(shopId);
      setLogs([]);
    } catch (err) {
      console.error("Failed to clear logs:", err);
    } finally {
      setClearingAll(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-component-bg p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="m-0 text-[18px] font-semibold text-text">Metrc Alerts</h2>
        {logs.length > 0 && (
          <Button size="sm" variant="destructive" onClick={handleClearAll} disabled={clearingAll}>
            Clear All
          </Button>
        )}
      </div>

      <div className="mt-4 max-h-[400px] space-y-2 overflow-y-auto">
        {loading ? (
          <div className="py-6 text-center text-muted-foreground">Loading…</div>
        ) : logs.length === 0 ? (
          <div className="py-6 text-center text-muted-foreground">No data found</div>
        ) : (
          logs.map((job) => (
            <div key={job.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
              <div className="min-w-0">
                <div className="truncate text-sm text-text">{jobTypeHeading(job.jobType, job.details)}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">{formatToShopTimezone(job.createdAt, "MM.DD.YYYY, h:mm A")}</div>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className="rounded-full bg-red-500/15 px-2.5 py-1 text-xs font-semibold text-red-500">Error</span>
                <button className="text-muted-foreground hover:text-text">
                  <Plus className="size-4" />
                </button>
                <button onClick={() => handleDelete(job.id)} disabled={deletingId === job.id} className="text-muted-foreground hover:text-red-500">
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
