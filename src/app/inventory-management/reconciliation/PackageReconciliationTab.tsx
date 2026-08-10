"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import type { DateRange } from "react-day-picker";

import { useShop } from "@/context/shop-context";
import { fetchPackageAdjustments } from "@/services/packageAdjustments/list";
import { fetchPackagesList } from "@/services/packages/list";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { TableLoadingOverlay, TablePagination } from "@/components/ui/table-pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Drawer from "@/components/ui/Drawer";
import ReconciliationDetailPanel from "./ReconciliationDetailPanel";

const PAGE_SIZE_OPTIONS = [30, 50, 100, 200];

type DateFilter = "all" | "today" | "yesterday" | "custom";

function toDateStr(date: Date) {
  return date.toISOString().slice(0, 10);
}

export default function PackageReconciliationTab() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { shopId } = useShop();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalEntries, setTotalEntries] = useState(0);
  const [pageSize, setPageSize] = useState(30);

  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [customRange, setCustomRange] = useState<DateRange | undefined>();

  const [barcodeValue, setBarcodeValue] = useState("");
  const [barcodeSearching, setBarcodeSearching] = useState(false);
  const isPastingRef = useRef(false);

  const selectedId = searchParams.get("id");

  const buildDateParams = useCallback(() => {
    if (dateFilter === "today") {
      const today = toDateStr(new Date());
      return { fromDate: today, toDate: today };
    }
    if (dateFilter === "yesterday") {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const str = toDateStr(yesterday);
      return { fromDate: str, toDate: str };
    }
    if (dateFilter === "custom" && customRange?.from && customRange?.to) {
      return { fromDate: toDateStr(customRange.from), toDate: toDateStr(customRange.to) };
    }
    return {};
  }, [dateFilter, customRange]);

  const loadAdjustments = useCallback(
    async (targetPage = 1, size = pageSize) => {
      if (!shopId) return;
      setLoading(true);
      try {
        const res = await fetchPackageAdjustments(shopId, {
          limit: size,
          page: targetPage,
          ...buildDateParams(),
        });
        const { adjustments, paginationData } = res?.data ?? {};
        setRows(adjustments ?? []);
        setPage(paginationData?.currentPage ?? targetPage);
        setTotalPages(paginationData?.totalPages ?? 1);
        setTotalEntries(paginationData?.totalEntries ?? 0);
      } catch (err) {
        toast.error(err?.message || "Failed to load package adjustments");
      } finally {
        setLoading(false);
      }
    },
    [shopId, buildDateParams, pageSize]
  );

  useEffect(() => {
    loadAdjustments(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopId, dateFilter, customRange]);

  const openAdjustment = (id: string | number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("id", String(id));
    router.push(`${pathname}?${params.toString()}`);
  };

  const closeAdjustment = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("id");
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleBarcodeScan = async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed || !shopId) return;
    setBarcodeSearching(true);
    try {
      const packagesRes = await fetchPackagesList(shopId, {
        limit: 1,
        page: 1,
        isFinished: false,
        advertisedPackageIds: trimmed,
      });
      const pkg = packagesRes?.data?.[0];
      if (!pkg?.id) {
        toast.warning("Package not found");
        return;
      }
      const adjustmentsRes = await fetchPackageAdjustments(shopId, { packageId: pkg.id, limit: 1, page: 1 });
      const adjustment = adjustmentsRes?.data?.adjustments?.[0];
      if (!adjustment?.id) {
        toast.warning("No adjustments found for this package");
        return;
      }
      openAdjustment(adjustment.id);
      setBarcodeValue("");
      toast.success("Package adjustment found");
    } catch (err) {
      toast.error(err?.message || "An error occurred while scanning");
    } finally {
      setBarcodeSearching(false);
    }
  };

  const diffColor = (count: number) => {
    if (count > 0) return "text-green-600 dark:text-green-500";
    if (count < 0) return "text-red-600 dark:text-red-500";
    return "text-blue-600 dark:text-blue-500";
  };

  return (
    <div className="flex gap-4">
      <div className="flex w-full flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-input p-0.5">
            {(["all", "yesterday", "today", "custom"] as DateFilter[]).map((f) => (
              <Button
                key={f}
                variant={dateFilter === f ? "default" : "ghost"}
                size="sm"
                className="capitalize"
                onClick={() => setDateFilter(f)}
              >
                {f}
              </Button>
            ))}
          </div>

          {dateFilter === "custom" && (
            <DateRangePicker value={customRange} onChange={setCustomRange} />
          )}

          <div className="relative ml-auto w-70">
            <Input
              placeholder="Scan via barcode"
              value={barcodeValue}
              onChange={(e) => {
                if (isPastingRef.current) {
                  isPastingRef.current = false;
                  return;
                }
                setBarcodeValue(e.target.value);
              }}
              onPaste={(e) => {
                e.preventDefault();
                const pasted = e.clipboardData.getData("Text").trim();
                setBarcodeValue(pasted);
                isPastingRef.current = true;
                handleBarcodeScan(pasted);
                setTimeout(() => {
                  isPastingRef.current = false;
                }, 100);
              }}
              onBlur={(e) => handleBarcodeScan(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleBarcodeScan(barcodeValue);
              }}
            />
            {barcodeSearching && (
              <Loader2 className="absolute right-2.5 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
            )}
          </div>
        </div>

        <div className="relative overflow-hidden rounded-xl ring-1 ring-foreground/10">
          <TableLoadingOverlay show={loading && rows.length > 0} />
          <Table>
            <TableHeader className="[&_tr]:border-b-0">
              <TableRow className="bg-muted/60">
                <TableHead>Package ID</TableHead>
                <TableHead>Product Name</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-center">Adjustment</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading &&
                rows.length === 0 &&
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={`skeleton-${i}`} className={`border-b-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] ${i % 2 === 1 ? "bg-table-zebra" : ""}`}>
                    {Array.from({ length: 5 }).map((__, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}

              {!loading && rows.length === 0 && (
                <TableRow className="border-b-0">
                  <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                    No package adjustments found.
                  </TableCell>
                </TableRow>
              )}

              {rows.length > 0 &&
                rows.map((row: any, i) => (
                  <TableRow
                    key={row.id}
                    className={`cursor-pointer border-b-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] ${i % 2 === 1 ? "bg-table-zebra" : ""} ${
                      String(row.id) === selectedId ? "outline outline-primary" : ""
                    }`}
                    onClick={() => openAdjustment(row.id)}
                  >
                    <TableCell className="font-medium text-primary hover:underline">{row.advertisedPackageId}</TableCell>
                    <TableCell>{row.packageNameSnapShot}</TableCell>
                    <TableCell>{new Date(row.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell className={`text-center font-medium ${diffColor(row.totalDifferenceCount)}`}>
                      {row.totalDifferenceCount}
                    </TableCell>
                    <TableCell className="text-center">
                      <span
                        className={`inline-block size-2.5 rounded-full ${
                          row.isApproved ? "bg-green-500" : row.isRejected ? "bg-red-500" : "bg-orange-500"
                        }`}
                        title={row.isApproved ? "Approved" : row.isRejected ? "Rejected" : "Pending"}
                      />
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>

        <TablePagination
          page={page}
          totalPages={totalPages}
          totalEntries={totalEntries}
          pageSize={pageSize}
          loading={loading}
          onPageChange={loadAdjustments}
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          onPageSizeChange={(s) => {
            setPageSize(s);
            loadAdjustments(1, s);
          }}
        />
      </div>

      <Drawer open={!!selectedId} onClose={closeAdjustment} side="right" size="40%">
        {selectedId && (
          <ReconciliationDetailPanel adjustmentId={selectedId} onClose={closeAdjustment} onChanged={() => loadAdjustments(page)} />
        )}
      </Drawer>
    </div>
  );
}
