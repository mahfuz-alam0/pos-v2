"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Bar, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, LabelList } from "recharts";
import { useShop } from "@/context/shop-context";
import { fetchSalesByEmployee } from "@/services/reporting/salesByEmployee";
import { fetchAccessControlledEmployees } from "@/services/employees/listAccessControlled";
import { nowInShopTimezone, formatCurrency } from "@/util/dateUtil";
import { ApiSelect } from "@/components/ui/api-select";

const REVENUE_COLOR = "#14b8a6";
const ORDERS_COLOR = "#f97316";

function CustomTooltip({ active, payload }: { active?: boolean; payload?: any[] }) {
  if (!active || !payload || !payload.length) return null;
  const row = payload[0].payload;
  const avgTicket = row.Orders > 0 ? row.Revenue / row.Orders : 0;
  return (
    <div className="rounded-lg bg-[#0f1f3d] p-3.5 shadow-lg" style={{ minWidth: 190 }}>
      <div className="mb-2.5 text-[15px] font-bold text-white">{row.name}</div>
      {[
        ["Revenue", formatCurrency(row.Revenue)],
        ["Orders", row.Orders],
        ["Avg ticket", formatCurrency(avgTicket)],
      ].map(([label, value]) => (
        <div key={label} className="mt-1.5 flex justify-between gap-6">
          <span className="text-[13px] text-[#93a3bd]">{label}</span>
          <span className="text-[13px] font-bold text-white">{value}</span>
        </div>
      ))}
    </div>
  );
}

export default function EmployeeSalesTodayChart({
  employeeId,
  onEmployeeChange,
}: {
  employeeId?: string | null
  onEmployeeChange?: (id: string | null) => void
}) {
  const { shopId } = useShop();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(nowInShopTimezone().format("YYYY-MM-DD"));

  useEffect(() => {
    if (!shopId) return;
    (async () => {
      setLoading(true);
      try {
        const params = {
          startDate: date,
          endDate: date,
          shopId,
          limit: 100,
          page: 1,
          ...(employeeId ? { responsibleEmployeeId: employeeId } : {}),
        };
        const response = await fetchSalesByEmployee(params);
        setRows(Array.isArray(response?.data?.data) ? response.data.data : []);
      } catch (err) {
        console.error("Error fetching employee sales:", err);
        setRows([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [shopId, employeeId, date]);

  const shiftDate = (deltaDays) => {
    const d = new Date(date);
    d.setDate(d.getDate() + deltaDays);
    return d.toISOString().slice(0, 10);
  };
  const goToPrev = () => setDate(shiftDate(-1));
  const goToNext = () => {
    const next = shiftDate(1);
    if (next <= nowInShopTimezone().format("YYYY-MM-DD")) setDate(next);
  };
  const isToday = date === nowInShopTimezone().format("YYYY-MM-DD");

  const chartData = [...rows]
    .map((row) => ({ name: row.createdEmployeeName || "Unknown", Revenue: row.grossSales || 0, Orders: row.totalOrders || 0 }))
    .sort((a, b) => b.Revenue - a.Revenue);

  const topRevenue = chartData.length ? chartData[0].Revenue : 0;

  const renderBarLabel = (props) => {
    const { x, y, width, value, index } = props;
    const isTop = chartData[index]?.Revenue === topRevenue && value > 0;
    const cx = x + width / 2;
    return (
      <g>
        {isTop && (
          <text x={cx} y={y - 26} textAnchor="middle" fontSize={11} fontWeight={700} fill={ORDERS_COLOR}>
            ★ TOP TODAY
          </text>
        )}
        <text x={cx} y={y - 10} textAnchor="middle" fontSize={13} fontWeight={700} fill="var(--text)">
          {formatCurrency(value)}
        </text>
      </g>
    );
  };

  const dateLabel = new Date(`${date}T00:00:00`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const dateShort = new Date(`${date}T00:00:00`).toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });

  return (
    <div className="h-full rounded-xl border border-border bg-component-bg">
      <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-border px-4 py-3">
        <span className="text-base font-semibold text-text">
          Today&apos;s Sales by Employee &mdash; <span className="text-[#2A9D8F]">{dateLabel}</span>
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <ApiSelect
            placeholder="Select Employee"
            value={employeeId ?? null}
            onChange={(val) => onEmployeeChange?.(val ? String(val) : null)}
            fetchPage={async (page, search) => {
              const res = await fetchAccessControlledEmployees(20, page, search);
              return {
                items: (res?.data?.employees ?? []).map((e: any) => ({ id: String(e.id), name: e.name })),
                totalPages: res?.data?.paginationData?.totalPages ?? 1,
              };
            }}
          />
          <button
            onClick={goToPrev}
            className="flex items-center gap-1 rounded-full border border-primary/30 bg-component-bg px-3 py-1 text-sm font-medium text-[#2A9D8F]"
          >
            <ChevronLeft className="size-3" /> Previous
          </button>
          <span className="rounded-full bg-surface-alt px-3 py-1 text-sm font-semibold text-[#2A9D8F]">{dateShort}</span>
          <button
            onClick={goToNext}
            disabled={isToday}
            className="flex items-center gap-1 rounded-full border px-3 py-1 text-sm font-medium disabled:cursor-not-allowed"
            style={{
              borderColor: isToday ? "var(--border)" : "rgba(196,181,244,0.6)",
              color: isToday ? "var(--muted-foreground)" : "#2A9D8F",
            }}
          >
            Next <ChevronRight className="size-3" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="px-4 py-6 text-center text-sm text-muted-foreground">Loading…</div>
      ) : chartData.length === 0 ? (
        <div className="px-4 py-6 text-center text-muted-foreground">No sales on {dateLabel}</div>
      ) : (
        <>
          <div className="flex items-center gap-5 px-4 pt-3 select-none">
            <div className="flex items-center gap-1.5">
              <span
                className="size-3 rounded"
                style={{ background: `linear-gradient(180deg, ${REVENUE_COLOR}, #0f766e)` }}
              />
              <span className="text-[13px] font-semibold text-muted-foreground">Revenue</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="size-3 rounded" style={{ border: `2px solid ${ORDERS_COLOR}` }} />
              <span className="text-[13px] font-semibold text-muted-foreground">Orders</span>
            </div>
          </div>

          <div className="px-4 pb-4" style={{ width: "100%", height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 40, right: 20, left: 0, bottom: 10 }}>
                <defs>
                  <linearGradient id="revenueBarGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#5eead4" />
                    <stop offset="100%" stopColor="#0f766e" />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} interval={0} tick={{ fontSize: 12, fontWeight: 600, fill: "var(--muted-foreground)" }} />
                <YAxis yAxisId="left" axisLine={false} tickLine={false} tickFormatter={(v) => formatCurrency(v)} tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} allowDecimals={false} tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar yAxisId="left" dataKey="Revenue" fill="url(#revenueBarGradient)" radius={[8, 8, 0, 0]} maxBarSize={56} name="Revenue">
                  <LabelList dataKey="Revenue" content={renderBarLabel} />
                </Bar>
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="Orders"
                  name="Orders"
                  stroke={ORDERS_COLOR}
                  strokeWidth={2.5}
                  dot={{ r: 5, fill: "#fff", stroke: ORDERS_COLOR, strokeWidth: 2 }}
                  activeDot={{ r: 6 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}
