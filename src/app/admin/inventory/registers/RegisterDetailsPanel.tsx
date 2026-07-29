import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface RegisterDetailsPanelProps {
  register: any;
  onClose: () => void;
}

export default function RegisterDetailsPanel({ register, onClose }: RegisterDetailsPanelProps) {
  const rows = [
    { label: "Name", value: register?.name ?? "N/A" },
    { label: "Associated Employees", value: register?.employees?.map((e: any) => e?.name).join(", ") || "N/A" },
    { label: "Associated Drawers", value: register?.drawers?.map((d: any) => d?.name).join(", ") || "N/A" },
  ];

  return (
    <div className="flex flex-col gap-3 rounded-xl ring-1 ring-foreground/10">
      <div className="flex items-center justify-between gap-3 px-4 py-3 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)]">
        <div className="text-sm font-semibold">Register Details</div>
        <div className="flex items-center gap-2">
          <Badge variant={register?.isOpen ? "default" : "destructive"}>{register?.isOpen ? "Open" : "Closed"}</Badge>
          <Button variant="outline" size="icon-sm" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-2 px-4 pb-4 text-sm">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between border-b border-foreground/5 pb-2">
            <span className="w-2/5 text-muted-foreground">{row.label}</span>
            <span className="w-3/5 text-right font-medium">{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
