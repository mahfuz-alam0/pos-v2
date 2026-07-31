"use client";

import { useMemo } from "react";
import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { SalesHourStat } from "./types";

const TIME_SLOTS = [
  "12 AM", "1 AM", "2 AM", "3 AM", "4 AM", "5 AM", "6 AM", "7 AM",
  "8 AM", "9 AM", "10 AM", "11 AM", "12 PM", "1 PM", "2 PM", "3 PM",
  "4 PM", "5 PM", "6 PM", "7 PM", "8 PM", "9 PM", "10 PM", "11 PM",
];

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const DAY_COLORS: Record<string, string> = {
  Sunday: "#8884d8",
  Monday: "#82ca9d",
  Tuesday: "#ffc658",
  Wednesday: "#ff7300",
  Thursday: "#387908",
  Friday: "#ff0000",
  Saturday: "#0000ff",
};

function formatTime(time: string) {
  const [hour] = time.split(":");
  const period = time.includes("AM") ? "AM" : "PM";
  return `${parseInt(hour, 10)} ${period}`;
}

function transformSalesHourData(weekDaysData: SalesHourStat[]) {
  const chartData = TIME_SLOTS.map((time) => ({
    time,
    Sunday: 0,
    Monday: 0,
    Tuesday: 0,
    Wednesday: 0,
    Thursday: 0,
    Friday: 0,
    Saturday: 0,
  }));

  weekDaysData.forEach(({ twelveHoursTime, totalHitCount, weekDay }) => {
    const timeSlotIndex = TIME_SLOTS.indexOf(formatTime(twelveHoursTime));
    const dayName = DAY_NAMES[weekDay - 1];
    if (timeSlotIndex !== -1 && dayName) {
      (chartData[timeSlotIndex] as any)[dayName] += totalHitCount;
    }
  });

  return chartData;
}

export default function BusyTimesChart({ salesHourStats }: { salesHourStats: SalesHourStat[] }) {
  const data = useMemo(() => transformSalesHourData(salesHourStats), [salesHourStats]);

  if (salesHourStats.length === 0) {
    return <div className="py-10 text-center text-sm text-muted-foreground">No busy times data available</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={400}>
      <AreaChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="time" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip contentStyle={{ backgroundColor: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
        <Legend />
        {DAY_NAMES.map((day) => (
          <Area key={day} type="linear" dataKey={day} stroke={DAY_COLORS[day]} fillOpacity={0} />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}
