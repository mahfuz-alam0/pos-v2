"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { X } from "lucide-react";

import { fetchSingleDeliveryJob } from "@/services/deliveryJobs/getSingle";
import { useShop } from "@/context/shop-context";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

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
}

export default function JobDetailsPanel({ jobId, onClose }: JobDetailsPanelProps) {
  const { shopId } = useShop();
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!jobId || !shopId) return;
    setLoading(true);
    fetchSingleDeliveryJob(jobId, shopId)
      .then((res) => setJob(res?.data ?? null))
      .catch(() => toast.error("Failed to load job details"))
      .finally(() => setLoading(false));
  }, [jobId, shopId]);

  return (
    <div className="flex w-1/3 shrink-0 flex-col overflow-hidden rounded-xl ring-1 ring-foreground/10">
      <div className="flex items-center justify-between px-4 py-3">
        <h2 className="text-sm font-semibold">Job Details</h2>
        <Button variant="outline" size="icon" onClick={onClose} className="size-7 shrink-0">
          <X className="size-4" />
        </Button>
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

            <div>
              <p className="mb-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">Job Info</p>
              <div className="flex flex-col gap-2">
                <Row label="Cycle Count" value={job.cycleCount != null ? String(job.cycleCount) : null} />
                <Row label="Created" value={formatDate(job.createdAt)} />
                <Row label="Updated" value={formatDate(job.updatedAt)} />
              </div>
            </div>

            {(job.initiationDocumentUrls?.length > 0 || job.completionDocumentUrls?.length > 0) && (
              <div>
                <p className="mb-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">Documents</p>
                <div className="flex flex-col gap-2">
                  {job.initiationDocumentUrls?.map((url: string, i: number) => (
                    <a key={`init-${i}`} href={url} target="_blank" rel="noreferrer" className="text-sm text-primary underline">
                      Initiation Document {i + 1}
                    </a>
                  ))}
                  {job.completionDocumentUrls?.map((url: string, i: number) => (
                    <a key={`comp-${i}`} href={url} target="_blank" rel="noreferrer" className="text-sm text-primary underline">
                      Completion Document {i + 1}
                    </a>
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
