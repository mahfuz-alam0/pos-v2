"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

import Drawer from "@/components/ui/Drawer";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableLoadingOverlay, TablePagination } from "@/components/ui/table-pagination";
import { fetchPromoUsages } from "@/services/promoUsage/list";

const PAGE_SIZE = 10;

export function UsageHistoryPanel({
  open,
  onClose,
  promoType,
  id,
  title = "Usage History",
}: {
  open: boolean;
  onClose: () => void;
  promoType: "COUPON" | "DEAL";
  id: string | number | null;
  title?: string;
}) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalEntries, setTotalEntries] = useState(0);

  const load = async (targetPage: number) => {
    if (!id) return;
    setLoading(true);
    try {
      const params: any = { promoType, page: targetPage, limit: PAGE_SIZE };
      if (promoType === "COUPON") params.couponId = id;
      else params.dealId = id;
      const res = await fetchPromoUsages(params);
      setRows(res?.data ?? []);
      setPage(res?.paginationData?.currentPage ?? targetPage);
      setTotalPages(res?.paginationData?.totalPages ?? 0);
      setTotalEntries(res?.paginationData?.totalEntries ?? 0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && id) load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, id]);

  return (
    <Drawer open={open} onClose={onClose} side="right" size={480}>
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between px-5 py-4 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)]">
          <div className="text-base font-semibold">{title}</div>
          <Button variant="outline" size="icon-sm" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="relative overflow-hidden rounded-xl ring-1 ring-foreground/10">
            <TableLoadingOverlay show={loading} />
            <Table>
              <TableHeader className="[&_tr]:border-b-0">
                <TableRow className="bg-muted/60">
                  <TableHead>Customer</TableHead>
                  <TableHead>Sale</TableHead>
                  <TableHead className="text-right">Times Applied</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!loading && rows.length === 0 && (
                  <TableRow className="border-b-0">
                    <TableCell colSpan={3} className="py-10 text-center text-muted-foreground">
                      No usage yet.
                    </TableCell>
                  </TableRow>
                )}
                {rows.map((row, i) => (
                  <TableRow
                    key={row.id}
                    className={`border-b-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] ${i % 2 === 1 ? "bg-table-zebra" : ""}`}
                  >
                    <TableCell>
                      {row.customerInfo ? `${row.customerInfo.firstName} ${row.customerInfo.lastName}` : "-"}
                    </TableCell>
                    <TableCell>{row.saleInfo?.saleId || "-"}</TableCell>
                    <TableCell className="text-right">{row.numberOfTimesApplied}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {totalEntries > 0 && (
            <div className="mt-3">
              <TablePagination
                page={page}
                totalPages={totalPages}
                totalEntries={totalEntries}
                pageSize={PAGE_SIZE}
                loading={loading}
                onPageChange={load}
              />
            </div>
          )}
        </div>
      </div>
    </Drawer>
  );
}
