"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { LogOut, X } from "lucide-react";

import { useShop } from "@/context/shop-context";
import { discloseDrawer } from "@/services/registers/discloseDrawer";
import { getDrawerActiveSummary } from "@/services/registers/getDrawerSummary";

import Drawer from "@/components/ui/Drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/admin/form-fields";
import DenominationCounter from "./DenominationCounter";

interface CloseDrawerDrawerProps {
  open: boolean;
  drawer: any;
  onClose: () => void;
  onDone: () => void;
}

function amountColor(counted: number, expected: number) {
  if (counted < expected) return "text-destructive";
  if (Math.abs(counted - expected) < 0.01) return "text-primary";
  return "text-emerald-600";
}

export default function CloseDrawerDrawer({ open, drawer, onClose, onDone }: CloseDrawerDrawerProps) {
  const { shopId } = useShop();
  const [activeSummary, setActiveSummary] = useState<any>(null);
  const [countType, setCountType] = useState<"cashDenominations" | "flatUpdate">("cashDenominations");
  const [denominationValues, setDenominationValues] = useState<Record<string, number>>({});
  const [cashTotal, setCashTotal] = useState(0);
  const [virtualBalance, setVirtualBalance] = useState("0");
  const [cashAdjustmentReason, setCashAdjustmentReason] = useState("");
  const [virtualAdjustmentReason, setVirtualAdjustmentReason] = useState("");
  const [closingNotes, setClosingNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !drawer?.id) return;
    setCountType("cashDenominations");
    setDenominationValues({});
    setCashTotal(0);
    setCashAdjustmentReason("");
    setVirtualAdjustmentReason("");
    setClosingNotes("");
    getDrawerActiveSummary(drawer.id).then((res) => {
      const summary = res?.data?.data ?? null;
      setActiveSummary(summary);
      const expectedVirtual =
        (summary?.virtualAmountStartedWith ?? 0) + (summary?.totalVirtualCredit ?? 0) - (summary?.totalVirtualDebit ?? 0);
      setVirtualBalance(expectedVirtual.toFixed(2));
    });
  }, [open, drawer?.id]);

  const expectedCashAmount =
    (activeSummary?.cashAmountStartedWith ?? 0) + (activeSummary?.totalCashCredit ?? 0) - (activeSummary?.totalCashDebit ?? 0);
  const expectedVirtualAmount =
    (activeSummary?.virtualAmountStartedWith ?? 0) + (activeSummary?.totalVirtualCredit ?? 0) - (activeSummary?.totalVirtualDebit ?? 0);

  const virtualAmount = parseFloat(virtualBalance || "0");
  const shouldShowCashAdjustment = Math.abs(cashTotal - expectedCashAmount) > 0.001;
  const shouldShowVirtualAdjustment = Math.abs(virtualAmount - expectedVirtualAmount) > 0.001;

  const handleSave = async () => {
    if (!shopId || !drawer) return;
    if (shouldShowCashAdjustment && !cashAdjustmentReason.trim()) {
      toast.error("Please provide a reason for the cash adjustment");
      return;
    }
    if (shouldShowVirtualAdjustment && !virtualAdjustmentReason.trim()) {
      toast.error("Please provide a reason for the virtual adjustment");
      return;
    }

    setSaving(true);
    try {
      await discloseDrawer(
        {
          closingCashBalance: cashTotal,
          closingVirtualBalance: virtualAmount,
          closingNotes: closingNotes || undefined,
          cashAdjustment: parseFloat((cashTotal - expectedCashAmount).toFixed(2)),
          virtualAdjustment: parseFloat((virtualAmount - expectedVirtualAmount).toFixed(2)),
          cashAdjustmentReason: shouldShowCashAdjustment ? cashAdjustmentReason : null,
          virtualAdjustmentReason: shouldShowVirtualAdjustment ? virtualAdjustmentReason : null,
          shopId,
          id: drawer.id,
          version: drawer.version,
        },
        drawer.id
      );
      toast.success("Drawer balanced successfully");
      onDone();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "An unexpected error occurred");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer open={open} onClose={saving ? undefined : onClose} side="right" size={640}>
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-3 px-5 py-4 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)]">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <LogOut className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-base font-semibold leading-tight">Balance Drawer (EOD)</div>
            <div className="text-xs leading-tight text-muted-foreground">Count and close out the drawer</div>
          </div>
          <Button variant="outline" size="icon-sm" onClick={onClose} disabled={saving}>
            <X className="size-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl border-l-4 border-slate-400 bg-muted/30 p-3 text-sm">
                <div className="mb-1 text-xs text-muted-foreground">Cash Started</div>
                <div className="font-semibold">${(activeSummary?.cashAmountStartedWith ?? 0).toFixed(2)}</div>
                <div className="mt-1 text-xs text-muted-foreground">In / Out</div>
                <div className="font-semibold text-emerald-600">${(activeSummary?.totalCashCredit ?? 0).toFixed(2)}</div>
                <div className="font-semibold text-destructive">${(activeSummary?.totalCashDebit ?? 0).toFixed(2)}</div>
              </div>
              <div className="rounded-xl border-l-4 border-violet-400 bg-muted/30 p-3 text-sm">
                <div className="mb-1 text-xs text-muted-foreground">Virtual Started</div>
                <div className="font-semibold">${(activeSummary?.virtualAmountStartedWith ?? 0).toFixed(2)}</div>
                <div className="mt-1 text-xs text-muted-foreground">In / Out</div>
                <div className="font-semibold text-emerald-600">${(activeSummary?.totalVirtualCredit ?? 0).toFixed(2)}</div>
                <div className="font-semibold text-destructive">${(activeSummary?.totalVirtualDebit ?? 0).toFixed(2)}</div>
              </div>
              <div className="rounded-xl border-l-4 border-primary bg-muted/30 p-3 text-sm">
                <div className="mb-1 text-xs text-muted-foreground">Expected Cash</div>
                <div className="font-bold text-primary">${expectedCashAmount.toFixed(2)}</div>
                <div className="mt-1 text-xs text-muted-foreground">Expected Virtual</div>
                <div className="font-bold text-primary">${expectedVirtualAmount.toFixed(2)}</div>
              </div>
            </div>

            <div className="flex rounded-lg bg-muted p-0.5">
              <button
                type="button"
                onClick={() => {
                  setCountType("cashDenominations");
                  setDenominationValues({});
                  setCashTotal(0);
                }}
                className={`flex-1 rounded-[7px] py-2 text-sm font-semibold transition-colors ${countType === "cashDenominations" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-background/60"}`}
              >
                Cash Denominations
              </button>
              <button
                type="button"
                onClick={() => {
                  setCountType("flatUpdate");
                  setCashTotal(0);
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
                  setCashTotal(total);
                }}
                label="Total Cash Counted"
              />
            ) : (
              <Field label="Cash Counted" required>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={cashTotal || ""}
                  onChange={(e) => setCashTotal(parseFloat(e.target.value) || 0)}
                />
              </Field>
            )}
            <div className={`text-xs font-medium ${amountColor(cashTotal, expectedCashAmount)}`}>
              Cash Entered: ${cashTotal.toFixed(2)} (Expected ${expectedCashAmount.toFixed(2)})
            </div>

            {shouldShowCashAdjustment && (
              <Field label="Cash Adjustment Reason" required>
                <Textarea
                  rows={3}
                  value={cashAdjustmentReason}
                  onChange={(e) => setCashAdjustmentReason(e.target.value)}
                  placeholder={`System Adjustment: ${cashTotal - expectedCashAmount >= 0 ? "+" : ""}$${(cashTotal - expectedCashAmount).toFixed(2)}`}
                />
              </Field>
            )}

            <Field label="Virtual Counted" required>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={virtualBalance}
                onChange={(e) => setVirtualBalance(e.target.value)}
              />
            </Field>
            <div className={`text-xs font-medium ${amountColor(virtualAmount, expectedVirtualAmount)}`}>
              Virtual Entered: ${virtualAmount.toFixed(2)} (Expected ${expectedVirtualAmount.toFixed(2)})
            </div>

            {shouldShowVirtualAdjustment && (
              <Field label="Virtual Adjustment Reason" required>
                <Textarea
                  rows={3}
                  value={virtualAdjustmentReason}
                  onChange={(e) => setVirtualAdjustmentReason(e.target.value)}
                  placeholder={`System Adjustment: ${virtualAmount - expectedVirtualAmount >= 0 ? "+" : ""}$${(virtualAmount - expectedVirtualAmount).toFixed(2)}`}
                />
              </Field>
            )}

            <Field label="Closing Notes">
              <Textarea rows={3} value={closingNotes} onChange={(e) => setClosingNotes(e.target.value)} placeholder="Add any additional notes..." />
            </Field>
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 shadow-[inset_0_1px_0_rgba(0,0,0,0.06)]">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Balancing..." : "Balance Drawer"}
          </Button>
        </div>
      </div>
    </Drawer>
  );
}
