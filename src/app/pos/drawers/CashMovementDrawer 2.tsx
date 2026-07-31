"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowDownCircle, ArrowUpCircle, X } from "lucide-react";

import { useShop } from "@/context/shop-context";
import { depositDrawerCash, withdrawDrawerCash } from "@/services/registers/adjustDrawerCash";

import Drawer from "@/components/ui/Drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/admin/form-fields";
import DenominationCounter, { buildCashDenominationRecord } from "./DenominationCounter";

interface CashMovementDrawerProps {
  open: boolean;
  mode: "deposit" | "withdraw";
  drawer: any;
  onClose: () => void;
  onDone: () => void;
}

export default function CashMovementDrawer({ open, mode, drawer, onClose, onDone }: CashMovementDrawerProps) {
  const { shopId } = useShop();
  const [countType, setCountType] = useState<"cashDenominations" | "flatUpdate">("cashDenominations");
  const [denominationValues, setDenominationValues] = useState<Record<string, number>>({});
  const [amount, setAmount] = useState(0);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const isDeposit = mode === "deposit";

  useEffect(() => {
    if (!open) return;
    setCountType("cashDenominations");
    setDenominationValues({});
    setAmount(0);
    setReason("");
  }, [open]);

  const handleSave = async () => {
    if (!shopId || !drawer) return;
    if (amount <= 0) {
      toast.error(`Please enter a valid ${mode} amount`);
      return;
    }
    if (!reason.trim()) {
      toast.error("Please input reason!");
      return;
    }

    setSaving(true);
    try {
      const body = {
        amount,
        reason,
        id: drawer.id,
        shopId,
        cashDenominationRecord: countType === "cashDenominations" ? buildCashDenominationRecord(denominationValues) : [],
      };
      if (isDeposit) {
        await depositDrawerCash(body, drawer.id);
      } else {
        await withdrawDrawerCash(body, drawer.id);
      }
      toast.success(`Cash ${isDeposit ? "deposit" : "withdrawal"} successful`);
      onDone();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "An unexpected error occurred");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer open={open} onClose={saving ? undefined : onClose} side="right" size={560}>
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-3 px-5 py-4 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)]">
          <div className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${isDeposit ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"}`}>
            {isDeposit ? <ArrowDownCircle className="size-4" /> : <ArrowUpCircle className="size-4" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-base font-semibold leading-tight">{isDeposit ? "Deposit Cash" : "Withdraw Cash"}</div>
            <div className="text-xs leading-tight text-muted-foreground">
              {isDeposit ? "Add cash to the drawer" : "Remove cash from the drawer"}
            </div>
          </div>
          <Button variant="outline" size="icon-sm" onClick={onClose} disabled={saving}>
            <X className="size-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="flex flex-col gap-4">
            <div className="flex rounded-lg bg-muted p-0.5">
              <button
                type="button"
                onClick={() => {
                  setCountType("cashDenominations");
                  setDenominationValues({});
                  setAmount(0);
                }}
                className={`flex-1 rounded-[7px] py-2 text-sm font-semibold transition-colors ${countType === "cashDenominations" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-background/60"}`}
              >
                Cash Denominations
              </button>
              <button
                type="button"
                onClick={() => {
                  setCountType("flatUpdate");
                  setAmount(0);
                }}
                className={`flex-1 rounded-[7px] py-2 text-sm font-semibold transition-colors ${countType === "flatUpdate" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-background/60"}`}
              >
                Flat Update
              </button>
            </div>

            {countType === "cashDenominations" ? (
              <DenominationCounter
                values={denominationValues}
                onChange={(v, total) => {
                  setDenominationValues(v);
                  setAmount(total);
                }}
                label={`Total ${isDeposit ? "Deposit" : "Withdrawal"} Amount`}
              />
            ) : (
              <Field label="Amount" required>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={amount || ""}
                  onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                />
              </Field>
            )}

            <Field label="Reason" required>
              <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder={`Enter reason for ${mode}`} />
            </Field>
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 shadow-[inset_0_1px_0_rgba(0,0,0,0.06)]">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : isDeposit ? "Deposit Cash" : "Withdraw Cash"}
          </Button>
        </div>
      </div>
    </Drawer>
  );
}
