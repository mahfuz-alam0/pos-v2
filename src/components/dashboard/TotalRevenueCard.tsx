"use client";

import { useEffect, useMemo, useState } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip } from "recharts";
import { useShop } from "@/context/shop-context";
import { getSaleAmountDailyRank, getSaleAmountMonthlyRank } from "@/services/stats/dashboard/rankCharts";
import { getTimeSeriesWithinTheDaysContext, getTimeSeriesWithinTheMonthsContext } from "@/util/dateUtil";

const TIME_OPTIONS = [
  { value: 7, label: "Past 7 Days" },
  { value: 15, label: "Past 15 Days" },
  { value: 3, label: "Past 3 Months" },
  { value: 6, label: "Past 6 Months" },
];

function formatDate(year, month, day, statsType) {
  if (statsType === "days") {
    return `${String(day).padStart(2, "0")}.${String(month).padStart(2, "0")}.${String(year).slice(-2)}`;
  }
  const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

function preprocessData(breakdownData, statsType, factor) {
  const timeSeries =
    statsType === "months"
      ? getTimeSeriesWithinTheMonthsContext({ monthsCount: factor })
      : getTimeSeriesWithinTheDaysContext({ daysCount: factor });

  return timeSeries.map((item) => {
    const name = formatDate(item.year, item.month, item.day ?? 1, statsType);
    const match =
      statsType === "days"
        ? breakdownData.find((o) => o._id.year === item.year && o._id.month === item.month && o._id.dayOfMonth === item.day)
        : breakdownData.find((o) => o._id.year === item.year && o._id.month === item.month);
    return { name, Total: match?.totalSaleAmount ?? 0 };
  });
}

function calculateAverageGrowth(data) {
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

function ChartTooltip({ active, payload }: { active?: boolean; payload?: any[] }) {
  if (!active || !payload || !payload.length) return null;
  const { value } = payload[0];
  const { name } = payload[0].payload;
  return (
    <div className="max-w-75 rounded border border-border bg-component-bg p-2.5 shadow">
      <p className="m-0 text-sm text-orange-500">{name}</p>
      <p className="m-0 text-[#2A9D8F]">Total Revenue: ${value.toLocaleString()}</p>
    </div>
  );
}

export default function TotalRevenueCard() {
  const { shopId } = useShop();
  const [currentValue, setCurrentValue] = useState(7);
  const [statsType, setStatsType] = useState("days");
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchRevenue = async (sType, count) => {
    setLoading(true);
    try {
      const res = sType === "days" ? await getSaleAmountDailyRank(count, shopId) : await getSaleAmountMonthlyRank(count, shopId);
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

  const handleTimeChange = (e) => {
    const opt = TIME_OPTIONS.find((o) => o.value === Number(e.target.value));
    const sType = opt.label.includes("Months") ? "months" : "days";
    setCurrentValue(opt.value);
    setStatsType(sType);
    fetchRevenue(sType, opt.value);
  };

  const totalRevenue = useMemo(() => stats.reduce((acc, item) => acc + item.Total, 0), [stats]);
  const averageGrowth = useMemo(() => Math.round(calculateAverageGrowth(stats)), [stats]);

  return (
    <div className="relative flex h-full min-w-0 flex-col overflow-hidden rounded-xl bg-component-bg shadow-md">
      <div className="p-3 pb-0">
        <div className="flex flex-row items-center gap-3">
          <h2 className="m-0 text-lg font-normal text-text">Total Revenue</h2>
          <div className="ml-auto truncate">
            <select
              className="rounded-md border border-border bg-component-bg px-2 py-1 text-sm"
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

        <div className="mt-2">
          <h2 className="text-xs font-medium xl:text-sm">
            ${totalRevenue.toLocaleString()}
            <span className={`ml-2 text-sm font-semibold ${averageGrowth < 0 ? "text-red-500" : "text-green-600"}`}>
              {averageGrowth}%
            </span>
          </h2>
        </div>
      </div>

      <div className="mt-2 h-35 flex-1">
        {loading ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Loading…</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={stats} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <Tooltip content={<ChartTooltip />} />
              <defs>
                <linearGradient id="totalRevenueGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="5%" stopColor="#4ECDE4" stopOpacity={0.9} />
                  <stop offset="95%" stopColor="#06BB8A" stopOpacity={0.9} />
                </linearGradient>
              </defs>
              <Area
                dataKey="Total"
                type="monotone"
                strokeWidth={0}
                stroke="#4D95F3"
                fill="url(#totalRevenueGradient)"
                fillOpacity={1}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
