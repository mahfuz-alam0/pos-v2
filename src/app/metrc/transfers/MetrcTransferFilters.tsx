"use client";

import { X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type MetrcTransferStatus = "pending" | "accepted" | "voided" | "incoming" | "outgoing";

const STATUS_OPTIONS: { value: MetrcTransferStatus; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "accepted", label: "Accepted" },
  { value: "voided", label: "Voided" },
  { value: "incoming", label: "Incoming" },
  { value: "outgoing", label: "Outgoing" },
];

export default function MetrcTransferFilters({
  status,
  onChange,
}: {
  status: MetrcTransferStatus | null;
  onChange: (status: MetrcTransferStatus | null) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Select
          items={[{ value: "__all__", label: "Select Status" }, ...STATUS_OPTIONS]}
          value={status ?? "__all__"}
          onValueChange={(v) => onChange(v === "__all__" ? null : (v as MetrcTransferStatus))}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Select Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All</SelectItem>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {status && (
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="gap-1 pr-1">
            <span className="font-semibold">Status:</span> {status}
            <button onClick={() => onChange(null)} className="rounded-full hover:bg-muted">
              <X className="size-3" />
            </button>
          </Badge>
        </div>
      )}
    </div>
  );
}
