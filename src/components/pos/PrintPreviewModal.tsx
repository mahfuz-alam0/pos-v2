"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

// "Check Label"'s Tauri-desktop counterpart to a browser's native
// window.print() preview popup — the desktop webview has no such dialog to
// fall back to, so this renders the exact same rasterized image
// (renderNodeToImage) in-app instead.
export default function PrintPreviewModal({ open, onClose, imageUrl, title = "Preview" }) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose?.()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="flex min-h-40 items-center justify-center rounded-lg bg-muted/40 p-4">
          {imageUrl ? (
            <img src={imageUrl} alt={title} className="max-w-full rounded ring-1 ring-foreground/10" />
          ) : (
            <span className="text-sm text-muted-foreground">Generating preview…</span>
          )}
        </div>

        <DialogFooter className="border-t-0">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
