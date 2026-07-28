"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { updatePurchaseOrderLineItem } from "@/services/purchaseOrders/updateLineItem";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { PurchaseOrderLineItem } from "./types";

export default function EditLineItemDialog({
  lineItem,
  poId,
  shopId,
  onClose,
  onSaved,
}: {
  lineItem: PurchaseOrderLineItem | null;
  poId: string;
  shopId?: string | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [orderedQty, setOrderedQty] = useState("");
  const [receivedQty, setReceivedQty] = useState("");
  const [costPerUnit, setCostPerUnit] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (lineItem) {
      setOrderedQty(lineItem.orderedQty != null ? String(lineItem.orderedQty) : "");
      setReceivedQty(lineItem.receivedQty != null ? String(lineItem.receivedQty) : "");
      setCostPerUnit(lineItem.costPerUnit != null ? String(lineItem.costPerUnit) : "");
    }
  }, [lineItem]);

  const handleSave = async () => {
    if (!lineItem || !shopId) return;
    setSaving(true);
    try {
      await updatePurchaseOrderLineItem(poId, lineItem.id, shopId, {
        orderedQty: orderedQty === "" ? undefined : parseFloat(orderedQty),
        receivedQty: receivedQty === "" ? undefined : parseFloat(receivedQty),
        costPerUnit: costPerUnit === "" ? undefined : parseFloat(costPerUnit),
      });
      toast.success("Line item updated");
      onSaved();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update line item");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!lineItem} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Line Item</DialogTitle>
        </DialogHeader>

        {lineItem && (
          <div className="flex flex-col gap-3">
            <p className="text-sm font-medium">{lineItem.productNameSnapshot}</p>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Ordered Qty</label>
              <Input type="number" min={0} step={1} value={orderedQty} onChange={(e) => setOrderedQty(e.target.value)} />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Received Qty</label>
              <Input type="number" min={0} step={1} value={receivedQty} onChange={(e) => setReceivedQty(e.target.value)} />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Cost / Unit</label>
              <Input type="number" min={0} step={0.01} value={costPerUnit} onChange={(e) => setCostPerUnit(e.target.value)} />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button className="w-full" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
