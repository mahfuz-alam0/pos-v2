"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ArrowDownToLine, ArrowUpFromLine, X } from "lucide-react";

import { useShop } from "@/context/shop-context";
import { depositToVault } from "@/services/vault/deposit";
import { withdrawFromVault } from "@/services/vault/withdraw";

import Drawer from "@/components/ui/Drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/admin/form-fields";

interface VaultActionDialogProps {
  open: boolean;
  mode: "deposit" | "withdraw";
  onClose: () => void;
  onDone: () => void;
}

export default function VaultActionDialog({ open, mode, onClose, onDone }: VaultActionDialogProps) {
  const { shopId } = useShop();
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setAmount("");
    setReason("");
  };

  const handleClose = () => {
    if (saving) return;
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    if (!shopId) return;
    const numericAmount = Number(amount);
    if (!numericAmount || numericAmount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    setSaving(true);
    try {
      if (mode === "deposit") {
        await depositToVault(shopId as string, { amount: numericAmount, reason });
        toast.success("Deposit successful");
      } else {
        await withdrawFromVault(shopId as string, { amount: numericAmount, reason });
        toast.success("Withdrawal successful");
      }
      reset();
      onDone();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || `Failed to ${mode}`);
    } finally {
      setSaving(false);
    }
  };

  const isDeposit = mode === "deposit";
  const Icon = isDeposit ? ArrowDownToLine : ArrowUpFromLine;

  return (
    <Drawer open={open} onClose={handleClose} side="right" size={420}>
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-3 px-5 py-4 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)]">
          <div className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${isDeposit ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`}>
            <Icon className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-base font-semibold leading-tight">{isDeposit ? "Manage Deposit" : "Manage Withdrawal"}</div>
            <div className="text-xs leading-tight text-muted-foreground">
              {isDeposit ? "Add cash to the main vault" : "Remove cash from the main vault"}
            </div>
          </div>
          <Button variant="outline" size="icon-sm" onClick={handleClose} disabled={saving}>
            <X className="size-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="flex flex-col gap-4">
            <Field label="Amount" required>
              <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount to transfer" />
            </Field>
            <Field label="Reason (optional)">
              <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason to transfer" rows={4} />
            </Field>
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 shadow-[inset_0_1px_0_rgba(0,0,0,0.06)]">
          <Button variant="outline" onClick={handleClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? "Saving..." : isDeposit ? "Deposit" : "Withdrawal"}
          </Button>
        </div>
      </div>
    </Drawer>
  );
}
