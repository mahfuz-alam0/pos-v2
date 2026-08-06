"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, X } from "lucide-react";

import { useShop } from "@/context/shop-context";
import { fetchSingleDeliveryJob } from "@/services/deliveryJobs/getSingle";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const TERMINAL_STATUSES = ["COMPLETED", "DISMISSED", "FAILED"];

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  WAITING_TO_START: "outline",
  IN_PROGRESS: "secondary",
  COMPLETED: "default",
  FAILED: "destructive",
  DISMISSED: "outline",
};

function formatDate(v?: string | null) {
  if (!v) return "N/A";
  const d = new Date(v);
  return `${d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} · ${d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })}`;
}

const METRC_STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  SUCCESS: "default",
  PENDING: "secondary",
  FAILED: "destructive",
};

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex items-start gap-2 border-b border-foreground/5 pb-2">
      <span className="w-32 shrink-0 text-sm text-muted-foreground">{label}</span>
      <span className="flex-1 text-sm font-medium">{value || "N/A"}</span>
    </div>
  );
}

interface JobDetailsPanelProps {
  jobId: string | number;
  onClose: () => void;
  refreshTick?: number;
  className?: string;
  onEdit?: (job: any) => void;
  onStart?: (job: any) => void;
  onComplete?: (job: any) => void;
  onDismiss?: (job: any) => void;
  onMarkFailed?: (job: any) => void;
  onDelete?: (job: any) => void;
}

export default function JobDetailsPanel({
  jobId,
  onClose,
  className,
  onEdit,
  onStart,
  onComplete,
  onDismiss,
  onMarkFailed,
  onDelete,
}: JobDetailsPanelProps) {
  const { shopId } = useShop();
  useEffect(() => {
    if (!jobId || !shopId) return;
    setLoading(true);
    fetchSingleDeliveryJob(jobId, shopId)
      .then((res) => setJob(res?.data ?? null))
      .catch(() => toast.error("Failed to load job details"))
      .finally(() => setLoading(false));
  }, [jobId, shopId, refreshTick]);

  return (
    <div className={cn("flex w-1/3 shrink-0 flex-col overflow-hidden rounded-xl ring-1 ring-foreground/10", className)}>
        <h2 className="text-sm font-semibold">Job Details</h2>
      </div>
      <div className="h-px bg-border" />

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {loading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-5 w-full" />
            ))}
          </div>
        ) : !job ? (
          <p className="py-4 text-sm text-muted-foreground">Failed to load job details.</p>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <div>
                <p className="text-xs text-muted-foreground">Sale ID</p>
                <p className="font-mono text-base font-semibold">{job.advertisedSaleId}</p>
              </div>
              <Badge variant={STATUS_VARIANT[job.status] || "outline"} className="ml-auto">
                {job.status?.replace(/_/g, " ")}
              </Badge>
            </div>

            <div className="flex flex-wrap gap-2">
              {onEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={TERMINAL_STATUSES.includes(job.status)}
                  onClick={() => onEdit(job)}>
                  Edit
                </Button>
              )}
              {onStart && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={["IN_PROGRESS", ...TERMINAL_STATUSES].includes(job.status)}
                  onClick={() => onStart(job)}>
                  Start
                </Button>
              )}
              {onComplete && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={TERMINAL_STATUSES.includes(job.status)}
                  onClick={() => onComplete(job)}>
                  Complete
                </Button>
              )}
              {onDismiss && (
                <Button
                  variant="outline"
                  size="sm"
                  className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  disabled={TERMINAL_STATUSES.includes(job.status)}
                  onClick={() => onDismiss(job)}>
                  Dismiss
                </Button>
              )}
              {onMarkFailed && (
                <Button
                  variant="outline"
                  size="sm"
                  className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  disabled={TERMINAL_STATUSES.includes(job.status)}
                  onClick={() => onMarkFailed(job)}>
                  Mark as Failed
                </Button>
              )}
              {onDelete && ["DISMISSED", "COMPLETED"].includes(job.status) && (
                <Button
                  variant="outline"
                  size="sm"
                  className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => onDelete(job)}>
                  Delete
                </Button>
              )}
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">Driver</p>
              <div className="flex flex-col gap-2">
                <Row label="Name" value={job.driverInfo?.name} />
                <Row label="Phone" value={job.driverInfo?.phone} />
                <Row label="Email" value={job.driverInfo?.email} />
                <Row label="License" value={job.driverInfo?.license} />
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">Vehicle</p>
              <div className="flex flex-col gap-2">
                <Row label="Name" value={job.vehicleInfo?.name} />
                <Row label="Make" value={job.vehicleInfo?.make} />
                <Row label="Model" value={job.vehicleInfo?.model} />
                <Row label="License Plate" value={job.vehicleInfo?.licensePlateData} />
                <Row label="Color" value={job.vehicleInfo?.color} />
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">Delivery Window</p>
              <div className="flex flex-col gap-2">
                <Row label="Departure" value={formatDate(job.deliveryEstimationWindow?.departureTimestamp)} />
                <Row label="Est. Arrival" value={formatDate(job.deliveryEstimationWindow?.estimatedArrivalTimestamp)} />
                <Row label="Planned Route" value={job.deliveryEstimationWindow?.plannedRoute} />
              </div>
            </div>

            {job.metrcReportingLogs?.length > 0 && (
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">METRC Reporting</p>
                  {job.metrcReportingStatus && (
                    <Badge variant={METRC_STATUS_VARIANT[job.metrcReportingStatus] || "outline"}>
                      {job.metrcReportingStatus}
                    </Badge>
                  )}
                </div>
                <div className="flex flex-col gap-3">
                  {[...job.metrcReportingLogs].reverse().map((log: any, i: number) => (
                    <div
                      key={i}
                      className={`border-l-2 pl-3 ${log.status === "FAILED" ? "border-destructive/40" : "border-primary/30"}`}>
                      <div className="flex items-center gap-1.5">
                        {log.status === "FAILED" && <AlertTriangle className="size-3 text-destructive" />}
                        <p className="text-sm font-medium">{log.step?.replace(/_/g, " ")}</p>
                        <Badge variant={METRC_STATUS_VARIANT[log.status] || "outline"} className="ml-auto">
                          {log.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{formatDate(log.timestamp)}</p>
                      {log.payloadResponse?.length > 0 && (
                        <ul className="mt-1.5 list-disc space-y-1 pl-4 text-xs text-muted-foreground">
                          {log.payloadResponse.map((p: any, idx: number) => (
                            <li key={idx}>{p.message}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {job.tracks?.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">Activity</p>
                <div className="flex flex-col gap-3">
                  {job.tracks.map((t: any, i: number) => (
                    <div key={i} className="border-l-2 border-primary/30 pl-3">
                      <p className="text-sm">{t.message}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(t.timestamp)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
