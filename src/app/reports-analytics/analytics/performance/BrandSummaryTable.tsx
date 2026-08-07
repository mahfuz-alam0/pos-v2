"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { MoreHorizontal } from "lucide-react";

import { useShop } from "@/context/shop-context";
import { fetchBrandPerformance } from "@/services/reporting/brandPerformance";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { BrandSummaryRow } from "./types";

function Bar({ percentage, color = "bg-primary/10" }: { percentage: number; color?: string }) {
  return (
    <div
      className={`absolute inset-y-0 left-0 ${color}`}
      style={{ width: `${percentage}%`, transition: "width 0.3s ease" }}
    />
  );
}

export default function BrandSummaryTable({
  selectedDate,
  onDataLoad,
}: {
  selectedDate: { startDate?: string; endDate?: string };
  onDataLoad?: (rows: BrandSummaryRow[]) => void;
}) {
  const { shopId } = useShop();
  const [data, setData] = useState<BrandSummaryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const loadingRef = useRef(false);
  const hasMoreRef = useRef(true);
  const pageRef = useRef(1);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchData = async (pageNum = 1, isLoadMore = false) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);

    try {
      const params: Record<string, any> = { page: pageNum, limit: 50 };
      if (shopId) params.shopId = shopId;
      if (selectedDate?.startDate) params.startDate = selectedDate.startDate;
      if (selectedDate?.endDate) params.endDate = selectedDate.endDate;

      const response = await fetchBrandPerformance(params);

      if (response?.data) {
        const responseData = Array.isArray(response.data.data)
          ? response.data.data
          : Array.isArray(response.data)
            ? response.data
            : [];
        const paginationData = response.data.paginationData || {};

        const mapped: BrandSummaryRow[] = responseData.map((item: any, index: number) => ({
          key: item._id || item.id || String(index),
          brand: item.brandName || "Unknown",
          netSales: parseFloat(item.netSales) || 0,
          returns: parseFloat(item.returnPercent || item.returnsPercent || 0),
          effectiveDiscount: parseFloat(item.effectiveDiscountPercent || 0),
          grossMargin: parseFloat(item.grossMargin || item.grossMarginPercent || 0),
        }));

        if (isLoadMore) {
          setData((prev) => {
            const updated = [...prev, ...mapped];
            onDataLoad?.(updated);
            return updated;
          });
        } else {
          setData(mapped);
          onDataLoad?.(mapped);
        }

        const hasNext = paginationData.currentPage < paginationData.totalPages;
        setHasMore(hasNext);
        hasMoreRef.current = hasNext;
        pageRef.current = pageNum;
      }
    } catch (error) {
      console.error("Error fetching brand performance:", error);
      toast.error("Failed to load brand summary");
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  };

  useEffect(() => {
    pageRef.current = 1;
    setHasMore(true);
    hasMoreRef.current = true;
    setData([]);
    fetchData(1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopId, selectedDate?.startDate, selectedDate?.endDate]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = el;
      if (scrollHeight - scrollTop <= clientHeight + 50) {
        if (!loadingRef.current && hasMoreRef.current) {
          fetchData(pageRef.current + 1, true);
        }
      }
    };
    el.addEventListener("scroll", handleScroll);
    return () => el.removeEventListener("scroll", handleScroll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const maxNetSales = Math.max(...data.map((d) => d.netSales), 1);

  return (
    <Card className="p-4 shadow-sm ring-0">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold">Brand Summary</h2>
        <MoreHorizontal className="size-5 text-muted-foreground" />
      </div>
      <div
        ref={scrollRef}
        className="overflow-auto rounded-xl shadow-sm *:data-[slot=table-container]:overflow-visible"
        style={{ maxHeight: 500 }}
      >
        <Table>
          <TableHeader className="[&_tr]:border-b-0">
            <TableRow className="bg-muted/60">
              <TableHead>Brand Name</TableHead>
              <TableHead className="text-center">Net Sales</TableHead>
              <TableHead className="text-center">Returns % of Sales</TableHead>
              <TableHead className="text-center">Effective Discount %</TableHead>
              <TableHead className="text-center">Gross Margin</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && data.length === 0 &&
              Array.from({ length: 4 }).map((_, r) => (
                <TableRow key={r} className="border-b-0">
                  {Array.from({ length: 5 }).map((__, c) => (
                    <TableCell key={c}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            {!loading && data.length === 0 && (
              <TableRow className="border-b-0">
                <TableCell colSpan={5} className="py-6 text-center text-muted-foreground">
                  No data available.
                </TableCell>
              </TableRow>
            )}
            {data.map((row, i) => (
              <TableRow
                key={row.key}
                className={`border-b-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] ${i % 2 === 1 ? "bg-table-zebra" : ""}`}
              >
                <TableCell>{row.brand}</TableCell>
                <TableCell className="relative text-center font-medium">
                  <Bar percentage={(row.netSales / maxNetSales) * 100} />
                  <span className="relative">
                    ${row.netSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </TableCell>
                <TableCell className="relative text-center font-medium">
                  <Bar percentage={Math.min(row.returns, 100)} color="bg-destructive/10" />
                  <span className="relative">{row.returns.toFixed(1)}%</span>
                </TableCell>
                <TableCell className="relative text-center font-medium">
                  <Bar percentage={Math.min(row.effectiveDiscount, 100)} />
                  <span className="relative">{row.effectiveDiscount.toFixed(1)}%</span>
                </TableCell>
                <TableCell className="relative text-center font-medium">
                  <Bar percentage={Math.min(row.grossMargin, 100)} />
                  <span className="relative">{row.grossMargin.toFixed(1)}%</span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
