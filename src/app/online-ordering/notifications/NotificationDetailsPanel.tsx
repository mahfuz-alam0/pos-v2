import { X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import type { NotificationRow } from "./types";

function formatDate(date?: string) {
  if (!date) return "-";
  return new Date(date).toLocaleString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export default function NotificationDetailsPanel({
  data,
  onClose,
}: {
  data: NotificationRow;
  onClose: () => void;
}) {
  return (
    <div className="h-[85vh] overflow-y-auto rounded-xl bg-muted/30 p-4">
      <div className="mb-3 flex items-center justify-between">
        <Button variant="outline" size="icon-sm" onClick={onClose}>
          <X />
        </Button>
      </div>

      <h2 className="mb-3 text-lg font-semibold">Notification Details</h2>

      <div className="space-y-4 rounded-lg bg-background p-4 ring-1 ring-foreground/10">
        <div className="flex items-start justify-between gap-2">
          <div className="text-base font-semibold">{data.title}</div>
          <div className="flex shrink-0 gap-1.5">
            {data.subject && (
              <Badge variant={data.subject === "DEAL" ? "default" : "secondary"}>{data.subject}</Badge>
            )}
            {data.intentTo && (
              <Badge variant={data.intentTo === "ALL" ? "default" : "outline"}>{data.intentTo}</Badge>
            )}
          </div>
        </div>

        {data.imageUrl && (
          <div>
            <div className="mb-2 text-sm font-medium text-muted-foreground">Notification Image</div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={data.imageUrl} alt={data.title} className="h-[200px] w-[200px] rounded-md object-cover" />
          </div>
        )}

        <div className="rounded-lg bg-muted/50 p-3">
          <div className="mb-1 text-sm font-medium text-muted-foreground">Description</div>
          <p className="text-sm">{data.description || "-"}</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-muted/50 p-3">
            <div className="mb-1 text-sm font-medium text-muted-foreground">Sent At</div>
            <div className="text-sm">{formatDate(data.sentAt)}</div>
          </div>

          {data.scheduledAtDate && (
            <div className="rounded-lg bg-muted/50 p-3">
              <div className="mb-1 text-sm font-medium text-muted-foreground">Scheduled For</div>
              <div className="text-sm">
                {data.scheduledAtDate} {data.scheduledAtTwelveHours || ""}
              </div>
            </div>
          )}

          {data.dealId && (
            <div className="rounded-lg bg-muted/50 p-3">
              <div className="mb-1 text-sm font-medium text-muted-foreground">Deal ID</div>
              <div className="font-mono text-sm">{data.dealId}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
