"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Receipt, X } from "lucide-react";

import { useShop } from "@/context/shop-context";
import { getDrawerSessionDetails } from "@/services/drawers/getSessionDetails";
import { approveDrawerAdjustment } from "@/services/drawers/approveAdjustment";

import Drawer from "@/components/ui/Drawer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Field } from "@/components/admin/form-fields";

function money(v: number | undefined) {
  return `$${(v ?? 0).toFixed(2)}`;
}

interface SessionDetailDrawerProps {
  session: any;
  drawerId: string;
  onClose: () => void;
  onApproved: () => void;
}

export default function SessionDetailDrawer({ session, drawerId, onClose, onApproved }: SessionDetailDrawerProps) {
  const { shopId } = useShop();
  const [details, setDetails] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [cashAdjustmentReason, setCashAdjustmentReason] = useState("");
  const [virtualAdjustmentReason, setVirtualAdjustmentReason] = useState("");
  const [approving, setApproving] = useState(false);

  useEffect(() => {
    if (!session?.id || !shopId) return;
    setLoading(true);
    setCashAdjustmentReason("");
    setVirtualAdjustmentReason("");
    getDrawerSessionDetails({ drawerId, sessionId: session.id, shopId })
      .then((res) => setDetails(res?.data ?? null))
      .finally(() => setLoading(false));
  }, [session?.id, drawerId, shopId]);

  const handleApprove = async () => {
    if (!session || !shopId) return;
    setApproving(true);
    try {
      await approveDrawerAdjustment({
        shopId,
        drawerId,
        sessionId: session.id,
        cashAdjustment: session.cashAdjustment ?? 0,
        virtualAdjustment: session.virtualAdjustment ?? 0,
        cashAdjustmentReason: cashAdjustmentReason || undefined,
        virtualAdjustmentReason: virtualAdjustmentReason || undefined,
      });
      toast.success("Adjustment approved");
      onApproved();
    } catch (err: any) {
      toast.error(err?.message || "Failed to approve adjustment");
    } finally {
      setApproving(false);
    }
  };

  return (
    <Drawer open={!!session} onClose={onClose} side="right" size={480}>
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-3 px-5 py-4 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)]">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Receipt className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-base font-semibold leading-tight">Session {session?.id}</div>
            <div className="text-xs leading-tight text-muted-foreground">Cash summary and adjustments</div>
          </div>
          <Button variant="outline" size="icon-sm" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-4 w-full animate-pulse rounded bg-muted" />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Status</span>
                <Badge variant={session?.isOpen ? "default" : "destructive"}>{session?.isOpen ? "Open" : "Closed"}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Opened By</span>
                <span className="font-medium">{session?.openedBy?.name ?? "-"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Closed By</span>
                <span className="font-medium">{session?.closedBy?.name ?? "-"}</span>
              </div>

              <div className="flex flex-col gap-2 rounded-lg bg-muted/30 p-3">
                <div className="text-xs font-semibold text-muted-foreground uppercase">Cash</div>
                <div className="flex justify-between"><span>Opening</span><span className="font-mono">{money(session?.startingCashBalance)}</span></div>
                <div className="flex justify-between"><span>Closing</span><span className="font-mono">{money(session?.closingCashBalance)}</span></div>
                <div className="flex justify-between"><span>Adjusted</span><span className="font-mono">{money(session?.cashAdjustment)}</span></div>
              </div>

              <div className="flex flex-col gap-2 rounded-lg bg-muted/30 p-3">
                <div className="text-xs font-semibold text-muted-foreground uppercase">Virtual</div>
                <div className="flex justify-between"><span>Opening</span><span className="font-mono">{money(session?.startingVirtualBalance)}</span></div>
                <div className="flex justify-between"><span>Closing</span><span className="font-mono">{money(session?.closingVirtualBalance)}</span></div>
                <div className="flex justify-between"><span>Adjusted</span><span className="font-mono">{money(session?.virtualAdjustment)}</span></div>
              </div>

              {details?.transactions?.length > 0 && (
                <div className="flex flex-col gap-2">
                  <div className="text-xs font-semibold text-muted-foreground uppercase">Transactions</div>
                  {details.transactions.map((t: any) => (
                    <div key={t.id} className="flex justify-between border-b border-foreground/5 py-1.5 text-xs">
                      <span>{t.event}</span>
                      <span className="font-mono">
                        {money((t.cashCredit ?? 0) - (t.cashDebit ?? 0) + (t.virtualCredit ?? 0) - (t.virtualDebit ?? 0))}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {session?.isAdjustmentPending && (
                <div className="flex flex-col gap-3 rounded-lg border border-destructive/20 bg-destructive/5 p-3">
                  <div className="text-xs font-semibold text-destructive uppercase">Approve Adjustment</div>
                  <Field label="Cash Adjustment Reason">
                    <Textarea rows={2} value={cashAdjustmentReason} onChange={(e) => setCashAdjustmentReason(e.target.value)} />
                  </Field>
                  <Field label="Virtual Adjustment Reason">
                    <Textarea rows={2} value={virtualAdjustmentReason} onChange={(e) => setVirtualAdjustmentReason(e.target.value)} />
                  </Field>
                  <Button onClick={handleApprove} disabled={approving}>
                    {approving ? "Approving..." : "Approve Adjustment"}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Drawer>
  );
}
