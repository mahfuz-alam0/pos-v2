"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip } from "recharts";
import { useShop } from "@/context/shop-context";
import {
  getProductsDailyRank,
  getProductsMonthlyRank,
  getBrandsDailyRank,
  getBrandsMonthlyRank,
  getCategoriesDailyRank,
  getCategoriesMonthlyRank,
} from "@/services/stats/dashboard/rankCharts";
import { getTimeSeriesWithinTheDaysContext, getTimeSeriesWithinTheMonthsContext } from "@/util/dateUtil";

const TIME_OPTIONS = [
  { value: 7, label: "Past 7 Days" },
  { value: 15, label: "Past 15 Days" },
  { value: 3, label: "Past 3 Months" },
  { value: 6, label: "Past 6 Months" },
];

const TYPE_OPTIONS = ["Products", "Categories", "Brands"];

const TYPE_HREF = {
  Categories: "/catalog/classifications",
  Products: "/catalog/products",
  Brands: "/catalog/manufacturers",
};

const PALETTE = ["#E9C46A", "#2A9D8F", "#F4A261", "#f56c6c", "#7265e6", "#ffbf00", "#5b8c00", "#ff7f0e"];
const ITEMS_PER_PAGE = 3;

function preprocessData(entryKeyMap: Record<string, string>, breakdownData: any[], statsType: string, currentTypeValue: string, factor = 1) {
  const formatDate = (date) => {
    const [year, month, day] = date.split("-").map(Number);
    if (statsType === "days") {
      return `${String(month).padStart(2, "0")}.${String(day).padStart(2, "0")}.${String(year).slice(-2)}`;
    }
    return `${String(month).padStart(2, "0")}.${year}`;
  };

  const idField: string = { Products: "productId", Categories: "categoryId", Brands: "brandId" }[currentTypeValue] || "productId";

  const allDates = (
    statsType === "days"
      ? getTimeSeriesWithinTheDaysContext({ daysCount: factor })
      : getTimeSeriesWithinTheMonthsContext({ monthsCount: factor })
  ).map((item) => ({
    date: statsType === "days" ? `${item.year}-${item.month}-${item.day}` : `${item.year}-${item.month}`,
    data:
      (statsType === "days"
        ? breakdownData.find((o) => o._id.year === item.year && o._id.month === item.month && o._id.dayOfMonth === item.day)
        : breakdownData.find((o) => o._id.year === item.year && o._id.month === item.month)
      )?.contributionOfCategories ?? Object.keys(entryKeyMap).map((key): any => ({ totalBought: 0, [idField]: key })),
  }));

  const uniqueDates = Array.from(new Set(allDates.map((i) => i.date))).sort((a, b) => {
    const [ya, ma, da = 1] = a.split("-").map(Number);
    const [yb, mb, db = 1] = b.split("-").map(Number);
    return new Date(ya, ma - 1, da).getTime() - new Date(yb, mb - 1, db).getTime();
  });

  const finalData = uniqueDates.map((date) => ({
    name: formatDate(date),
    ...Object.fromEntries(Object.values(entryKeyMap).map((name) => [name, 0])),
  }));

  allDates.forEach(({ date, data }) => {
    const formattedDate = formatDate(date);
    const entry = finalData.find((e) => e.name === formattedDate);
    if (entry) {
      data.forEach(({ [idField]: id, totalBought }: any) => {
        const itemName = entryKeyMap[String(id)];
        if (itemName) entry[itemName] = totalBought;
      });
    }
  });

  return finalData;
}

function ChartTooltip({ active, payload }: { active?: boolean; payload?: any[] }) {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0].payload;
  return (
    <div className="max-w-75 rounded border border-border bg-component-bg p-2.5 shadow">
      <p className="m-0 text-sm text-orange-500">{data.name}</p>
      {Object.entries(data).map(
        ([key, value]) =>
          key !== "name" && (
            <div key={key} className="my-0.5 flex items-center justify-between gap-2">
              <p className="m-0 mr-2 max-w-37.5 truncate text-[#038FDE]">{key}</p>
              <p className="m-0 whitespace-nowrap text-[#038FDE]">QTY: {value as React.ReactNode}</p>
            </div>
          )
      )}
    </div>
  );
}

function LineIndicator({ title, widthPct, value, color }) {
  return (
    <div className="flex flex-col justify-center gap-3">
      <p className="m-0 truncate" title={title}>{title}</p>
      <div className="flex items-center">
        <div className="h-2 rounded" style={{ width: `${widthPct * 4}px`, backgroundColor: color }} />
        <span className="ml-2 text-xs text-muted-foreground">{value}</span>
      </div>
    </div>
  );
}

export default function RevenueBreakdownCard() {
  const { shopId } = useShop();
  const [currentTypeValue, setCurrentTypeValue] = useState("Products");
  const [statsType, setStatsType] = useState("days");
  const [statsDefaultValue, setStatsDefaultValue] = useState(7);
  const [stats, setStats] = useState(null);
  const [currentPage, setCurrentPage] = useState(0);

  const fetchByType = async (type, sType, count) => {
    try {
      let res;
      if (type === "Products") {
        res = sType === "days" ? await getProductsDailyRank(count, shopId) : await getProductsMonthlyRank(count, shopId);
      } else if (type === "Categories") {
        res = sType === "days" ? await getCategoriesDailyRank(count, shopId) : await getCategoriesMonthlyRank(count, shopId);
      } else if (type === "Brands") {
        res = sType === "days" ? await getBrandsDailyRank(count, shopId) : await getBrandsMonthlyRank(count, shopId);
      }
      setStats(res?.data?.data ?? null);
    } catch (err) {
      console.error("Error fetching revenue breakdown:", err);
    }
  };

  useEffect(() => {
    if (!shopId) return;
    fetchByType(currentTypeValue, statsType, statsDefaultValue);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTypeValue, shopId]);

  const handleTimeChange = (e) => {
    const opt = TIME_OPTIONS.find((o) => o.value === Number(e.target.value));
    const sType = opt.label.includes("Months") ? "months" : "days";
    setStatsDefaultValue(opt.value);
    setStatsType(sType);
    fetchByType(currentTypeValue, sType, opt.value);
  };

  const entryKeyMap: Record<string, string> = stats?.entryKeyMap || {};
  const breakdownData = stats?.breakdownData || [];
  const rankingData = stats?.rankingData || [];
  const hasChartData = Object.keys(entryKeyMap).length > 0 && breakdownData.length > 0;

  const chartData = useMemo(
    () => preprocessData(entryKeyMap, breakdownData, statsType, currentTypeValue, statsDefaultValue),
    [entryKeyMap, breakdownData, statsType, currentTypeValue, statsDefaultValue]
  );

  const productNames = Object.values(entryKeyMap);
  const colors = useMemo(
    () => productNames.reduce((acc, name, i) => ({ ...acc, [name]: PALETTE[i % PALETTE.length] }), {}),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [entryKeyMap]
  );

  const totalTimesBought = rankingData.reduce((acc, item) => acc + item.totalTimesBought, 0);
  const totalItems = rankingData.length;
  const startIndex = currentPage * ITEMS_PER_PAGE;
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, totalItems);
  const pageItems = rankingData.slice(startIndex, endIndex);

  const getPredefinedColor = (index) => ["#E9C46A", "#2A9D8F", "#F4A261"][index] || "#FE9E15";

  return (
    <div className="h-full rounded-xl border border-border bg-component-bg p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="m-0 text-lg font-semibold text-text">Revenue Breakdown</h2>
        <select
          className="rounded-md border border-border bg-component-bg px-2 py-1 text-sm"
          value={statsDefaultValue}
          onChange={handleTimeChange}
        >
          {TIME_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-4">
        <div className="flex flex-col gap-4 md:flex-row">
          {rankingData.length !== 0 && (
            <div className="w-full shrink-0 md:w-1/4">
              <ul className="flex list-none flex-col gap-4 p-0">
                {pageItems.map((item, index) => {
                  const percentage = totalTimesBought ? ((item.totalTimesBought / totalTimesBought) * 100).toFixed(0) : "0";
                  const displayName = item.name.length > 20 ? `${item.name.slice(0, 30)}...` : item.name;
                  const color = getPredefinedColor(index);
                  return (
                    <Link href={TYPE_HREF[currentTypeValue]} key={item.id} className="cursor-pointer">
                      <LineIndicator title={displayName} widthPct={Number(percentage)} value={`${percentage}%`} color={color} />
                    </Link>
                  );
                })}
              </ul>
            </div>
          )}

          <div className="relative min-w-0 flex-1">
            {hasChartData ? (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                  <Tooltip content={<ChartTooltip />} />
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  {Object.values(entryKeyMap).map((name) => (
                    <Area key={name} type="monotone" dataKey={name} fillOpacity={1} stroke={colors[name]} fill={colors[name]} />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-50 flex-col items-center justify-center rounded-md bg-surface-alt">
                <div className="text-muted-foreground">No data available</div>
                <div className="mt-2 text-sm text-muted-foreground">Try selecting a different time period</div>
              </div>
            )}

            <div className="mt-4 flex w-full justify-center gap-2">
              {TYPE_OPTIONS.map((type) => (
                <button
                  key={type}
                  onClick={() => {
                    setCurrentTypeValue(type);
                    setCurrentPage(0);
                  }}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    currentTypeValue === type
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-component-bg text-muted-foreground hover:text-text"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
