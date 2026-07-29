"use client";

import { AlertTriangle, X } from "lucide-react";

import Drawer from "@/components/ui/Drawer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface DeleteDrawerDrawerProps {
  drawer: { name: string; isOpen: boolean; lastOpenedBy?: { name: string } | null; lastClosedBy?: { name: string } | null } | null;
  loading: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function DeleteDrawerDrawer({ drawer, loading, onClose, onConfirm }: DeleteDrawerDrawerProps) {
  return (
    <Drawer open={!!drawer} onClose={() => !loading && onClose()} side="right" size={400}>
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-3 px-5 py-4 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)]">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
            <AlertTriangle className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-base font-semibold leading-tight">Delete Drawer</div>
            <div className="text-xs leading-tight text-muted-foreground">This action cannot be undone</div>
          </div>
          <Button variant="outline" size="icon-sm" onClick={onClose} disabled={loading}>
            <X className="size-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <p className="text-sm text-muted-foreground">Are you sure you want to delete this drawer?</p>

          <div className="mt-4 flex flex-col gap-3 rounded-lg border border-foreground/10 bg-muted/30 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Drawer Name</span>
              <span className="text-sm font-medium">{drawer?.name ?? "N/A"}</span>
            </div>
            {drawer?.lastOpenedBy?.name && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Last Opened By</span>
                <span className="text-sm font-medium">{drawer.lastOpenedBy.name}</span>
              </div>
            )}
            {drawer?.lastClosedBy?.name && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Last Closed By</span>
                <span className="text-sm font-medium">{drawer.lastClosedBy.name}</span>
              </div>
            )}
            {drawer?.isOpen !== undefined && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <Badge variant={drawer?.isOpen ? "default" : "destructive"}>{drawer?.isOpen ? "Open" : "Closed"}</Badge>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 shadow-[inset_0_1px_0_rgba(0,0,0,0.06)]">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={loading}>
            {loading ? "Deleting..." : "Delete"}
          </Button>
        </div>
      </div>
    </Drawer>
  );
}
