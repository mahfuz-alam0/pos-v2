"use client";

import { useEffect, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useShop } from "@/context/shop-context";
import { getCustomerConversionsDailyRank, getCustomerConversionsMonthlyRank } from "@/services/stats/dashboard/rankCharts";
import { MONTH_NAMES } from "@/util/dateUtil";

const TIME_OPTIONS = [
  { value: "14", label: "Past 14 days" },
  { value: "30", label: "Past 30 days" },
  { value: "3", label: "Past 3 months" },
  { value: "6", label: "Past 6 months" },
];

const ADDED_COLOR = "#2A9D8F";
const SERVED_COLOR = "#F4A261";

function CustomTooltip({ active, payload }: { active?: boolean; payload?: any[] }) {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0].payload;
  return (
    <div className="rounded-xl border border-border bg-popover p-2.5 shadow-lg">
      <p className="m-0 font-medium text-text">{data.name}</p>
      <p className="m-0 text-sm font-semibold text-[#2A9D8F]">Total Added: {data["Total Added"]}</p>
      <p className="m-0 text-sm font-semibold text-[#F4A261]">Total Served: {data["Total Served"]}</p>
    </div>
  );
}

export default function ConversionStats() {
  const { shopId } = useShop();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState("14");

  useEffect(() => {
    if (!shopId) return;
    (async () => {
      setLoading(true);
      try {
        const daily = timeframe === "14" || timeframe === "30";
        const res = daily
          ? await getCustomerConversionsDailyRank(timeframe, shopId)
          : await getCustomerConversionsMonthlyRank(timeframe, shopId);

        const breakdownData = res?.data?.data?.breakdownData || [];
        if (breakdownData.length > 0) {
          const formattedData = breakdownData
            .map((item) => ({
              name: daily ? `${MONTH_NAMES[item._id.month - 1]} ${item._id.dayOfMonth}` : MONTH_NAMES[item._id.month - 1],
              "Total Added": item.totalAdded,
              "Total Served": item.totalServed,
            }))
            .sort((a, b) => new Date(a.name).getTime() - new Date(b.name).getTime());
          setData(formattedData);
        } else {
          setData([]);
        }
      } catch (err) {
        console.error("Error fetching conversions:", err);
        setData([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [shopId, timeframe]);

  return (
    <div className="flex h-full min-w-0 flex-col overflow-hidden rounded-2xl bg-component-bg shadow-sm">
      <div className="flex flex-row items-center gap-3 px-5 pt-4">
        <h2 className="m-0 text-[15px] font-semibold text-heading">Conversions</h2>
        <div className="ml-auto">
          <select
            className="rounded-md border border-input bg-component-bg px-2 py-1 text-sm text-text"
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
          >
            {TIME_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-center gap-5 px-5 pt-3 select-none">
        <div className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full" style={{ backgroundColor: ADDED_COLOR }} />
          <span className="text-xs font-medium text-muted-foreground">Added</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full" style={{ backgroundColor: SERVED_COLOR }} />
          <span className="text-xs font-medium text-muted-foreground">Served</span>
        </div>
      </div>

      {loading ? (
        <div className="flex h-32.5 items-center justify-center px-3 text-sm text-muted-foreground">Loading…</div>
      ) : data.length === 0 ? (
        <div className="flex h-32.5 items-center justify-center px-3 text-sm text-muted-foreground">No Data Found</div>
      ) : (
        <div className="mt-2 h-32.5 w-full flex-1 px-2 pb-3">
          <ResponsiveContainer width="100%" height="100%" debounce={50}>
            <LineChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <Tooltip content={<CustomTooltip />} />
              <XAxis
                dataKey="name"
                interval={0}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                tickFormatter={(tick, index) => (index % 2 === 0 ? tick : "")}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                width={28}
                tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                allowDecimals={false}
              />
              <Line
                type="monotone"
                dataKey="Total Added"
                strokeWidth={2.5}
                stroke={ADDED_COLOR}
                dot={{ r: 2.5, fill: ADDED_COLOR, strokeWidth: 0 }}
                activeDot={{ r: 5 }}
              />
              <Line
                type="monotone"
                dataKey="Total Served"
                strokeWidth={2.5}
                stroke={SERVED_COLOR}
                strokeDasharray="5 4"
                dot={false}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
