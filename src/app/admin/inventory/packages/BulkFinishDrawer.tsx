"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Loader2, Package, XCircle } from "lucide-react";

import { useShop } from "@/context/shop-context";
import { discontinuePackage } from "@/services/packages/discontinue";

import Drawer from "@/components/ui/Drawer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";

interface BulkFinishDrawerProps {
  open: boolean;
  onClose: () => void;
  selectedPackages: any[];
  onFinished: () => void;
}

type FinishStatus = "pending" | "loading" | "success" | "error";

function isMetrcPackage(pkg: any) {
  return Boolean(pkg?.source === "METRC" || pkg?.metrcData || pkg?.metrcId || pkg?.metrcTag);
}

export default function BulkFinishDrawer({
  open,
  onClose,
  selectedPackages,
  onFinished,
}: BulkFinishDrawerProps) {
  const { shopId } = useShop();

  const [statuses, setStatuses] = useState<Record<string, FinishStatus>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [syncWithMetrcMap, setSyncWithMetrcMap] = useState<Record<string, boolean>>({});
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!open) return;
    setStatuses({});
    setErrors({});
    setSyncWithMetrcMap({});
    setRunning(false);
    setDone(false);
    setCurrentIndex(0);
  }, [open, selectedPackages]);

  const total = selectedPackages.length;
  const successCount = Object.values(statuses).filter((s) => s === "success").length;
  const errorCount = Object.values(statuses).filter((s) => s === "error").length;
  const processed = successCount + errorCount;
  const progressPercent = total === 0 ? 0 : Math.round((processed / total) * 100);
  const hasMetrcPackages = selectedPackages.some(isMetrcPackage);
  const allMetrcSynced =
    hasMetrcPackages &&
    selectedPackages.filter(isMetrcPackage).every((p) => syncWithMetrcMap[p.id] === true);

  const handleBulkFinish = async () => {
    if (selectedPackages.length === 0) return;
    setRunning(true);
    setDone(false);

    // Sequential, one package at a time, so progress can be shown accurately
    // and one failure never blocks the rest of the batch from being attempted.
    for (let i = 0; i < selectedPackages.length; i++) {
      const pkg = selectedPackages[i];
      setCurrentIndex(i);
      setStatuses((prev) => ({ ...prev, [pkg.id]: "loading" }));
      try {
        const isMetrc = isMetrcPackage(pkg);
        await discontinuePackage(
          pkg.id,
          shopId,
          isMetrc,
          isMetrc ? syncWithMetrcMap[pkg.id] ?? false : undefined
        );
        setStatuses((prev) => ({ ...prev, [pkg.id]: "success" }));
      } catch (err: any) {
        setStatuses((prev) => ({ ...prev, [pkg.id]: "error" }));
        setErrors((prev) => ({ ...prev, [pkg.id]: err?.message || "Failed to finish package" }));
      }
    }

    setRunning(false);
    setDone(true);
  };

  const handleClose = () => {
    if (running) return;
    if (done && successCount > 0) {
      onFinished();
    }
    onClose();
  };

  useEffect(() => {
    if (!done) return;
    if (errorCount === 0) {
      toast.success(`All ${successCount} package(s) finished successfully.`);
    } else if (successCount === 0) {
      toast.error(`All ${errorCount} package(s) failed to finish.`);
    } else {
      toast.warning(`${successCount} finished, ${errorCount} failed.`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  return (
    <Drawer open={open} onClose={running ? undefined : handleClose} side="right" size={480}>
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-3 px-5 py-4 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)]">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-destructive/10">
            <Package className="size-4 text-destructive" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-base font-semibold leading-tight">Bulk Finish Packages</div>
            <div className="text-xs text-muted-foreground leading-tight">
              Mark selected packages as finished
            </div>
          </div>
          {!done && <Badge variant="secondary">{total} selected</Badge>}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {!running && !done && total > 0 && (
            <>
              <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
                This will mark <strong>{total}</strong> package{total !== 1 ? "s" : ""} as
                finished. This action cannot be undone.
              </div>
              {hasMetrcPackages && (
                <div className="flex items-center justify-between rounded-lg bg-muted/40 p-3">
                  <span className="text-xs font-medium">
                    Finish all METRC packages in METRC
                  </span>
                  <Switch
                    checked={allMetrcSynced}
                    onCheckedChange={(checked) => {
                      const updates: Record<string, boolean> = {};
                      selectedPackages.forEach((p) => {
                        if (isMetrcPackage(p)) updates[p.id] = checked;
                      });
                      setSyncWithMetrcMap((prev) => ({ ...prev, ...updates }));
                    }}
                  />
                </div>
              )}
            </>
          )}

          {done && (
            <div
              className={`rounded-lg p-3 text-xs font-medium ${
                errorCount === 0
                  ? "bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400"
                  : successCount === 0
                  ? "bg-destructive/10 text-destructive"
                  : "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400"
              }`}
            >
              {errorCount === 0
                ? `All ${successCount} package(s) finished successfully.`
                : successCount === 0
                ? `All ${errorCount} package(s) failed.`
                : `${successCount} finished · ${errorCount} failed`}
            </div>
          )}

          {total === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Package className="mb-2 size-8 opacity-40" />
              <p className="text-sm">No packages selected.</p>
            </div>
          )}

          <div className="space-y-2">
            {selectedPackages.map((pkg) => {
              const status: FinishStatus = statuses[pkg.id] ?? "pending";
              const errMsg = errors[pkg.id];
              const metrc = isMetrcPackage(pkg);

              return (
                <div
                  key={pkg.id}
                  className={`flex items-center gap-3 rounded-xl p-3 ${
                    status === "success"
                      ? "bg-green-50 dark:bg-green-950/20"
                      : status === "error"
                      ? "bg-destructive/10"
                      : status === "loading"
                      ? "bg-blue-50 dark:bg-blue-950/20"
                      : "bg-muted/40"
                  }`}
                >
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-background">
                    {status === "loading" && (
                      <Loader2 className="size-4 animate-spin text-blue-500" />
                    )}
                    {status === "success" && <CheckCircle2 className="size-4 text-green-600" />}
                    {status === "error" && <XCircle className="size-4 text-destructive" />}
                    {status === "pending" && <Package className="size-3.5 text-muted-foreground" />}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium leading-tight">
                      {pkg.name || pkg.advertisedId || pkg.id}
                    </p>
                    <div className="mt-0.5 flex items-center gap-1.5">
                      <span className="font-mono text-xs text-muted-foreground">
                        {pkg.advertisedId}
                      </span>
                      {metrc && !status && (
                        <Badge variant="outline" className="text-xs">
                          METRC
                        </Badge>
                      )}
                    </div>
                    {errMsg && <p className="mt-1 text-xs text-destructive leading-tight">{errMsg}</p>}
                  </div>

                  <div className="shrink-0">
                    {status === "loading" && (
                      <Badge variant="secondary">Processing</Badge>
                    )}
                    {status === "success" && (
                      <Badge className="bg-green-600 text-white">Finished</Badge>
                    )}
                    {status === "error" && <Badge variant="destructive">Failed</Badge>}
                    {status === "pending" && <Badge variant="outline">Pending</Badge>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-3 px-5 py-4 shadow-[inset_0_1px_0_rgba(0,0,0,0.06)]">
          {(running || done) && total > 0 && (
            <div className="space-y-1">
              <Progress value={progressPercent} />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>
                  <span className="font-medium text-green-600">{successCount} finished</span>
                  {" · "}
                  <span className={errorCount > 0 ? "font-medium text-destructive" : ""}>
                    {errorCount} failed
                  </span>
                  {" · "}
                  {total - processed} pending
                </span>
                <span className="font-medium">
                  {running
                    ? `Finishing ${Math.min(currentIndex + 1, total)} of ${total}...`
                    : `${progressPercent}%`}
                </span>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" disabled={running} onClick={handleClose}>
              {done ? "Close" : "Cancel"}
            </Button>
            <Button disabled={total === 0 || done || running} onClick={handleBulkFinish}>
              {running ? "Finishing..." : `Bulk Finish (${total})`}
            </Button>
          </div>
        </div>
      </div>
    </Drawer>
  );
}
