"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Users, Search } from "lucide-react";
import { useShop } from "@/context/shop-context";
import { fetchCustomerQueueList, clearCustomerQueue } from "@/services/customerQueue/list";
import { addCustomerToQueue } from "@/services/customerQueue/add";
import { searchCustomers } from "@/services/customers/search";
import { connectToSocket } from "@/lib/socket";
import CustomerDetailDrawer from "./CustomerDetailDrawer";
import FrontDeskQueueCard from "./FrontDeskQueueCard";

// Reskin of dashboard/CustomerQueue for the Front Desk screen, plus the
// client-side "Search queue…" filter the old app had (the widget version
// doesn't need it — the queue there is short and inline).
export default function FrontDeskQueue({ onCustomerServed }) {
  const { shopId } = useShop();
  const [queueData, setQueueData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);
  const [filterText, setFilterText] = useState("");
  const [quickQuery, setQuickQuery] = useState("");
  const [quickResults, setQuickResults] = useState([]);
  const [quickFocused, setQuickFocused] = useState(false);
  const [detailsRecord, setDetailsRecord] = useState(null);
  const socketRef = useRef(null);
  const debounceRef = useRef(null);

  const fetchQueue = async () => {
    if (!shopId) return;
    setLoading(true);
    try {
      const res = await fetchCustomerQueueList(shopId);
      setQueueData(res?.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopId]);

  useEffect(() => {
    if (!shopId) return;
    socketRef.current = connectToSocket({ url: `${process.env.NEXT_PUBLIC_BASE_URL}/customer-queue`, shopId });
    if (!socketRef.current) return;
    socketRef.current.on("updateQueue", fetchQueue);
    socketRef.current.on("customerUpdated", fetchQueue);
    socketRef.current.on("customersCleared", async () => {
      await fetchQueue();
      toast.success("Customer queue cleared successfully!");
    });
    return () => socketRef.current?.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopId]);

  useEffect(() => {
    if (!quickFocused) return;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const res = await searchCustomers({ shopId, search: quickQuery, limit: 10 });
      setQuickResults(res?.data || []);
    }, 350);
    return () => clearTimeout(debounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quickQuery, quickFocused, shopId]);

  async function handleQuickCheckIn(customer) {
    if (queueData.some((q) => q.customerId === customer.id)) {
      toast.info("Customer is already in the queue");
      return;
    }
    try {
      await addCustomerToQueue({ shopId, customerId: customer.id, isAnonymous: false });
      toast.success(`${customer.firstName} checked in!`);
      setQuickQuery("");
      setQuickResults([]);
      setQuickFocused(false);
      fetchQueue();
    } catch (err) {
      toast.error(err?.message || "Failed to check in");
    }
  }

  async function handleClear() {
    if (!confirm("Do you want to clear the queue?")) return;
    setClearing(true);
    try {
      await clearCustomerQueue(shopId);
      await fetchQueue();
    } catch {
      toast.error("Failed to clear customer queue.");
    } finally {
      setClearing(false);
    }
  }

  const filtered = queueData.filter((c) =>
    `${c.firstName || ""} ${c.lastName || ""}`.toLowerCase().includes(filterText.trim().toLowerCase())
  );

  return (
    <div className="rounded-2xl bg-card p-5 ring-1 ring-foreground/10">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="size-4.5 text-primary" />
          <h2 className="text-base font-semibold text-foreground">Customer Queue</h2>
          <span className="flex size-5 items-center justify-center rounded-full bg-red-500 text-[11px] font-bold text-white">
            {queueData.length}
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchQueue}
            className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground ring-1 ring-foreground/15 hover:bg-muted"
          >
            Refresh
          </button>
          <button
            onClick={handleClear}
            disabled={clearing}
            className="rounded-lg px-3 py-1.5 text-sm text-red-500 ring-1 ring-red-500/40 hover:bg-red-500/10 dark:text-red-300"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="relative mb-2.5">
        <input
          value={quickQuery}
          onChange={(e) => setQuickQuery(e.target.value)}
          onFocus={() => setQuickFocused(true)}
          onBlur={() => setTimeout(() => setQuickFocused(false), 150)}
          placeholder="Quick check-in — search by name…"
          className="w-full rounded-lg bg-muted px-3 py-2 text-sm text-foreground outline-none ring-1 ring-foreground/10 placeholder:text-muted-foreground focus:ring-primary/50"
        />
        {quickFocused && quickResults.length > 0 && (
          <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-lg bg-card shadow-lg ring-1 ring-foreground/10">
            {quickResults.map((c) => (
              <button
                key={c.id}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleQuickCheckIn(c)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-muted-foreground hover:bg-muted"
              >
                {c.firstName} {c.lastName}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="relative mb-4">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          placeholder="Search queue…"
          className="w-full rounded-lg bg-muted py-2 pr-3 pl-8 text-sm text-foreground outline-none ring-1 ring-foreground/10 placeholder:text-muted-foreground focus:ring-primary/50"
        />
      </div>

      <div className="flex flex-wrap gap-3">
        {loading ? (
          <div className="w-full py-8 text-center text-muted-foreground">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="w-full py-8 text-center text-muted-foreground">No Data Found</div>
        ) : (
          filtered.map((ticket, i) => (
            <FrontDeskQueueCard
              key={ticket.id || i}
              data={ticket}
              onRemove={fetchQueue}
              onServe={(record) => {
                fetchQueue();
                onCustomerServed?.(record);
              }}
              onOpenDetails={setDetailsRecord}
            />
          ))
        )}
      </div>

      <CustomerDetailDrawer open={!!detailsRecord} onClose={() => setDetailsRecord(null)} customerId={detailsRecord?.customerId} />
    </div>
  );
}
