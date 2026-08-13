"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useShop } from "@/context/shop-context";
import { fetchShopDashboardStats } from "@/services/stats/dashboard/shopDashboard";
import { nowInShopTimezone, formatCurrency } from "@/util/dateUtil";

function StatBlock({ label, value, isCurrency = true }) {
  const valueRef = useRef(null);

  // Long values (e.g. $100,000.20) would overflow the fixed-width cell, so shrink the
  // font to fit instead of truncating — the full number always stays visible on every
  // screen size. Only shrinks, and snaps back when the cell has room again.
  useEffect(() => {
    const el = valueRef.current;
    if (!el) return;
    const parent = el.parentElement;
    if (!parent) return;

    const fit = () => {
      el.style.fontSize = "";
      if (el.scrollWidth > el.clientWidth) {
        const current = parseFloat(getComputedStyle(el).fontSize);
        const next = Math.max(11, current * (el.clientWidth / el.scrollWidth));
        el.style.fontSize = `${next}px`;
      }
    };
    fit();

    const ro = new ResizeObserver(fit);
    ro.observe(parent);
    return () => ro.disconnect();
  }, [value, isCurrency]);

  return (
    <div className="flex min-w-0 flex-col items-center justify-center bg-component-bg px-2 py-4">
      <span
        ref={valueRef}
        className="max-w-full text-heading whitespace-nowrap"
        style={{ fontSize: "clamp(0.95rem, 1.3vw, 1.35rem)", fontWeight: 400, letterSpacing: "-0.02em" }}
      >
        {isCurrency ? formatCurrency(value) : value ?? 0}
      </span>
      <span
        className="mt-1.5 flex w-full max-w-full items-center justify-center text-center text-[11px] leading-snug font-medium text-muted-foreground"
        style={{ minHeight: "2.75em" }}
      >
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
    <div className="flex h-full flex-col overflow-hidden rounded-2xl bg-component-bg shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-border px-5 py-3.5">
        <span className="text-[15px] font-semibold text-heading">
          Dashboard &mdash; <span className="text-primary">{dateLabel}</span>
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={goToPrev}
            className="flex items-center gap-1 rounded-full border border-primary/30 bg-component-bg px-3 py-1 text-sm font-medium text-primary transition-all hover:bg-primary-soft"
          >
            <ChevronLeft className="size-3" /> Previous
          </button>
          <span className="rounded-full bg-surface-alt px-3 py-1 text-sm font-semibold text-primary">
            {dateShort}
          </span>
          <button
            onClick={goToNext}
            disabled={isToday}
            className="flex items-center gap-1 rounded-full border px-3 py-1 text-sm font-medium transition-all hover:bg-primary-soft disabled:cursor-not-allowed"
            style={{
              borderColor: isToday ? "var(--border)" : "rgba(196,181,244,0.6)",
              color: isToday ? "var(--muted-foreground)" : "var(--color-primary)",
            }}
          >
            Next <ChevronRight className="size-3" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-1 items-center justify-center py-12">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid flex-1 grid-cols-2 grid-rows-2 gap-px bg-border sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
          <StatBlock label="Fulfilled Net Sales" value={stats?.fulfilledNetSales} />
          <StatBlock label="Fulfilled Gross Sales" value={stats?.fulfilledGrossSales} />
          <StatBlock label="All Net Sales" value={stats?.allNetSales} />
          <StatBlock label="All Gross Sales" value={stats?.allGrossSales} />

          <StatBlock label="Fulfilled Orders" value={stats?.fulfilledOrders} isCurrency={false} />
          <StatBlock label="Total Orders" value={stats?.totalOrders} isCurrency={false} />
          <StatBlock label="New Customers" value={stats?.newCustomers} isCurrency={false} />
          <StatBlock label="Total (Tax Included)" value={stats?.totalIncludingTax} />
        </div>
      )}
    </div>
  );
}
