"use client";

import { useCallback, useEffect, useState } from "react";

import { useShop } from "@/context/shop-context";
import { listDrawerSessions } from "@/services/drawers/listSessions";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableLoadingOverlay, TablePagination } from "@/components/ui/table-pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import SessionDetailDrawer from "./SessionDetailDrawer";

function money(v: number | undefined) {
  return `$${(v ?? 0).toFixed(2)}`;
}

export default function DrawerSessionsTable({ drawerId, refreshKey = 0 }: { drawerId: string; refreshKey?: number }) {
  const { shopId } = useShop();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0, totalPages: 1 });
  const [selectedSession, setSelectedSession] = useState<any>(null);

  const load = useCallback(
    async (page = 1) => {
      if (!shopId || !drawerId) return;
      setLoading(true);
      try {
        const res = await listDrawerSessions({ shopId, drawerId, page, limit: pagination.pageSize });
        setRows(res?.data?.sessions ?? []);
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
    [shopId, drawerId, pagination.pageSize]
  );

  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopId, drawerId, refreshKey]);

  return (
    <div className="flex flex-col gap-3">
      <div className="relative overflow-hidden rounded-xl ring-1 ring-foreground/10">
        <TableLoadingOverlay show={loading && rows.length > 0} />
        <Table>
          <TableHeader className="[&_tr]:border-b-0">
            <TableRow className="bg-muted/60">
              <TableHead>Session</TableHead>
              <TableHead>Open By</TableHead>
              <TableHead>Closed By</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right">Opening Cash</TableHead>
              <TableHead className="text-right">Closing Cash</TableHead>
              <TableHead className="text-right">Adjusted Cash</TableHead>
              <TableHead className="text-center">Adjustment</TableHead>
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
                  No sessions found.
                </TableCell>
              </TableRow>
            )}

            {rows.map((row, i) => (
              <TableRow
                key={row.id}
                className={`cursor-pointer border-b-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] ${i % 2 === 1 ? "bg-stone-100 dark:bg-stone-800" : ""}`}
                onClick={() => setSelectedSession(row)}
              >
                <TableCell className="text-primary hover:underline">{row.id}</TableCell>
                <TableCell>{row.openedBy?.name ?? "-"}</TableCell>
                <TableCell>{row.closedBy?.name ?? "-"}</TableCell>
                <TableCell className="text-center">
                  <Badge variant={row.isOpen ? "default" : "destructive"}>{row.isOpen ? "Open" : "Closed"}</Badge>
                </TableCell>
                <TableCell className="text-right font-mono">{money(row.startingCashBalance)}</TableCell>
                <TableCell className="text-right font-mono">{money(row.closingCashBalance)}</TableCell>
                <TableCell className="text-right font-mono">{money(row.cashAdjustment)}</TableCell>
                <TableCell className="text-center">
                  {row.isAdjustmentPending ? <Badge variant="destructive">Pending</Badge> : <span className="text-muted-foreground">-</span>}
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

      <SessionDetailDrawer
        session={selectedSession}
        drawerId={drawerId}
        onClose={() => setSelectedSession(null)}
        onApproved={() => {
          setSelectedSession(null);
          load(pagination.current);
        }}
      />
    </div>
  );
}
