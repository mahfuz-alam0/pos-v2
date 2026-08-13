"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Loader2, Printer, X } from "lucide-react";

import { useShop } from "@/context/shop-context";
import { getAutoPrintPreference, setAutoPrintPreference } from "@/services/registers/printPreference";

import Drawer from "@/components/ui/Drawer";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

interface ManageHardwareDialogProps {
  open: boolean;
  register: { id: string; name: string } | null;
  onClose: () => void;
}

export default function ManageHardwareDialog({ open, register, onClose }: ManageHardwareDialogProps) {
  const { shopId } = useShop();
  const [loading, setLoading] = useState(false);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (!open || !register || !shopId) return;
    setLoading(true);
    getAutoPrintPreference(shopId as string, register.id)
      .then((res) => setEnabled(!!res?.data?.data?.isAutomatedSalesReceiptEnabled))
      .catch(() => {
        toast.error("Failed to load auto-print preference");
        setEnabled(false);
      })
      .finally(() => setLoading(false));
  }, [open, register, shopId]);

  const handleToggle = async (checked: boolean) => {
    if (!register || !shopId) return;
    setLoading(true);
    try {
      await setAutoPrintPreference(shopId as string, register.id, checked);
      setEnabled(checked);
      toast.success(`Auto-print ${checked ? "enabled" : "disabled"} successfully for ${register.name}`);
    } catch {
      toast.error("Failed to update auto-print preference");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Drawer open={open} onClose={onClose} side="right" size={420}>
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-3 px-5 py-4 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)]">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Printer className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-base font-semibold leading-tight">Manage Hardware</div>
            <div className="truncate text-xs leading-tight text-muted-foreground">{register?.name ?? ""}</div>
          </div>
          <Button variant="outline" size="icon-sm" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="flex flex-col gap-4">
            <div>
              <div className="text-sm font-semibold">Auto-Print Settings</div>
              <p className="mt-0.5 text-sm text-muted-foreground">Configure automatic receipt printing for this register.</p>
            </div>

            <div className="flex items-center justify-between gap-4 rounded-lg bg-muted/30 p-4 ring-1 ring-foreground/10">
              <div className="flex-1">
                <div className="text-sm font-medium">Automated Sales Receipt Printing</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Automatically print receipts when sales are completed on this register
                </div>
              </div>
              {loading ? (
                <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
              ) : (
                <Switch checked={enabled} onCheckedChange={handleToggle} />
              )}
            </div>

            {enabled && (
              <div className="flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-300">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
                <span>Auto-print is enabled. Receipts will be printed automatically when sales are completed.</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 shadow-[inset_0_1px_0_rgba(0,0,0,0.06)]">
          <Button variant="outline" className="h-9! rounded! px-3.5! text-[14px]! font-normal!" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Drawer>
  );
}
