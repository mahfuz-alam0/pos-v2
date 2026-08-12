"use client";

import { forwardRef, type CSSProperties } from "react";

function money(v: number | undefined) {
  return `$${(v ?? 0).toFixed(2)}`;
}

function fmt(v: string | undefined) {
  if (!v) return "-";
  return new Date(v).toLocaleString([], { month: "2-digit", day: "2-digit", year: "2-digit", hour: "numeric", minute: "2-digit" });
}

// Ported from the old POS's DrawerReceiptPrint ("shift" report variant) —
// every total here is derived straight from this session's own transaction
// log rather than fetched separately, matching that component's
// calculateFromTransactions logic field-for-field.
export function computeReceiptValues(transactions: any[]) {
  const totalCashIn = transactions.reduce((s, t) => s + (t.cashCredit || 0), 0);
  const totalChangeGiven = transactions.reduce(
    (s, t) => (t.event === "VIRTUAL_RETURNED" || t.event === "CASH_RETURNED" ? s + (t.cashDebit || 0) + (t.virtualDebit || 0) : s),
    0
  );
  const cashChangeGiven = transactions.reduce((s, t) => (t.event === "CASH_RETURNED" ? s + (t.cashDebit || 0) : s), 0);

  const cashlessATMOrderIds = new Set(transactions.filter((t) => t.orderId && t.onlinePaymentMethod === "CASHLESS_ATM").map((t) => t.orderId));
  const cashlessATMChange = transactions.reduce(
    (s, t) => (cashlessATMOrderIds.has(t.orderId) && (t.virtualCredit || 0) !== 0 ? s + (t.cashDebit || t.virtualDebit || 0) : s),
    0
  );

  const totalCashDeposit = transactions.reduce((s, t) => (t.event === "CASH_DEPOSITED" ? s + (t.cashCredit || 0) : s), 0);
  const totalCashWithdrawal = transactions.reduce(
    (s, t) => (t.event === "CASH_WITHDRAWAL" || t.event === "MOVED_TO_VAULT" ? s + (t.cashDebit || 0) : s),
    0
  );

  const cashSales = transactions.reduce((s, t) => (t.orderId ? s + (t.cashCredit || 0) - (t.cashDebit || 0) : s), 0);
  const totalSales = transactions.reduce(
    (s, t) => (t.orderId ? s + (t.cashCredit || 0) + (t.virtualCredit || 0) - (t.cashDebit || 0) - (t.virtualDebit || 0) : s),
    0
  );
  const totalDeposits = transactions.reduce((s, t) => s + (t.cashCredit || 0) + (t.virtualCredit || 0), 0);
  const totalWithdrawals = transactions.reduce((s, t) => s + (t.cashDebit || 0) + (t.virtualDebit || 0), 0);

  const withdrawals = transactions.filter((t) => t.event === "CASH_WITHDRAWAL" || t.event === "MOVED_TO_VAULT");

  return { totalCashIn, totalChangeGiven, cashChangeGiven, cashlessATMChange, totalCashDeposit, totalCashWithdrawal, cashSales, totalSales, totalDeposits, totalWithdrawals, withdrawals };
}

export interface DrawerReceiptContentProps {
  session: any;
  transactions: any[];
  drawerName?: string;
  style?: CSSProperties;
}

// Just the receipt body — no Dialog/Drawer chrome of its own, so callers can
// either show it inline or as an off-screen print source (pass `style` to
// position it — see printNode's contract: the id-bearing element itself
// must carry the offscreen positioning, not a wrapper around it, or the
// print CSS's `#pos-receipt-print-area { position: absolute !important }`
// override has nothing to override and the content prints off-page).
// Forwards a ref so the caller can hand that DOM node straight to printNode().
const DrawerReceiptContent = forwardRef<HTMLDivElement, DrawerReceiptContentProps>(function DrawerReceiptContent(
  { session, transactions, drawerName, style },
  ref
) {
  const shopDetails = (typeof window !== "undefined" && JSON.parse(localStorage.getItem("shopDetails") || "null")) || null;

  if (!session) return null;

  const v = computeReceiptValues(transactions || []);
  // Expected/actual/discrepancy already computed server-side and carried on
  // the session itself — no need to re-derive them from raw transactions.
  const expectedCash = session.expectedCashBalance ?? session.startingCashBalance ?? 0;
  const actualCash = session.isOpen ? expectedCash : session.closingCashBalance ?? expectedCash;
  const discrepancy = session.cashAdjustment ?? actualCash - expectedCash;

  return (
    <div ref={ref} id="pos-receipt-print-area" style={style} className="rounded-md ring-1 ring-foreground/10 p-3 font-mono text-[11px] leading-tight">
      <div className="mb-2">
        <div className="text-sm font-bold">Shift Report</div>
        <div>Store: {shopDetails?.label ?? "-"}</div>
        <div>Time Printed: {fmt(new Date().toISOString())}</div>
      </div>
      <hr className="my-2 border-border" />

      <div className="mb-2 space-y-0.5">
        <Row label="Register Name" value={drawerName || "-"} />
        <Row label="Started By" value={session.openedBy?.name || "-"} />
        <Row label="Started At" value={fmt(session.createdAt)} />
        <Row label="Ended By" value={session.closedBy?.name || "-"} />
        <Row label="Ended At" value={session.isOpen ? "-" : fmt(session.updatedAt)} />
      </div>
      <hr className="my-2 border-border" />

      <div className="mb-2 space-y-0.5">
        <div className="font-bold">Starting Shift</div>
        <Row label="Session ID" value={session.id} mono />
        <Row label="Session Status" value={session.isOpen ? "Open" : "Closed"} />
        <Row label="Opened By" value={session.openedBy?.name || "-"} />
        <Row label="Closed By" value={session.closedBy?.name || "-"} />
        <Row label="Opened At" value={fmt(session.createdAt)} />
        <Row label="Total Transactions" value={String(transactions?.length ?? 0)} />
        <Row label="Starting Cash" value={money(session.startingCashBalance)} />
        <Row label="Expected Cash" value={money(expectedCash)} />
        <Row label="Closing Cash" value={money(session.closingCashBalance)} />
      </div>
      <hr className="my-2 border-border" />

      <Row label="Starting Balance" value={money(session.startingCashBalance)} bold />
      <hr className="my-2 border-border" />

      <div className="mb-2 space-y-0.5">
        <Row label="Cash Sales" value={money(v.cashSales)} bold />
        <Row label="Total Sales" value={money(v.totalSales)} bold />
      </div>
      <hr className="my-2 border-border" />

      <div className="mb-2 space-y-0.5">
        <Row label="Total Cash In" value={money(v.totalCashIn)} bold />
        <Row label="Total Change Given" value={money(v.totalChangeGiven)} bold />
        <Row label="Cash Change Given" value={money(v.cashChangeGiven)} bold />
        <Row label="Cashless ATM (EC) Change" value={money(v.cashlessATMChange)} bold />
        <Row label="Total Cash Deposit" value={money(v.totalCashDeposit)} bold />
        <Row label="Total Cash Withdrawal" value={money(v.totalCashWithdrawal)} bold />
      </div>
      <hr className="my-2 border-border" />

      <div className="mb-2">
        <div className="mb-1 font-bold">Withdraw</div>
        {v.withdrawals.length === 0 ? (
          <div className="text-muted-foreground">No withdrawals</div>
        ) : (
          v.withdrawals.map((t: any, i: number) => (
            <Row key={t._id || i} label={`Withdraw ${i + 1} (${fmt(t.createdAt)})`} value={money(t.cashDebit)} bold />
          ))
        )}
      </div>
      <hr className="my-2 border-border" />

      <div className="mb-2 space-y-0.5">
        <Row label="Total Deposits" value={money(v.totalDeposits)} bold />
        <Row label="Total Withdraw" value={money(v.totalWithdrawals)} bold />
      </div>
      <hr className="my-2 border-border" />

      <div className="space-y-0.5">
        <Row label="Expected Cash in Drawer" value={money(expectedCash)} bold />
        <Row label="Actual Cash in Drawer" value={money(actualCash)} bold />
        <Row label="Closing Discrepancy Cash" value={`${discrepancy >= 0 ? "+" : ""}${money(discrepancy)}`} bold />
      </div>
    </div>
  );
});

export default DrawerReceiptContent;

function Row({ label, value, bold = false, mono = false }: { label: string; value: string; bold?: boolean; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-2">
      <span>{label}:</span>
      <span className={`${bold ? "font-bold" : ""} ${mono ? "truncate" : ""}`}>{value}</span>
    </div>
  );
}
