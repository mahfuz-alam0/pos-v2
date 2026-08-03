import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { OnlinePaymentBreakdownRow, SaleTransactionRow } from "./types";

export default function SalesTransactionsSection({
  saleTransactions = [],
  onlinePaymentMethodBreakdown = [],
  formatCurrency,
}: {
  saleTransactions?: SaleTransactionRow[];
  onlinePaymentMethodBreakdown?: OnlinePaymentBreakdownRow[];
  formatCurrency: (v: number) => string;
}) {
  const mainRows = saleTransactions.map((t) => ({
    key: t.paymentMethod,
    paymentMethod: t.displayName,
    amount: t.totalFinalPayable || 0,
  }));
  const onlineRows = onlinePaymentMethodBreakdown.map((m) => ({
    key: `online-${m.onlinePaymentMethod}`,
    paymentMethod: m.displayName,
    amount: m.totalFinalPayable || 0,
  }));
  const rows = [...mainRows, ...onlineRows];

  return (
    <Card className="h-full p-0 shadow-sm ring-0">
      <div className="flex items-center gap-3 px-6 py-4 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] dark:shadow-[inset_0_-1px_0_rgba(255,255,255,0.08)]">
        <div className="h-5 w-1 rounded-full bg-sky-500" />
        <h3 className="text-base font-semibold">Sales Transactions by Payment Method</h3>
      </div>
      <Table>
        <TableHeader className="[&_tr]:border-b-0">
          <TableRow className="bg-muted/60">
            <TableHead>Payment Method</TableHead>
            <TableHead className="text-right">Total Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 && (
            <TableRow className="border-b-0">
              <TableCell colSpan={2} className="py-6 text-center text-muted-foreground">
                No transactions for the selected period
              </TableCell>
            </TableRow>
          )}
          {rows.map((row) => (
            <TableRow key={row.key} className="border-b-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)]">
              <TableCell className="font-medium">{row.paymentMethod}</TableCell>
              <TableCell className="text-right font-semibold">{formatCurrency(row.amount)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
