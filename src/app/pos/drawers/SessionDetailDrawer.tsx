"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import {
  ArrowDownToLine,
  ArrowLeftRight,
  CreditCard,
  Download,
  Percent,
  Printer,
  Receipt,
  ShoppingCart,
  Sigma,
  Vault,
  Wallet,
  X,
} from "lucide-react";

import { useShop } from "@/context/shop-context";
import { getShopTimezone } from "@/util/dateUtil";
import { getDrawerSessionDetails } from "@/services/drawers/getSessionDetails";
import { approveDrawerAdjustment } from "@/services/drawers/approveAdjustment";
import { printNode } from "@/components/pos/PrintReceiptModal";

import Drawer from "@/components/ui/Drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import DrawerReceiptContent, { computeReceiptValues } from "./DrawerReceiptModal";

function money(v: number | undefined) {
  return `$${(v ?? 0).toFixed(2)}`;
}

function fmt(v: string | undefined) {
  if (!v) return "-";
  return new Date(v).toLocaleString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: getShopTimezone() || undefined,
  });
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-muted/40 px-3 py-2.5">
      <p className="m-0 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">{label}</p>
      <p className="m-0 truncate text-sm font-semibold">{value}</p>
    </div>
  );
}

function SectionCard({ icon, title, badge, children }: { icon: React.ReactNode; title: string; badge?: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-4 py-2.5">
        <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">{icon}</span>
        <span className="text-sm font-semibold">{title}</span>
        {badge && <span className="ml-auto text-xs font-normal text-muted-foreground">{badge}</span>}
      </div>
      <div className="flex flex-col divide-y divide-border/60 px-4">{children}</div>
    </div>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone?: "positive" | "negative" }) {
  const toneClass = tone === "positive" ? "text-emerald-600" : tone === "negative" ? "text-destructive" : "";
  return (
    <div className="flex justify-between gap-3 py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-medium ${toneClass}`}>{value}</span>
    </div>
  );
}

interface SessionDetailDrawerProps {
  session: any;
  drawerId: string;
  drawerName?: string;
  onClose: () => void;
  onApproved: () => void;
}

export default function SessionDetailDrawer({ session, drawerId, drawerName, onClose, onApproved }: SessionDetailDrawerProps) {
  const { shopId } = useShop();
  const [details, setDetails] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [cashAdjustmentAmount, setCashAdjustmentAmount] = useState("0");
  const [virtualAdjustmentAmount, setVirtualAdjustmentAmount] = useState("0");
  const [cashAdjustmentReason, setCashAdjustmentReason] = useState("");
  const [virtualAdjustmentReason, setVirtualAdjustmentReason] = useState("");
  const [approving, setApproving] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!session?.id || !shopId) return;
    setLoading(true);
    setCashAdjustmentAmount("0");
    setVirtualAdjustmentAmount("0");
    setCashAdjustmentReason("");
    setVirtualAdjustmentReason("");
    getDrawerSessionDetails({ drawerId, drawerSessionId: session.id, shopId })
      .then((res) => {
        const data = res?.data ?? null;
        setDetails(data);
        // The pending adjustment awaiting approval — requestedCashAdjustment
        // etc — is a separate value from session.cashAdjustment (that's the
        // already-settled adjustment applied to a closed session).
        const summary = data?.summary;
        if (summary) {
          setCashAdjustmentAmount(String(summary.requestedCashAdjustment ?? 0));
          setVirtualAdjustmentAmount(String(summary.requestedVirtualAdjustment ?? 0));
          setCashAdjustmentReason(summary.requestedCashAdjustmentReason ?? "");
          setVirtualAdjustmentReason(summary.requestedVirtualAdjustmentReason ?? "");
        }
      })
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
        cashAdjustment: parseFloat(cashAdjustmentAmount) || 0,
        virtualAdjustment: parseFloat(virtualAdjustmentAmount) || 0,
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

  const transactions = details?.transactions ?? [];
  const salesTaxes = Array.isArray(details?.salesTaxes) ? details.salesTaxes : [];
  const v = computeReceiptValues(transactions);
  const totalTax = salesTaxes.reduce((s: number, t: any) => s + (t.amount || 0), 0);
  const totalVirtualSales = v.totalSales - v.cashSales;
  const finalTotal = v.totalSales + totalTax;
  const expectedCash = session?.expectedCashBalance;
  const actualCash = session?.closingCashBalance;
  const discrepancy = (actualCash ?? 0) - (expectedCash ?? 0);

  // Raw in/out totals across every transaction, cash and virtual separately —
  // ported from the old POS's "Deposits & Withdrawals" tiles.
  const cashIn = transactions.reduce((s: number, t: any) => s + (t.cashCredit || 0), 0);
  const cashOut = transactions.reduce((s: number, t: any) => s + (t.cashDebit || 0), 0);
  const virtualIn = transactions.reduce((s: number, t: any) => s + (t.virtualCredit || 0), 0);
  const virtualOut = transactions.reduce((s: number, t: any) => s + (t.virtualDebit || 0), 0);

  const handleExportPdf = () => {
    if (!session) return;
    const lines = [
      `Session Details`,
      `Session ID: ${session.id}`,
      `Status: ${session.isOpen ? "Active" : "Closed"}`,
      `Opened By: ${session.openedBy?.name ?? "-"}`,
      `Opened At: ${fmt(session.createdAt)}`,
      ...(session.isOpen ? [] : [`Closed By: ${session.closedBy?.name ?? "-"}`, `Closed At: ${fmt(session.updatedAt)}`]),
      ``,
      `Cash Summary`,
      `Opening Cash: ${money(session.startingCashBalance)}`,
      `Closing Cash: ${session.closingCashBalance != null ? money(session.closingCashBalance) : "-"}`,
      `Opening Virtual: ${money(session.startingVirtualBalance)}`,
      `Closing Virtual: ${session.closingVirtualBalance != null ? money(session.closingVirtualBalance) : "-"}`,
      `Expected Cash: ${money(expectedCash)}`,
      ``,
      `Deposits & Withdrawals (${transactions.length})`,
      `Cash In: ${money(cashIn)}`,
      `Cash Out: ${money(cashOut)}`,
      `Virtual In: ${money(virtualIn)}`,
      `Virtual Out: ${money(virtualOut)}`,
    ].join("\n");
    const blob = new Blob([lines], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `session-${session.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const discrepancyTone = discrepancy < 0 ? "negative" : discrepancy > 0 ? "positive" : undefined;

  return (
    <Drawer open={!!session} onClose={onClose} side="right" size={720}>
      <div className="flex h-full flex-col bg-muted/20">
        <div className="flex items-center gap-3 bg-background px-6 py-4 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)]">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Receipt className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-base font-semibold leading-tight">{drawerName || "Session Details"}</div>
            <div className="mt-0.5 flex items-center gap-2">
              <Badge variant={session?.isOpen ? "default" : "destructive"}>{session?.isOpen ? "Active" : "Closed"}</Badge>
              <span className="text-xs text-muted-foreground">Opened {fmt(session?.createdAt)}</span>
            </div>
          </div>
          <Button size="sm" variant="outline" disabled={loading} onClick={handleExportPdf}>
            <Download className="size-3.5" /> Export PDF
          </Button>
          <Button size="sm" variant="outline" disabled={loading} onClick={() => printNode(receiptRef.current)}>
            <Printer className="size-3.5" /> Print Receipt
          </Button>
          <Button variant="outline" size="icon-sm" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-16 w-full animate-pulse rounded-xl bg-muted" />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <StatTile label="Opened By" value={session?.openedBy?.name ?? "-"} />
                <StatTile label="Opened At" value={fmt(session?.createdAt)} />
                {!session?.isOpen && (
                  <>
                    <StatTile label="Closed By" value={session?.closedBy?.name ?? "-"} />
                    <StatTile label="Closed At" value={fmt(session?.updatedAt)} />
                  </>
                )}
                <StatTile label="Total Transactions" value={String(transactions.length)} />
                <StatTile label="Starting Balance" value={money(session?.startingCashBalance)} />
              </div>

              <SectionCard icon={<Wallet className="size-3.5" />} title="Cash Summary">
                <Row label="Opening Cash" value={money(session?.startingCashBalance)} />
                {session?.closingCashBalance != null && <Row label="Closing Cash" value={money(session.closingCashBalance)} />}
                <Row label="Opening Virtual" value={money(session?.startingVirtualBalance)} />
                {session?.closingVirtualBalance != null && <Row label="Closing Virtual" value={money(session.closingVirtualBalance)} />}
                <Row label="Expected Cash" value={money(expectedCash)} />
              </SectionCard>

              {transactions.length > 0 && (
                <SectionCard icon={<ArrowLeftRight className="size-3.5" />} title="Deposits & Withdrawals" badge={`${transactions.length} transactions`}>
                  <Row label="Cash In" value={money(cashIn)} tone="positive" />
                  <Row label="Cash Out" value={money(cashOut)} tone="negative" />
                  <Row label="Virtual In" value={money(virtualIn)} tone="positive" />
                  <Row label="Virtual Out" value={money(virtualOut)} tone="negative" />
                </SectionCard>
              )}

              <SectionCard icon={<ShoppingCart className="size-3.5" />} title="Sales">
                <Row label="Cash Sales" value={money(v.cashSales)} tone="positive" />
                <Row label="Total Sales" value={money(v.totalSales)} />
              </SectionCard>

              <SectionCard icon={<CreditCard className="size-3.5" />} title="Payments">
                <Row label="Total Cash In" value={money(v.totalCashIn)} />
                <Row label="Total Change Given" value={money(v.totalChangeGiven)} />
                <Row label="Cash Change Given" value={money(v.cashChangeGiven)} />
                <Row label="Cashless ATM (EC) Change" value={money(v.cashlessATMChange)} />
                <Row label="Total Cash Deposit" value={money(v.totalCashDeposit)} />
                <Row label="Total Cash Withdrawal" value={money(v.totalCashWithdrawal)} />
              </SectionCard>

              <SectionCard icon={<ArrowDownToLine className="size-3.5" />} title="Withdrawals" badge={`${v.withdrawals.length}`}>
                {v.withdrawals.length === 0 ? (
                  <div className="py-2 text-sm text-muted-foreground">No withdrawals</div>
                ) : (
                  v.withdrawals.map((t: any, i: number) => (
                    <Row key={t._id || i} label={`Withdraw ${i + 1} (${fmt(t.createdAt)})`} value={money(t.cashDebit)} />
                  ))
                )}
              </SectionCard>

              {salesTaxes.length > 0 && (
                <SectionCard icon={<Percent className="size-3.5" />} title="Taxes">
                  {salesTaxes.map((tax: any) => (
                    <Row key={tax.stringId || tax.name} label={`${tax.name} (${tax.taxRate}%)`} value={money(tax.amount)} />
                  ))}
                  <Row label="Tax Total" value={money(salesTaxes.reduce((s: number, t: any) => s + (t.amount || 0), 0))} />
                </SectionCard>
              )}

              <SectionCard icon={<Sigma className="size-3.5" />} title="Totals">
                <Row label="Total Cash" value={money(v.cashSales)} />
                <Row label="Total Virtual" value={money(totalVirtualSales)} />
                <Row label="Total Tax" value={money(totalTax)} />
                <Row label="Final Total" value={money(finalTotal)} tone="positive" />
              </SectionCard>

              <SectionCard icon={<Vault className="size-3.5" />} title="Cash Drawer">
                <Row label="Expected Cash" value={money(expectedCash)} />
                <Row label="Actual Cash" value={money(actualCash)} />
              </SectionCard>

              <div
                className={`flex items-center justify-between rounded-xl border px-4 py-3.5 ${
                  discrepancyTone === "negative"
                    ? "border-destructive/30 bg-destructive/5"
                    : discrepancyTone === "positive"
                      ? "border-emerald-500/30 bg-emerald-500/5"
                      : "border-border bg-muted/40"
                }`}>
                <span className="text-sm font-semibold">Closing Discrepancy Cash</span>
                <span
                  className={`text-lg font-bold ${
                    discrepancyTone === "negative" ? "text-destructive" : discrepancyTone === "positive" ? "text-emerald-600" : ""
                  }`}>
                  {discrepancy >= 0 ? "+" : ""}
                  {money(discrepancy)}
                </span>
              </div>

              {session?.isAdjustmentPending && (
                <div className="flex flex-col gap-3 rounded-xl border border-destructive/20 bg-destructive/5 p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-bold text-destructive">Adjustment Pending</div>
                    <Badge className="border border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-400">
                      Requires Approval
                    </Badge>
                  </div>

                  <div className="text-xs font-semibold text-destructive uppercase">Cash Adjustment</div>
                  <Input
                    type="number"
                    step="0.01"
                    value={cashAdjustmentAmount}
                    onChange={(e) => setCashAdjustmentAmount(e.target.value)}
                  />
                  <Textarea
                    rows={2}
                    placeholder="Cash adjustment reason..."
                    value={cashAdjustmentReason}
                    onChange={(e) => setCashAdjustmentReason(e.target.value)}
                  />

                  <div className="text-xs font-semibold text-destructive uppercase">Virtual Adjustment</div>
                  <Input
                    type="number"
                    step="0.01"
                    value={virtualAdjustmentAmount}
                    onChange={(e) => setVirtualAdjustmentAmount(e.target.value)}
                  />
                  <Textarea
                    rows={2}
                    placeholder="Virtual adjustment reason..."
                    value={virtualAdjustmentReason}
                    onChange={(e) => setVirtualAdjustmentReason(e.target.value)}
                  />

                  <Button className="bg-emerald-600 text-white hover:bg-emerald-700" onClick={handleApprove} disabled={approving}>
                    {approving ? "Approving..." : "Approve Adjustment"}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Off-screen, receipt-formatted print source — the drawer body above
          shows the same numbers as normal UI, this is print-only. Portaled
          straight to <body>, same as PrintReceiptModal: this Drawer's own
          panel carries an inline `transform`, which makes it a containing
          block for `position: fixed` descendants — nesting the print
          source inside it would anchor the print CSS's position:absolute
          override to the (off-screen) drawer panel instead of the page. */}
      {typeof document !== "undefined" &&
        createPortal(
          <DrawerReceiptContent
            ref={receiptRef}
            session={session}
            transactions={transactions}
            salesTaxes={salesTaxes}
            drawerName={drawerName}
            style={{ position: "fixed", left: -9999, top: 0 }}
          />,
          document.body
        )}
    </Drawer>
  );
}
