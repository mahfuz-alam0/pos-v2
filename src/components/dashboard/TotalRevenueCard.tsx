"use client";

import { useEffect, useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { useShop } from "@/context/shop-context";
import {
  getSaleAmountDailyRank,
  getSaleAmountMonthlyRank,
  type SaleAmountBreakdownPoint,
} from "@/services/stats/dashboard/rankCharts";
import { getTimeSeriesWithinTheDaysContext, getTimeSeriesWithinTheMonthsContext, TimeSeriesPoint } from "@/util/dateUtil";

type StatsType = "days" | "months";

interface TimeOption {
  value: number;
  label: string;
}

interface RevenuePoint {
  name: string;
  Total: number;
}

const TIME_OPTIONS: TimeOption[] = [
  { value: 7, label: "Past 7 Days" },
  { value: 15, label: "Past 15 Days" },
  { value: 3, label: "Past 3 Months" },
  { value: 6, label: "Past 6 Months" },
];

const BAR_COLOR = "#2A9D8F";

function formatDate(year: number, month: number, day: number | undefined, statsType: StatsType): string {
  if (statsType === "days") {
    return `${String(day).padStart(2, "0")}.${String(month).padStart(2, "0")}.${String(year).slice(-2)}`;
  }
  const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

function preprocessData(breakdownData: SaleAmountBreakdownPoint[], statsType: StatsType, factor: number): RevenuePoint[] {
  const timeSeries: TimeSeriesPoint[] =
    statsType === "months"
      ? getTimeSeriesWithinTheMonthsContext({ monthsCount: factor })
      : getTimeSeriesWithinTheDaysContext({ daysCount: factor });

  return timeSeries.map((item) => {
    const name = formatDate(item.year, item.month, item.day, statsType);
    const match =
      statsType === "days"
        ? breakdownData.find((o) => o._id.year === item.year && o._id.month === item.month && o._id.dayOfMonth === item.day)
        : breakdownData.find((o) => o._id.year === item.year && o._id.month === item.month);
    return { name, Total: match?.totalSaleAmount ?? 0 };
  });
}

function calculateAverageGrowth(data: RevenuePoint[]): number {
  let totalGrowth = 0;
  let count = 0;
  for (let i = 1; i < data.length; i++) {
    const prev = data[i - 1].Total;
    const curr = data[i].Total;
    if (prev > 0) {
      totalGrowth += ((curr - prev) / prev) * 100;
      count++;
    }
  }
  return count > 0 ? totalGrowth / count : 0;
}

interface TooltipPayloadEntry {
  value?: number | string;
  payload?: { name?: string };
}

function ChartTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayloadEntry[] }) {
  if (!active || !payload || !payload.length) return null;
  const { value } = payload[0];
  const { name } = payload[0].payload ?? {};
  return (
    <div className="max-w-75 rounded-xl border border-border bg-popover p-2.5 shadow-lg">
      <p className="m-0 text-sm text-orange-500">{name}</p>
      <p className="m-0 font-semibold text-heading">Total Revenue: ${Number(value ?? 0).toLocaleString()}</p>
    </div>
  );
}

export default function TotalRevenueCard() {
  const { shopId } = useShop();
  const [currentValue, setCurrentValue] = useState<number>(7);
  const [statsType, setStatsType] = useState<StatsType>("days");
  const [stats, setStats] = useState<RevenuePoint[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRevenue = async (sType: StatsType, count: number) => {
    setLoading(true);
    try {
      const res =
        sType === "days" ? await getSaleAmountDailyRank(count, shopId) : await getSaleAmountMonthlyRank(count, shopId);
      const breakdownData = res?.data?.data?.breakdownData || [];
      setStats(preprocessData(breakdownData, sType, count));
    } catch (err) {
      console.error("Error fetching total revenue:", err);
      setStats([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!shopId) return;
    fetchRevenue(statsType, currentValue);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopId]);

  const handleTimeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const opt = TIME_OPTIONS.find((o) => o.value === Number(e.target.value));
    if (!opt) return;
    const sType: StatsType = opt.label.includes("Months") ? "months" : "days";
    setCurrentValue(opt.value);
    setStatsType(sType);
    fetchRevenue(sType, opt.value);
  };

  const totalRevenue = useMemo(() => stats.reduce((acc, item) => acc + item.Total, 0), [stats]);
  const averageGrowth = useMemo(() => Math.round(calculateAverageGrowth(stats)), [stats]);

  return (
    <div className="relative flex h-full min-w-0 flex-col overflow-hidden rounded-2xl bg-component-bg shadow-sm">
      <div className="flex flex-row items-center gap-3 px-5 pt-4">
        <h2 className="m-0 text-[15px] font-semibold text-heading">Total Revenue</h2>
        <div className="ml-auto">
          <select
            className="rounded-md border border-input bg-component-bg px-2 py-1 text-sm text-text"
            value={currentValue}
            onChange={handleTimeChange}
          >
            {TIME_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="px-5 pt-2">
        <div className="flex items-baseline gap-2">
          <h2 className="text-xl font-bold text-heading">${totalRevenue.toLocaleString()}</h2>
          <span className={`text-sm font-semibold ${averageGrowth < 0 ? "text-red-500" : "text-green-600"}`}>
            {averageGrowth}%
          </span>
        </div>
      </div>

      <div className="mt-3 h-32 flex-1 px-2 pb-3">
        {loading ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Loading…</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={stats} margin={{ top: 5, right: 5, left: 5, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
              <Tooltip content={<ChartTooltip />} cursor={{ stroke: "var(--border)" }} />
              <XAxis
                dataKey="name"
                interval={0}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                tickFormatter={(tick, index) => (index % 2 === 0 ? tick : "")}
              />
              <Line
                type="monotone"
                dataKey="Total"
                stroke={BAR_COLOR}
                strokeWidth={2.5}
                dot={{ r: 3, fill: BAR_COLOR, strokeWidth: 0 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
