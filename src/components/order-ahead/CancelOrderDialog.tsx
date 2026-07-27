"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useShop } from "@/context/shop-context";
import { cancelPreSale } from "@/services/orderAhead/cancelPreSale";
import ProxyPinDialog from "./ProxyPinDialog";
import { usePinGatedAction } from "./usePinGatedAction";

export default function CancelOrderDialog({ open, onClose, preSale, onCancelled }) {
  const { shopId } = useShop();
  const [loading, setLoading] = useState(false);

  const submit = async (proxyPin) => {
    setLoading(true);
    try {
      await cancelPreSale({ shopId, preSaleId: preSale.id, proxyPin });
      toast.success("Order cancelled successfully");
      onCancelled?.();
      onClose();
    } catch (err) {
      toast.error(err?.message || "Failed to cancel order");
    } finally {
      setLoading(false);
    }
  };

  const { run, pinDialogOpen, closePinDialog, submitPin } = usePinGatedAction(submit);

  if (!preSale) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel order #{preSale.advertisedId}?</DialogTitle>
            <DialogDescription>This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Keep order
            </Button>
            <Button variant="destructive" onClick={() => run()} disabled={loading}>
              {loading ? "Cancelling..." : "Cancel order"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ProxyPinDialog
        open={pinDialogOpen}
        onClose={closePinDialog}
        onSubmit={submitPin}
        title="Enter PIN to cancel order"
      />
    </>
  );
}
