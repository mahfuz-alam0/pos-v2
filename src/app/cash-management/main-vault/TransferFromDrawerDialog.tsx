"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowRightLeft, X } from "lucide-react";

import { useShop } from "@/context/shop-context";
import { fetchTransactionDrawers } from "@/services/transactions/listDrawers";
import { depositToVaultFromDrawer } from "@/services/vault/depositFromDrawer";

import Drawer from "@/components/ui/Drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field } from "@/components/admin/form-fields";

interface TransferFromDrawerDialogProps {
  open: boolean;
  onClose: () => void;
  onDone: () => void;
}

export default function TransferFromDrawerDialog({ open, onClose, onDone }: TransferFromDrawerDialogProps) {
  const { shopId } = useShop();
  const [drawers, setDrawers] = useState<{ id: string | number; name: string }[]>([]);
  const [drawerId, setDrawerId] = useState("");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !shopId) return;
    fetchTransactionDrawers(shopId as string, 100).then((res) => setDrawers(res?.data ?? []));
  }, [open, shopId]);

  const reset = () => {
    setDrawerId("");
    setAmount("");
    setReason("");
  };

  const handleClose = () => {
    if (saving) return;
    reset();
    onClose();
  };

  const handleTransfer = async () => {
    if (!shopId) return;
    if (!drawerId) {
      toast.error("Please select a drawer");
      return;
    }
    const numericAmount = Number(amount);
    if (!numericAmount || numericAmount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    setSaving(true);
    try {
      await depositToVaultFromDrawer(shopId as string, { drawerId, amount: numericAmount, reason });
      toast.success("Deposited successfully");
      reset();
      onDone();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Failed to deposit");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer open={open} onClose={handleClose} side="right" size={420}>
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-3 px-5 py-4 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)]">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <ArrowRightLeft className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-base font-semibold leading-tight">Transfer From Drawer</div>
            <div className="text-xs leading-tight text-muted-foreground">Move drawer cash into the main vault</div>
          </div>
          <Button variant="outline" size="icon-sm" onClick={handleClose} disabled={saving}>
            <X className="size-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="flex flex-col gap-4">
            <Field label="Drawer" required>
              <Select
                items={[{ value: "", label: "Select a drawer" }, ...drawers.map((d) => ({ value: String(d.id), label: d.name }))]}
                value={drawerId}
                onValueChange={setDrawerId}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a drawer" />
                </SelectTrigger>
                <SelectContent>
                  {drawers.map((d) => (
                    <SelectItem key={d.id} value={String(d.id)}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Amount" required>
              <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount to transfer" />
            </Field>
            <Field label="Reason">
              <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="What is the reason for transfer?" rows={4} />
            </Field>
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 shadow-[inset_0_1px_0_rgba(0,0,0,0.06)]">
          <Button variant="outline" onClick={handleClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleTransfer} disabled={saving}>
            {saving ? "Transferring..." : "Transfer"}
          </Button>
        </div>
      </div>
    </Drawer>
  );
}
