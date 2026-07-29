"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { LayoutGrid, X } from "lucide-react";

import { useShop } from "@/context/shop-context";
import { startDrawer } from "@/services/registers/startDrawer";
import { getDrawerClosedSessionSummary } from "@/services/registers/getDrawerSummary";

import Drawer from "@/components/ui/Drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/admin/form-fields";
import DenominationCounter from "./DenominationCounter";

interface OpenDrawerDrawerProps {
  open: boolean;
  drawer: any;
  onClose: () => void;
  onDone: () => void;
}

export default function OpenDrawerDrawer({ open, drawer, onClose, onDone }: OpenDrawerDrawerProps) {
  const { shopId } = useShop();
  const [countType, setCountType] = useState<"cashDenominations" | "flatUpdate">("cashDenominations");
  const [denominationValues, setDenominationValues] = useState<Record<string, number>>({});
  const [cashTotal, setCashTotal] = useState(0);
  const [virtualBalance, setVirtualBalance] = useState("");
  const [notes, setNotes] = useState("");
  const [prevSummary, setPrevSummary] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCountType("cashDenominations");
    setDenominationValues({});
    setCashTotal(0);
    setVirtualBalance("");
    setNotes("");
    if (drawer?.id) {
      getDrawerClosedSessionSummary(drawer.id).then((res) => setPrevSummary(res?.data?.data ?? null));
    }
  }, [open, drawer?.id]);

  const handleSave = async () => {
    if (!shopId || !drawer) return;
    const startingCashBalance = countType === "cashDenominations" ? cashTotal : parseFloat(cashTotal.toFixed(2));
    const startingVirtualBalance = parseFloat(virtualBalance || "0");

    if (startingCashBalance <= 0 || startingVirtualBalance < 0) {
      toast.error("Please enter the counted cash balance and virtual balance in order to start the drawer");
      return;
    }

    setSaving(true);
    try {
      await startDrawer(
        {
          startingCashBalance,
          startingVirtualBalance,
          startingNotes: notes || undefined,
          shopId,
          id: drawer.id,
          version: drawer.version,
        },
        drawer.id
      );
      toast.success("Drawer started successfully");
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
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <LayoutGrid className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-base font-semibold leading-tight">Start Drawer</div>
            <div className="text-xs leading-tight text-muted-foreground">Count the opening cash balance</div>
          </div>
          <Button variant="outline" size="icon-sm" onClick={onClose} disabled={saving}>
            <X className="size-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="flex flex-col gap-4">
            {prevSummary && (
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border-l-4 border-primary bg-muted/30 p-3">
                  <div className="text-xs text-muted-foreground">Previous Closing Cash</div>
                  <div className="text-base font-bold">${(prevSummary.closingCashBalance ?? 0).toFixed(2)}</div>
                </div>
                <div className="rounded-xl border-l-4 border-violet-400 bg-muted/30 p-3">
                  <div className="text-xs text-muted-foreground">Previous Closing Virtual</div>
                  <div className="text-base font-bold">${(prevSummary.closingVirtualBalance ?? 0).toFixed(2)}</div>
                </div>
              </div>
            )}

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
                label="Total Opening Amount"
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

            <Field label="Notes">
              <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add any notes about starting the drawer..." />
            </Field>
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 shadow-[inset_0_1px_0_rgba(0,0,0,0.06)]">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Starting..." : "Start Drawer"}
          </Button>
        </div>
      </div>
    </Drawer>
  );
}
