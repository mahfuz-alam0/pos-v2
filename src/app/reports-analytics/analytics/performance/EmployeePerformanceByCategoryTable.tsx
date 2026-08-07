"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { useShop } from "@/context/shop-context";
import { fetchEmployeePerformanceByCategory } from "@/services/reporting/employeePerformanceByCategory";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { EmployeePerformanceByCategoryRow } from "./types";

function Bar({ percentage }: { percentage: number }) {
  return (
    <div
      className="absolute inset-y-0 left-0 bg-primary/10"
      style={{ width: `${percentage}%`, transition: "width 0.3s ease" }}
    />
  );
}

export default function EmployeePerformanceByCategoryTable({
  selectedDate,
  onDataLoad,
}: {
  selectedDate: { startDate?: string; endDate?: string };
  onDataLoad?: (rows: EmployeePerformanceByCategoryRow[]) => void;
}) {
  const { shopId } = useShop();
  const [data, setData] = useState<EmployeePerformanceByCategoryRow[]>([]);
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

      const response = await fetchEmployeePerformanceByCategory(params);

      if (response?.data) {
        const responseData = Array.isArray(response.data.data)
          ? response.data.data
          : Array.isArray(response.data)
            ? response.data
            : [];
        const paginationData = response.data.paginationData || {};

        const mapped: EmployeePerformanceByCategoryRow[] = responseData.map((item: any, index: number) => ({
          key: item._id || item.id || `${item.categoryName}-${item.employeeName}-${index}`,
          category: item.categoryName || "Unknown",
          employeeName: item.employeeName || "Unknown",
          grossSales: parseFloat(item.grossSales) || 0,
          netSales: parseFloat(item.netSales) || 0,
          items: parseInt(item.noOfItems || item.count || 0, 10),
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
      console.error("Error fetching employee performance by category:", error);
      toast.error("Failed to load employee performance by category");
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

  const maxGrossSales = Math.max(...data.map((d) => d.grossSales), 1);
  const maxNetSales = Math.max(...data.map((d) => d.netSales), 1);
  const maxItems = Math.max(...data.map((d) => d.items), 1);

  // Category cell rowspan: consecutive rows sharing the same category collapse into one merged cell.
  const rowSpans = data.map((row, index) => {
    const isFirst = index === 0 || data[index - 1].category !== row.category;
    if (!isFirst) return 0;
    let count = 0;
    for (let i = index; i < data.length; i++) {
      if (data[i].category === row.category) count++;
      else break;
    }
    return count;
  });

  return (
    <Card className="p-4 shadow-sm ring-0">
      <h2 className="mb-3 text-base font-semibold">Employee Performance by Category</h2>
      <div
        ref={scrollRef}
        className="overflow-auto rounded-xl shadow-sm *:data-[slot=table-container]:overflow-visible"
        style={{ maxHeight: 500 }}
      >
        <Table>
          <TableHeader className="[&_tr]:border-b-0">
            <TableRow className="bg-muted/60">
              <TableHead>Category Name</TableHead>
              <TableHead>Employee Name</TableHead>
              <TableHead className="text-center">Gross Sales</TableHead>
              <TableHead className="text-center">Net Sales</TableHead>
              <TableHead className="text-center"># Items</TableHead>
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
                {rowSpans[i] > 0 && (
                  <TableCell rowSpan={rowSpans[i]} className="align-top font-medium">
                    {row.category}
                  </TableCell>
                )}
                <TableCell>{row.employeeName}</TableCell>
                <TableCell className="relative text-center font-medium">
                  <Bar percentage={(row.grossSales / maxGrossSales) * 100} />
                  <span className="relative">
                    ${row.grossSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </TableCell>
                <TableCell className="relative text-center font-medium">
                  <Bar percentage={(row.netSales / maxNetSales) * 100} />
                  <span className="relative">
                    ${row.netSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </TableCell>
                <TableCell className="relative text-center font-medium">
                  <Bar percentage={(row.items / maxItems) * 100} />
                  <span className="relative">{row.items}</span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
