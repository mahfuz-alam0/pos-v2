"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { useShop } from "@/context/shop-context";
import { fetchEmployeePerformanceMetrics } from "@/services/reporting/employeePerformanceMetrics";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { EmployeePerformanceRow } from "./types";

function Bar({ percentage }: { percentage: number }) {
  return (
    <div
      className="absolute inset-y-0 left-0 bg-primary/10"
      style={{ width: `${percentage}%`, transition: "width 0.3s ease" }}
    />
  );
}

export default function EmployeePerformanceTable({
  selectedDate,
  onDataLoad,
}: {
  selectedDate: { startDate?: string; endDate?: string };
  onDataLoad?: (rows: EmployeePerformanceRow[]) => void;
}) {
  const { shopId } = useShop();
  const [data, setData] = useState<EmployeePerformanceRow[]>([]);
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

      const response = await fetchEmployeePerformanceMetrics(params);

      if (response?.data) {
        const responseData = Array.isArray(response.data.data)
          ? response.data.data
          : Array.isArray(response.data)
            ? response.data
            : [];
        const paginationData = response.data.paginationData || {};

        const mapped: EmployeePerformanceRow[] = responseData.map((item: any, index: number) => ({
          key: item._id || item.id || String(index),
          employeeName: item.employeeName || "Unknown",
          netSales: parseFloat(item.netSales) || 0,
          orders: parseInt(item.noOfOrders || 0, 10),
          aov: parseFloat(item.avgOrderValue || 0),
          effectiveDiscount: parseFloat(item.effectiveDiscountPercent || 0),
          ordersDiscount: parseFloat(item.ordersWithDiscountPercent || 0),
          percentNetSales: parseFloat(item.netSalesPercent || 0),
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
      console.error("Error fetching employee performance metrics:", error);
      toast.error("Failed to load employee performance");
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
  const maxOrders = Math.max(...data.map((d) => d.orders), 1);
  const maxAov = Math.max(...data.map((d) => d.aov), 1);

  return (
    <Card className="p-4 shadow-sm ring-0">
      <h2 className="mb-3 text-base font-semibold">Employee Performance</h2>
      <div
        ref={scrollRef}
        className="overflow-auto rounded-xl shadow-sm *:data-[slot=table-container]:overflow-visible"
        style={{ maxHeight: 500 }}
      >
        <Table>
          <TableHeader className="[&_tr]:border-b-0">
            <TableRow className="bg-muted/60">
              <TableHead>Employee Name</TableHead>
              <TableHead className="text-center">Net Sales</TableHead>
              <TableHead className="text-center"># Orders</TableHead>
              <TableHead className="text-center">AOV $</TableHead>
              <TableHead className="text-center">Effective Discount %</TableHead>
              <TableHead className="text-center">% Orders w/ Discount</TableHead>
              <TableHead className="text-center">% Net Sales</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && data.length === 0 &&
              Array.from({ length: 4 }).map((_, r) => (
                <TableRow key={r} className="border-b-0">
                  {Array.from({ length: 7 }).map((__, c) => (
                    <TableCell key={c}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            {!loading && data.length === 0 && (
              <TableRow className="border-b-0">
                <TableCell colSpan={7} className="py-6 text-center text-muted-foreground">
                  No data available.
                </TableCell>
              </TableRow>
            )}
            {data.map((row, i) => (
              <TableRow
                key={row.key}
                className={`border-b-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] ${i % 2 === 1 ? "bg-table-zebra" : ""}`}
              >
                <TableCell>{row.employeeName}</TableCell>
                <TableCell className="relative text-center font-medium">
                  <Bar percentage={(row.netSales / maxNetSales) * 100} />
                  <span className="relative">
                    ${row.netSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </TableCell>
                <TableCell className="relative text-center font-medium">
                  <Bar percentage={(row.orders / maxOrders) * 100} />
                  <span className="relative">{row.orders}</span>
                </TableCell>
                <TableCell className="relative text-center font-medium">
                  <Bar percentage={(row.aov / maxAov) * 100} />
                  <span className="relative">${row.aov.toFixed(2)}</span>
                </TableCell>
                <TableCell className="relative text-center font-medium">
                  <Bar percentage={Math.min(row.effectiveDiscount, 100)} />
                  <span className="relative">{row.effectiveDiscount.toFixed(1)}%</span>
                </TableCell>
                <TableCell className="relative text-center font-medium">
                  <Bar percentage={Math.min(row.ordersDiscount, 100)} />
                  <span className="relative">{row.ordersDiscount.toFixed(1)}%</span>
                </TableCell>
                <TableCell className="relative text-center font-medium">
                  <Bar percentage={Math.min(row.percentNetSales, 100)} />
                  <span className="relative">{row.percentNetSales.toFixed(2)}%</span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
