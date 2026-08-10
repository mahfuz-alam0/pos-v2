"use client";

import { useEffect, useState } from "react";
import { useShop } from "@/context/shop-context";
import { getSaleHourWeekDay } from "@/services/stats/dashboard/rankCharts";

const DAYS_OF_WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const CURRENT_HOUR = new Date().getHours();
// Only these hours get a label under the bars — labeling all 24 would collide.
const LABELED_HOURS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 20, 23]);

function hourLabel(hour) {
  const h = hour % 12 === 0 ? 12 : hour % 12;
  const ampm = hour >= 12 ? "PM" : "AM";
  return `${h} ${ampm}`;
}

// backend sends "4:00 AM" (see BusyTimesChart.tsx's formatTime for the same pattern) — normalize to "4 AM" to match hourLabel()
function normalizeTwelveHoursTime(twelveHoursTime) {
  const [hour] = twelveHoursTime.split(":");
  const ampm = twelveHoursTime.includes("PM") ? "PM" : "AM";
  return `${parseInt(hour, 10)} ${ampm}`;
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
          const timeLabel = normalizeTwelveHoursTime(item._id.twelveHoursTime);
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
  const isToday = selectedDay === (new Date().getDay() === 0 ? 7 : new Date().getDay());

  return (
    <div className="relative flex h-full min-w-0 flex-col overflow-hidden rounded-xl bg-component-bg shadow-md">
      <div className="p-3 pb-0">
        <h2 className="m-0 text-lg font-normal text-text">Popular Times</h2>

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
                <p
                  className={`m-0 inline-block border-b-2 pb-0.5 text-sm ${
                    active ? "border-[#2A9D8F] font-bold text-[#2A9D8F]" : "border-transparent text-muted-foreground"
                  }`}
                >
                  {day}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-2 h-27.5 overflow-x-auto">
        {loading ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Loading…</div>
        ) : filteredStats.length !== 0 ? (
          (() => {
            const maxSales = Math.max(1, ...filteredStats.map((d) => d.sales));
            return (
              <div className="flex h-full min-w-120 flex-col">
                <div className="flex flex-1 items-end gap-0.5">
                  {filteredStats.map(({ time, sales }, hour) => (
                    <div key={hour} className="group relative h-full flex-1">
                      <div className="absolute bottom-0 left-1/2 h-full w-2 -translate-x-1/2 overflow-hidden rounded-full" style={{ backgroundColor: "#BDBBBB" }}>
                        {sales > 0 && (
                          <div
                            className="absolute inset-x-0 bottom-0 rounded-full bg-[#2A9D8F]"
                            style={{ height: `${Math.max(22, Math.round((sales / maxSales) * 100))}%` }}
                          />
                        )}
                      </div>
                      {isToday && hour === CURRENT_HOUR && (
                        <span className="absolute -bottom-1.5 left-1/2 size-1 -translate-x-1/2 rounded-full bg-red-500" />
                      )}
                      <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 flex-col items-center group-hover:flex">
                        <div className="rounded-lg border border-border bg-component-bg p-2.5 whitespace-nowrap shadow">
                          <p className="m-0 text-sm text-orange-500">{time.toUpperCase()}</p>
                          <p className="m-0 text-sm text-[#2A9D8F]">Sales: {sales}</p>
                        </div>
                        <div className="-mt-1 size-2 rotate-45 border-r border-b border-border bg-component-bg" />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex">
                  {filteredStats.map((_, hour) => (
                    <div key={hour} className="flex flex-1 justify-center">
                      {LABELED_HOURS.has(hour) && <span className="h-1.5 w-px bg-border" />}
                    </div>
                  ))}
                </div>
                <div className="mt-1 flex text-[10px] text-muted-foreground">
                  {filteredStats.map((_, hour) => (
                    <span key={hour} className="flex-1 text-center whitespace-nowrap">
                      {LABELED_HOURS.has(hour) ? hourLabel(hour) : ""}
                    </span>
                  ))}
                </div>
              </div>
            );
          })()
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">No Data Found</div>
        )}
      </div>
    </div>
  );
}
