"use client";

import { useState } from "react";
import type { DateRange } from "react-day-picker";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Percent } from "lucide-react";

import { useShop } from "@/context/shop-context";
import { fetchEodSalesSummary } from "@/services/reporting/eodSalesSummary";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import type { RevenueComparisonResult } from "./types";

function startOfDay(d: Date) {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}
function endOfDay(d: Date) {
  const copy = new Date(d);
  copy.setHours(23, 59, 59, 999);
  return copy;
}
function addDays(d: Date, days: number) {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + days);
  return copy;
}
function startOfMonth(d: Date) {
  return startOfDay(new Date(d.getFullYear(), d.getMonth(), 1));
}
function endOfMonth(d: Date) {
  return endOfDay(new Date(d.getFullYear(), d.getMonth() + 1, 0));
}
function toDayString(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function RevenueComparisonTool({
  formatCurrency,
  onResultChange,
}: {
  formatCurrency: (v: number) => string;
  onResultChange?: (result: RevenueComparisonResult) => void;
}) {
  const { shopId } = useShop();

  const [currentPeriod, setCurrentPeriod] = useState<DateRange>({
    from: startOfDay(addDays(new Date(), -7)),
    to: endOfDay(new Date()),
  });
  const [previousPeriod, setPreviousPeriod] = useState<DateRange>({
    from: startOfDay(addDays(new Date(), -14)),
    to: endOfDay(addDays(new Date(), -7)),
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RevenueComparisonResult | null>(null);

  const fetchRevenue = async (startDate: string, endDate: string) => {
    const response = await fetchEodSalesSummary({ shopId, fromDate: startDate, toDate: endDate });
    return response?.data?.overallStats?.netSales?.total ?? 0;
  };

  const handleCalculate = async (curr = currentPeriod, prev = previousPeriod) => {
    if (!curr.from || !curr.to || !prev.from || !prev.to) {
      toast.warning("Please select both date ranges");
      return;
    }
    setLoading(true);
    try {
      const [currentRevenue, previousRevenue] = await Promise.all([
        fetchRevenue(toDayString(curr.from), toDayString(curr.to)),
        fetchRevenue(toDayString(prev.from), toDayString(prev.to)),
      ]);

      const difference = currentRevenue - previousRevenue;
      const percentageChange =
        previousRevenue !== 0 ? (difference / Math.abs(previousRevenue)) * 100 : currentRevenue > 0 ? 100 : 0;

      const resultData: RevenueComparisonResult = {
        currentRevenue,
        previousRevenue,
        difference,
        percentageChange,
        isIncrease: difference >= 0,
      };
      setResult(resultData);
      onResultChange?.(resultData);
    } catch (error) {
      console.error("Error fetching revenue data:", error);
      toast.error("Failed to fetch comparison data");
    } finally {
      setLoading(false);
    }
  };

  const applyPreset = (curr: DateRange, prev: DateRange) => {
    setCurrentPeriod(curr);
    setPreviousPeriod(prev);
    handleCalculate(curr, prev);
  };

  return (
    <Card className="p-4 shadow-sm ring-0">
      <div className="mb-4 flex items-center gap-3">
        <div className="rounded-lg bg-blue-50 p-2 dark:bg-blue-950/40">
          <Percent className="size-5 text-blue-500" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">Revenue Comparison Tool</h3>
          <p className="text-sm text-muted-foreground">Compare revenue between two periods and calculate percentage change</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col items-end gap-4 lg:flex-row">
          <div className="w-full flex-1 space-y-1">
            <label className="text-sm font-medium text-muted-foreground">Current Period</label>
            <DateRangePicker value={currentPeriod} onChange={(r) => r && setCurrentPeriod(r)} className="w-full" />
          </div>
          <div className="w-full flex-1 space-y-1">
            <label className="text-sm font-medium text-muted-foreground">Previous Period</label>
            <DateRangePicker value={previousPeriod} onChange={(r) => r && setPreviousPeriod(r)} className="w-full" />
          </div>
          <Button onClick={() => handleCalculate()} disabled={loading} className="w-full lg:w-auto lg:min-w-40">
            {loading ? "Calculating..." : "Calculate Change"}
          </Button>
        </div>

        {result && (
          <div className="grid grid-cols-1 gap-4 pt-4 shadow-[inset_0_1px_0_rgba(0,0,0,0.06)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] md:grid-cols-3">
            <Card className="bg-muted/40 p-4 shadow-none ring-0">
              <p className="text-sm text-muted-foreground">Previous Period Revenue</p>
              <p className="text-lg font-semibold">{formatCurrency(result.previousRevenue)}</p>
            </Card>
            <Card className="bg-blue-50 p-4 shadow-none ring-0 dark:bg-blue-950/30">
              <p className="text-sm text-muted-foreground">Current Period Revenue</p>
              <p className="text-lg font-semibold text-sky-600">{formatCurrency(result.currentRevenue)}</p>
            </Card>
            <Card
              className={`p-4 shadow-none ring-0 ${result.isIncrease ? "bg-green-50 dark:bg-green-950/30" : "bg-red-50 dark:bg-red-950/30"}`}
            >
              <p className="text-sm text-muted-foreground">{result.isIncrease ? "Revenue Increase" : "Revenue Decrease"}</p>
              <p className={`flex items-center gap-1 text-2xl font-bold ${result.isIncrease ? "text-emerald-500" : "text-red-500"}`}>
                {result.isIncrease ? <ArrowUp className="size-5" /> : <ArrowDown className="size-5" />}
                {Math.abs(result.percentageChange).toFixed(1)}%
              </p>
              <div className="mt-2 text-sm">
                <span className={result.isIncrease ? "text-emerald-600" : "text-red-600"}>
                  {result.isIncrease ? "+" : "-"}
                  {formatCurrency(Math.abs(result.difference))}
                </span>
                <span className="ml-1 text-muted-foreground">difference</span>
              </div>
            </Card>
          </div>
        )}

        <div className="pt-4 shadow-[inset_0_1px_0_rgba(0,0,0,0.06)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
          <p className="mb-2 text-sm text-muted-foreground">Quick Presets:</p>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                applyPreset(
                  { from: startOfDay(addDays(new Date(), -7)), to: endOfDay(new Date()) },
                  { from: startOfDay(addDays(new Date(), -14)), to: endOfDay(addDays(new Date(), -7)) },
                )
              }
            >
              Last 7 Days vs Previous 7 Days
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const now = new Date();
                const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                applyPreset(
                  { from: startOfMonth(now), to: endOfDay(now) },
                  { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) },
                );
              }}
            >
              This Month vs Last Month
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const now = new Date();
                const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);
                applyPreset(
                  { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) },
                  { from: startOfMonth(twoMonthsAgo), to: endOfMonth(twoMonthsAgo) },
                );
              }}
            >
              Last Month vs 2 Months Ago
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
