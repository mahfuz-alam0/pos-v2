"use client";

import { useEffect, useState } from "react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { useShop } from "@/context/shop-context";
import { getSaleHourWeekDay } from "@/services/stats/dashboard/rankCharts";

const DAYS_OF_WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function hourLabel(hour) {
  const h = hour % 12 === 0 ? 12 : hour % 12;
  const ampm = hour >= 12 ? "PM" : "AM";
  return `${h} ${ampm}`;
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0].payload;
  return (
    <div className="rounded-lg border border-border bg-component-bg p-2.5 shadow">
      <p className="m-0 text-orange-500">{data.time.toUpperCase()}</p>
      <p className="m-0 text-[color:#038FDE]">Sales: {data.sales}</p>
    </div>
  );
}

export default function PopularTimeCard() {
  const { shopId } = useShop();
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(new Date().getDay() === 0 ? 7 : new Date().getDay());

  useEffect(() => {
    if (!shopId) return;
    (async () => {
      setLoading(true);
      try {
        const res = await getSaleHourWeekDay(180, shopId);
        const breakdownData = res?.data?.data?.breakdownData || [];

        const formattedData = [];
        DAYS_OF_WEEK.forEach((_, dayIndex) => {
          for (let hour = 0; hour < 24; hour++) {
            formattedData.push({ time: hourLabel(hour), dayOfWeek: dayIndex + 1, sales: 0 });
          }
        });

        breakdownData.forEach((item) => {
          const timeLabel = item._id.twelveHoursTime;
          const index = formattedData.findIndex((d) => d.time === timeLabel && d.dayOfWeek === item._id.dayOfWeek);
          if (index !== -1) formattedData[index].sales = item.totalNumberOfSales || 0;
        });

        setStats(formattedData);
      } catch (err) {
        console.error("Error fetching popular times:", err);
        setStats([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [shopId]);

  const filteredStats = selectedDay !== null ? stats.filter((item) => item.dayOfWeek === selectedDay) : stats;

  return (
    <div className="relative flex h-full flex-col rounded-xl border border-border bg-component-bg p-4">
      <h2 className="m-0 text-[18px] font-semibold text-text">Popular Times</h2>

      <div className="mt-3 flex justify-center">
        {DAYS_OF_WEEK.map((day, index) => {
          const dayNum = index + 1;
          const active = selectedDay === dayNum;
          return (
            <div
              key={day}
              onClick={() => setSelectedDay(dayNum)}
              className="relative flex-1 cursor-pointer text-center"
            >
              <p className={`m-0 text-sm ${active ? "font-bold text-[color:#2A9D8F]" : "text-muted-foreground"}`}>{day}</p>
              {active && <div className="absolute top-[17px] left-[16px] h-1 w-[20%] bg-[color:#2A9D8F]" />}
            </div>
          );
        })}
      </div>

      <div className="mt-2 h-[110px]">
        {loading ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Loading…</div>
        ) : filteredStats.length !== 0 ? (
          <ResponsiveContainer width="90%" height="100%">
            <BarChart data={filteredStats} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <XAxis dataKey="time" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="sales" fill="#2A9D8F" radius={[8, 8, 0, 0]} background={{ fill: "#bdbbbb", radius: 8 }} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">No Data Found</div>
        )}
      </div>
    </div>
  );
}
