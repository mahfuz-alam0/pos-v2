"use client";

import { useState } from "react";
import { ChevronDown, Pencil, Ban } from "lucide-react";
import { toast } from "sonner";
import { setSpiffCampaignActive } from "@/services/spiffs/setActive";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function SpiffCampaignActions({
  campaignId,
  onEdit,
  onChanged,
}: {
  campaignId: string;
  onEdit: (campaignId: string) => void;
  onChanged: () => void;
}) {
  const [deactivating, setDeactivating] = useState(false);

  const handleDeactivate = async () => {
    setDeactivating(true);
    try {
      await setSpiffCampaignActive(campaignId, false);
      toast.success("Spiff deactivated");
      onChanged();
    } catch (err: any) {
      toast.error(err?.message || "Failed to deactivate spiff");
    } finally {
      setDeactivating(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="sm" className="size-8 shrink-0 p-0" />}>
        <ChevronDown className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuItem className="gap-2 whitespace-nowrap" onClick={() => onEdit(campaignId)}>
          <Pencil className="size-4 text-sky-600" />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem className="gap-2 whitespace-nowrap" variant="destructive" disabled={deactivating} onClick={handleDeactivate}>
          <Ban className="size-4" />
          Deactivate
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
