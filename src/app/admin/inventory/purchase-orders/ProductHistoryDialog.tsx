"use client";

import { useEffect, useState } from "react";
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { DateRange } from "react-day-picker";

import { fetchPurchaseOrderProductHistory } from "@/services/reporting/purchaseOrderProductHistory";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function defaultRange(): DateRange {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 89);
  return { from, to };
}

function toISO(d: Date) {
  return d.toISOString().split("T")[0];
}

export default function ProductHistoryDialog({
  open,
  productId,
  productName,
  shopId,
  onClose,
}: {
  open: boolean;
  productId?: string;
  productName?: string;
  shopId?: string;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any[]>([]);
  const [summary, setSummary] = useState<{ orderedQty: number; receivedQty: number; unitCost: number } | null>(null);
  const [range, setRange] = useState<DateRange | undefined>(defaultRange());

  const fetchHistory = async (dateRange: DateRange) => {
    if (!productId || !dateRange.from) return;
    setLoading(true);
    try {
      const from = dateRange.from;
      const to = dateRange.to ?? dateRange.from;
      const daysInRange = Math.round((to.getTime() - from.getTime()) / 86400000) + 1;
      const params: Record<string, any> = {
        productId,
        startDate: toISO(from),
        endDate: toISO(to),
        page: 1,
        limit: Math.max(daysInRange, 1),
        ...(shopId ? { shopId } : {}),
      };
      const res = await fetchPurchaseOrderProductHistory(params);
      setData(res?.data ?? []);
      setSummary(res?.summary ?? null);
    } catch (err) {
      console.error("Failed to fetch purchase order product history:", err);
      setData([]);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      const initial = defaultRange();
      setRange(initial);
      fetchHistory(initial);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, productId]);

  const handleRangeChange = (next: DateRange | undefined) => {
    setRange(next);
    if (next?.from) fetchHistory(next);
  };

  const chartData = data.filter((row) => row.orderedQty > 0 || row.receivedQty > 0);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Purchase History{productName ? ` — ${productName}` : ""}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <DateRangePicker value={range} onChange={handleRangeChange} />

          {loading ? (
            <div className="flex h-80 items-center justify-center text-sm text-muted-foreground">Loading…</div>
          ) : chartData.length === 0 ? (
            <div className="flex h-80 items-center justify-center text-sm text-muted-foreground">
              No purchase order history in this range
            </div>
          ) : (
            <div style={{ width: "100%", height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                  <YAxis yAxisId="qty" allowDecimals={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                  <YAxis yAxisId="cost" orientation="right" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                  <Tooltip />
                  <Legend />
                  <Bar yAxisId="qty" dataKey="orderedQty" name="Ordered Qty" fill="#2563eb" barSize={24} />
                  <Bar yAxisId="qty" dataKey="receivedQty" name="Received Qty" fill="#16a34a" barSize={24} />
                  <Line yAxisId="cost" type="monotone" dataKey="unitCost" name="Unit Cost ($)" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}

          {summary && (
            <div className="flex gap-6 text-sm text-muted-foreground">
              <span>
                Total Ordered: <strong className="text-foreground">{summary.orderedQty}</strong>
              </span>
              <span>
                Total Received: <strong className="text-foreground">{summary.receivedQty}</strong>
              </span>
              <span>
                Avg Unit Cost: <strong className="text-foreground">${Number(summary.unitCost ?? 0).toFixed(2)}</strong>
              </span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
