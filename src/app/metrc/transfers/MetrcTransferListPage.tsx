"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { useShop } from "@/context/shop-context";
import { fetchMetrcTransfersList } from "@/services/metrcTransfers/list";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableLoadingOverlay, TablePagination } from "@/components/ui/table-pagination";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

import SyncTransfer from "./SyncTransfer";
import MetrcTransferFilters, { type MetrcTransferStatus } from "./MetrcTransferFilters";
import MetrcTransferDetailPanel from "./MetrcTransferDetailPanel";

function buildParams(page: number, limit: number, status: MetrcTransferStatus | null) {
  const params: Record<string, any> = { page, limit };
  if (status === "pending") params.isPending = true;
  else if (status === "accepted") params.isAccepted = true;
  else if (status === "voided") params.isVoided = true;
  else if (status === "incoming") params.isIncoming = true;
  else if (status === "outgoing") params.isIncoming = false;
  return params;
}

export default function MetrcTransferListPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { shopId } = useShop();
  const openId = searchParams.get("id");

  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<MetrcTransferStatus | null>(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 30, totalEntries: 0, totalPages: 1 });

  const loadTransfers = useCallback(
    async (page = 1, limit = pagination.limit) => {
      if (!shopId) return;
      setLoading(true);
      try {
        const res: any = await fetchMetrcTransfersList(shopId as string, buildParams(page, limit, status));
        const list = res?.data?.transfers ?? [];
        setRows(list);
        const pd = res?.paginationData ?? {};
        setPagination({
          page: pd.currentPage ?? page,
          limit: pd.limit ?? limit,
          totalEntries: pd.totalEntries ?? list.length,
          totalPages: pd.totalPages ?? 1,
        });
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [shopId, status]
  );

  useEffect(() => {
    loadTransfers(1, pagination.limit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopId, status]);

  const openRow = (id: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("id", id);
    router.push(`/metrc/transfers?${params.toString()}`, { scroll: false });
  };

  const closeDetail = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("id");
    router.push(`/metrc/transfers${params.toString() ? `?${params}` : ""}`, { scroll: false });
  };

  return (
    <div className="flex gap-4 p-6">
      <div className={openId ? "flex min-w-0 flex-1 flex-col gap-4" : "flex w-full flex-col gap-4"}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>Inventory</BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Metrc Transfers</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <SyncTransfer />
        </div>

        <MetrcTransferFilters status={status} onChange={setStatus} />

        <div className="relative overflow-hidden rounded-xl ring-1 ring-foreground/10">
          <TableLoadingOverlay show={loading && rows.length > 0} />
          <Table>
            <TableHeader className="[&_tr]:border-b-0">
              <TableRow className="bg-muted/60">
                <TableHead>Transfer ID</TableHead>
                <TableHead>Transfer Type</TableHead>
                <TableHead>Import Status</TableHead>
                <TableHead>Supplier / Destination</TableHead>
                <TableHead>Metrc Manifest Number</TableHead>
                <TableHead>Created At</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading &&
                rows.length === 0 &&
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={`sk-${i}`} className="border-b-0">
                    {Array.from({ length: 6 }).map((__, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}

              {!loading && rows.length === 0 && (
                <TableRow className="border-b-0">
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    No transfers found.
                  </TableCell>
                </TableRow>
              )}

              {rows.map((row: any, i) => (
                <TableRow
                  key={row.id}
                  className={`border-b-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] ${i % 2 === 1 ? "bg-stone-100 dark:bg-stone-800" : ""}`}
                >
                  <TableCell>
                    <button className="text-primary hover:underline" onClick={() => openRow(row.id)}>
                      {row.metrcId ?? "-"}
                    </button>
                  </TableCell>
                  <TableCell>
                    {row.isIncoming ? (
                      <Badge className="bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400">
                        Incoming
                      </Badge>
                    ) : (
                      <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400">
                        Outgoing
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {row.isImportInProgress ? (
                      <Badge variant="outline">In Progress</Badge>
                    ) : !row.isResolvedOnPOS ? (
                      <Badge variant="outline">Pending</Badge>
                    ) : (
                      <Badge className="bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400">
                        Completed
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>{row.supplierName ?? "-"}</TableCell>
                  <TableCell>{row.metrcManifestNumber ?? "-"}</TableCell>
                  <TableCell>
                    {row.metcLoggedCreationTime
                      ? new Date(row.metcLoggedCreationTime.split("T")[0]).toLocaleDateString()
                      : "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <TablePagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          totalEntries={pagination.totalEntries}
          pageSize={pagination.limit}
          loading={loading}
          onPageChange={(p: number) => loadTransfers(p, pagination.limit)}
        />
      </div>

      {openId && <MetrcTransferDetailPanel id={openId} onClose={closeDetail} />}
    </div>
  );
}
