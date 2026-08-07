"use client";

import { useCallback, useEffect, useState } from "react";
import { Pencil } from "lucide-react";

import { useShop } from "@/context/shop-context";
import { fetchTransactionEvents } from "@/services/transactions/listEvents";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableLoadingOverlay, TablePagination } from "@/components/ui/table-pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import EditTransactionDrawer from "./EditTransactionDrawer";

const EVENT_LABELS: Record<string, string> = {
  CASH_WITHDRAWAL: "Cash Withdrawal",
  CASH_DEPOSITED: "Cash Deposited",
  VIRTUAL_DEPOSITED: "Virtual Deposited",
  VIRTUAL_RETURNED: "Virtual Returned",
  CASH_RETURNED: "Cash Returned",
  MOVED_TO_VAULT: "Moved To Vault",
  MANUAL_ADJUSTMENT: "Manual Adjustment",
  PAYMENT_PROCESSING_CHARGE: "Payment Processing Charge",
  PAYMENT_PROCESSING_DISCOUNT: "Payment Processing Discount",
};

function money(v: number | undefined) {
  return `$${(v ?? 0).toFixed(2)}`;
}

interface DrawerTransactionsTableProps {
  drawerId: string;
  forActiveSessionOnly?: boolean;
  refreshKey?: number;
  onChanged?: () => void;
}

export default function DrawerTransactionsTable({
  drawerId,
  forActiveSessionOnly = false,
  refreshKey = 0,
  onChanged,
}: DrawerTransactionsTableProps) {
  const { shopId } = useShop();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0, totalPages: 1 });
  const [editTarget, setEditTarget] = useState<any>(null);

  const load = useCallback(
    async (page = 1) => {
      if (!shopId || !drawerId) return;
      setLoading(true);
      try {
        const res = await fetchTransactionEvents({
          shopId,
          drawerId,
          forActiveSessionOnly,
          page,
          limit: pagination.pageSize,
        });
        setRows(res?.data?.activities ?? []);
        const pd = res?.data?.paginationData ?? {};
        setPagination((prev) => ({
          current: pd.currentPage ?? page,
          pageSize: pd.limit ?? prev.pageSize,
          total: pd.totalEntries ?? 0,
          totalPages: pd.totalPages ?? 1,
        }));
      } finally {
        setLoading(false);
      }
    },
    [shopId, drawerId, forActiveSessionOnly, pagination.pageSize]
  );

  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopId, drawerId, forActiveSessionOnly, refreshKey]);

  return (
    <div className="flex flex-col gap-3">
      <div className="relative overflow-hidden rounded-xl ring-1 ring-foreground/10">
        <TableLoadingOverlay show={loading && rows.length > 0} />
        <Table>
          <TableHeader className="[&_tr]:border-b-0">
            <TableRow className="bg-muted/60">
              <TableHead>Date/Time</TableHead>
              <TableHead>Event</TableHead>
              <TableHead>User</TableHead>
              <TableHead className="text-right">Cash In</TableHead>
              <TableHead className="text-right">Cash Out</TableHead>
              <TableHead className="text-right">Virtual In</TableHead>
              <TableHead className="text-right">Virtual Out</TableHead>
              <TableHead className="text-center">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading &&
              rows.length === 0 &&
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={`sk-${i}`} className="border-b-0">
                  {Array.from({ length: 8 }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}

            {!loading && rows.length === 0 && (
              <TableRow className="border-b-0">
                <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                  No transactions found.
                </TableCell>
              </TableRow>
            )}

            {rows.map((row, i) => (
              <TableRow
                key={row.id}
                className={`border-b-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] ${i % 2 === 1 ? "bg-table-zebra" : ""}`}
              >
                <TableCell>
                  {row.loggedDate ? new Date(row.loggedDate).toLocaleDateString() : "-"} {row.loggedTime}
                </TableCell>
                <TableCell>{EVENT_LABELS[row.event] ?? row.event}</TableCell>
                <TableCell>{row.userInfo?.name ?? "-"}</TableCell>
                <TableCell className="text-right font-mono text-emerald-600">
                  {row.cashCredit ? money(row.cashCredit) : "-"}
                </TableCell>
                <TableCell className="text-right font-mono text-destructive">
                  {row.cashDebit ? money(row.cashDebit) : "-"}
                </TableCell>
                <TableCell className="text-right font-mono text-emerald-600">
                  {row.virtualCredit ? money(row.virtualCredit) : "-"}
                </TableCell>
                <TableCell className="text-right font-mono text-destructive">
                  {row.virtualDebit ? money(row.virtualDebit) : "-"}
                </TableCell>
                <TableCell className="text-center">
                  <Button variant="outline" size="icon-sm" onClick={() => setEditTarget(row)}>
                    <Pencil className="size-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <TablePagination
        page={pagination.current}
        totalPages={pagination.totalPages}
        totalEntries={pagination.total}
        pageSize={pagination.pageSize}
        loading={loading}
        onPageChange={(p: number) => load(p)}
      />

      <EditTransactionDrawer
        transaction={editTarget}
        drawerId={drawerId}
        onClose={() => setEditTarget(null)}
        onSaved={() => {
          setEditTarget(null);
          load(pagination.current);
          onChanged?.();
        }}
      />
    </div>
  );
}
