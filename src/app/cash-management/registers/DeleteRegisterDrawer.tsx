"use client";

import { AlertTriangle, X } from "lucide-react";

import Drawer from "@/components/ui/Drawer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface DeleteRegisterDrawerProps {
  register: { name: string; isOpen: boolean } | null;
  loading: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function DeleteRegisterDrawer({ register, loading, onClose, onConfirm }: DeleteRegisterDrawerProps) {
  return (
    <Drawer open={!!register} onClose={() => !loading && onClose()} side="right" size={400}>
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-3 px-5 py-4 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)]">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
            <AlertTriangle className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-base font-semibold leading-tight">Delete Register</div>
            <div className="text-xs leading-tight text-muted-foreground">This action cannot be undone</div>
          </div>
          <Button variant="outline" size="icon-sm" onClick={onClose} disabled={loading}>
            <X className="size-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <p className="text-sm text-muted-foreground">Are you sure you want to delete this register?</p>

          <div className="mt-4 flex flex-col gap-3 rounded-lg bg-muted/30 p-4 ring-1 ring-foreground/10">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Register Name</span>
              <span className="text-sm font-medium">{register?.name ?? "N/A"}</span>
            </div>
            {register?.isOpen !== undefined && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <Badge variant={register?.isOpen ? "default" : "destructive"}>{register?.isOpen ? "Open" : "Closed"}</Badge>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 shadow-[inset_0_1px_0_rgba(0,0,0,0.06)]">
          <Button variant="outline" className="h-9! rounded! px-3.5! text-[14px]! font-normal!" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="destructive" className="h-9! rounded! px-3.5! text-[14px]! font-normal!" onClick={onConfirm} disabled={loading}>
            {loading ? "Deleting..." : "Delete"}
          </Button>
        </div>
      </div>
    </Drawer>
  );
}
