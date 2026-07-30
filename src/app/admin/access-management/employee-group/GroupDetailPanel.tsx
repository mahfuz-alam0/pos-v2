"use client";

import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function GroupDetailPanel({ group, onClose }: { group: any; onClose: () => void }) {
  const permissionCodes = Object.keys(group?.permissionCodeActionEffectMap ?? {});

  return (
    <div className="flex flex-col gap-3 rounded-xl ring-1 ring-foreground/10">
      <div className="flex items-center justify-between gap-3 px-4 py-3 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)]">
        <div className="text-sm font-semibold">Group Details</div>
        <Button variant="outline" size="icon-sm" onClick={onClose}>
          <X className="size-4" />
        </Button>
      </div>

      <div className="flex flex-col gap-2 px-4 pb-2 text-sm">
        <div className="flex items-center justify-between border-b border-foreground/5 pb-2">
          <span className="text-muted-foreground">Name</span>
          <span className="font-medium">{group?.name ?? "-"}</span>
        </div>
        <div className="flex items-center justify-between border-b border-foreground/5 pb-2">
          <span className="text-muted-foreground">Shop Preference</span>
          <span className="font-medium">{group?.shopPreference ?? "-"}</span>
        </div>
      </div>

      <div className="flex flex-col gap-2 px-4 pb-4">
        <div className="text-xs font-semibold text-muted-foreground uppercase">Permissions</div>
        <div className="flex flex-wrap gap-1.5">
          {permissionCodes.length === 0 && <span className="text-sm text-muted-foreground">None</span>}
          {permissionCodes.map((code) => (
            <Badge key={code} variant="secondary">
              {code}: ({(group.permissionCodeActionEffectMap[code] ?? []).join(", ")})
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}
