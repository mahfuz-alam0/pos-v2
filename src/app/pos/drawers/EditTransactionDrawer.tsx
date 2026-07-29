"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Pencil, X } from "lucide-react";

import { useShop } from "@/context/shop-context";
import { updateDrawerTransaction } from "@/services/drawers/updateTransaction";

import Drawer from "@/components/ui/Drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/admin/form-fields";

interface EditTransactionDrawerProps {
  transaction: any;
  drawerId: string;
  onClose: () => void;
  onSaved: () => void;
}

type Method = "cash" | "virtual";
type Direction = "in" | "out";

export default function EditTransactionDrawer({ transaction, drawerId, onClose, onSaved }: EditTransactionDrawerProps) {
  const { shopId } = useShop();
  const [amount, setAmount] = useState("0");
  const [method, setMethod] = useState<Method>("cash");
  const [direction, setDirection] = useState<Direction>("in");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!transaction) return;
    const isCashCredit = (transaction.cashCredit ?? 0) > 0;
    const isCashDebit = (transaction.cashDebit ?? 0) > 0;
    const isVirtualCredit = (transaction.virtualCredit ?? 0) > 0;

    if (isCashCredit) {
      setMethod("cash");
      setDirection("in");
      setAmount(String(transaction.cashCredit));
    } else if (isCashDebit) {
      setMethod("cash");
      setDirection("out");
      setAmount(String(transaction.cashDebit));
    } else if (isVirtualCredit) {
      setMethod("virtual");
      setDirection("in");
      setAmount(String(transaction.virtualCredit));
    } else {
      setMethod("virtual");
      setDirection("out");
      setAmount(String(transaction.virtualDebit ?? 0));
    }
    setNotes(transaction.notes ?? "");
  }, [transaction]);

  const handleSave = async () => {
    if (!transaction || !shopId) return;
    const numericAmount = parseFloat(amount) || 0;

    setSaving(true);
    try {
      await updateDrawerTransaction({
        id: transaction.id,
        drawerId,
        sessionId: transaction.sessionId,
        notes,
        shopId,
        cashCredit: method === "cash" && direction === "in" ? numericAmount : 0,
        cashDebit: method === "cash" && direction === "out" ? numericAmount : 0,
        virtualCredit: method === "virtual" && direction === "in" ? numericAmount : 0,
        virtualDebit: method === "virtual" && direction === "out" ? numericAmount : 0,
      });
      toast.success("Transaction updated successfully");
      onSaved();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update transaction");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer open={!!transaction} onClose={saving ? undefined : onClose} side="right" size={440}>
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-3 px-5 py-4 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)]">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Pencil className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-base font-semibold leading-tight">Edit Transaction</div>
            <div className="text-xs leading-tight text-muted-foreground">Correct amount, method, or direction</div>
          </div>
          <Button variant="outline" size="icon-sm" onClick={onClose} disabled={saving}>
            <X className="size-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="flex flex-col gap-4">
            <Field label="Amount" required>
              <Input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </Field>

            <Field label="Payment Method">
              <div className="flex rounded-lg bg-muted p-0.5">
                {(["cash", "virtual"] as Method[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMethod(m)}
                    className={`flex-1 rounded-[7px] py-2 text-sm font-semibold capitalize transition-colors ${method === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-background/60"}`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Direction">
              <div className="flex rounded-lg bg-muted p-0.5">
                {(["in", "out"] as Direction[]).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDirection(d)}
                    className={`flex-1 rounded-[7px] py-2 text-sm font-semibold capitalize transition-colors ${direction === d ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-background/60"}`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Notes">
              <Textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </Field>
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 shadow-[inset_0_1px_0_rgba(0,0,0,0.06)]">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>
    </Drawer>
  );
}
