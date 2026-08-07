"use client";

import { useEffect, useState } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { useShop } from "@/context/shop-context";
import { getCustomerConversionsDailyRank, getCustomerConversionsMonthlyRank } from "@/services/stats/dashboard/rankCharts";
import { MONTH_NAMES } from "@/util/dateUtil";

const TIME_OPTIONS = [
  { value: "14", label: "Past 14 days" },
  { value: "30", label: "Past 30 days" },
  { value: "3", label: "Past 3 months" },
  { value: "6", label: "Past 6 months" },
];

function CustomTooltip({ active, payload }: { active?: boolean; payload?: any[] }) {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0].payload;
  return (
    <div className="rounded-lg border border-border bg-component-bg p-2.5 shadow">
      <p className="m-0 font-normal text-orange-500">{data.name}</p>
      <p className="m-0 text-[#038FDE]">Total Added: {data["Total Added"]}</p>
      <p className="m-0 text-[#038FDE]">Total Served: {data["Total Served"]}</p>
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
    <div className="h-full min-w-0 rounded-xl bg-component-bg shadow-md p-3">
      <div className="flex flex-row items-center gap-3">
        <h2 className="m-0 text-lg font-normal text-text">Conversions</h2>
        <div className="ml-auto truncate">
          <select
            className="w-27.5 rounded-md border border-border bg-component-bg px-2 py-1 text-sm md:w-30 xl:w-37.5"
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

      {loading ? (
        <div className="flex h-32.5 items-center justify-center text-sm text-muted-foreground">Loading…</div>
      ) : data.length === 0 ? (
        <div className="flex h-32.5 items-center justify-center text-sm text-muted-foreground">No Data Found</div>
      ) : (
        <div className="mt-2 h-32.5 w-full">
          <ResponsiveContainer width="100%" height="100%" debounce={50}>
            <AreaChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <Tooltip content={<CustomTooltip />} />
              <XAxis
                dataKey="name"
                interval={0}
                tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                tickFormatter={(tick, index) => (index % 2 === 0 ? tick : "")}
              />
              <defs>
                <linearGradient id="conversionsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F4A261" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#F5FCFD" stopOpacity={0.8} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="Total Added"
                strokeWidth={2}
                stroke="#F4A261"
                fill="url(#conversionsGradient)"
                fillOpacity={0.8}
              />
              <Area type="monotone" dataKey="Total Served" strokeWidth={2} stroke="none" fill="none" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
