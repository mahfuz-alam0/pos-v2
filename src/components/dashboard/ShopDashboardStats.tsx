"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useShop } from "@/context/shop-context";
import { fetchShopDashboardStats } from "@/services/stats/dashboard/shopDashboard";
import { nowInShopTimezone, formatCurrency } from "@/util/dateUtil";

function StatBlock({ label, value, isCurrency = true, borderRight = true, borderBottom = false }) {
  return (
    <div
      className="flex min-w-0 flex-col items-center justify-center px-2 py-3.5"
      style={{
        borderRight: borderRight ? "1px solid var(--border)" : "none",
        borderBottom: borderBottom ? "1px solid var(--border)" : "none",
      }}
    >
      <span
        className="leading-[1.1] whitespace-nowrap text-[#2A9D8F]"
        style={{ fontSize: "clamp(1rem, 1.4vw, 1.75rem)", fontWeight: 300, letterSpacing: "-0.02em" }}
      >
        {isCurrency ? formatCurrency(value) : value ?? 0}
      </span>
      <span className="mt-1.25 max-w-full overflow-hidden text-center text-[10px] font-medium text-ellipsis whitespace-nowrap text-muted-foreground">
        {label}
      </span>
    </div>
  );
}

export default function ShopDashboardStats() {
  const { shopId } = useShop();
  const [date, setDate] = useState(nowInShopTimezone().format("YYYY-MM-DD"));
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchStats = useCallback(
    async (selectedDate) => {
      if (!shopId) return;
      setLoading(true);
      try {
        const res = await fetchShopDashboardStats(shopId, selectedDate);
        if (res?.data?.success) {
          setStats(res.data.data);
        }
      } catch (err) {
        console.error("Error fetching shop dashboard stats:", err);
      } finally {
        setLoading(false);
      }
    },
    [shopId]
  );

  useEffect(() => {
    fetchStats(date);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopId, date]);

  const shiftDate = (deltaDays) => {
    const d = new Date(date);
    d.setDate(d.getDate() + deltaDays);
    const iso = d.toISOString().slice(0, 10);
    return iso;
  };

  const goToPrev = () => setDate(shiftDate(-1));
  const goToNext = () => {
    const next = shiftDate(1);
    if (next <= nowInShopTimezone().format("YYYY-MM-DD")) setDate(next);
  };
  const isToday = date === nowInShopTimezone().format("YYYY-MM-DD");

  const dateLabel = new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const dateShort = new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl bg-component-bg shadow-md">
      <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-border px-4 py-3">
        <span className="text-base font-normal text-text">
          Dashboard &mdash; <span className="text-[#2A9D8F]">{dateLabel}</span>
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={goToPrev}
            className="flex items-center gap-1 rounded-full border border-primary/30 bg-component-bg px-3 py-1 text-sm font-medium text-[#2A9D8F] transition-all"
          >
            <ChevronLeft className="size-3" /> Previous
          </button>
          <span className="rounded-full bg-surface-alt px-3 py-1 text-sm font-semibold text-[#2A9D8F]">
            {dateShort}
          </span>
          <button
            onClick={goToNext}
            disabled={isToday}
            className="flex items-center gap-1 rounded-full border px-3 py-1 text-sm font-medium transition-all disabled:cursor-not-allowed"
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
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid flex-1 grid-cols-4">
          <StatBlock label="Fulfilled Net Sales" value={stats?.fulfilledNetSales} borderRight borderBottom />
          <StatBlock label="Fulfilled Gross Sales" value={stats?.fulfilledGrossSales} borderRight borderBottom />
          <StatBlock label="All Net Sales" value={stats?.allNetSales} borderRight borderBottom />
          <StatBlock label="All Gross Sales" value={stats?.allGrossSales} borderRight={false} borderBottom />

          <StatBlock label="Fulfilled Orders" value={stats?.fulfilledOrders} isCurrency={false} borderRight borderBottom={false} />
          <StatBlock label="Total Orders" value={stats?.totalOrders} isCurrency={false} borderRight borderBottom={false} />
          <StatBlock label="New Customers" value={stats?.newCustomers} isCurrency={false} borderRight borderBottom={false} />
          <StatBlock label="Total (Tax Included)" value={stats?.totalIncludingTax} borderRight={false} borderBottom={false} />
        </div>
      )}
    </div>
  );
}
