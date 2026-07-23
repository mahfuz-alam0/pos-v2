"use client";

import { useEffect, useState } from "react";
import { useShop } from "@/context/shop-context";
import { fetchCustomerQueueList, clearCustomerQueue } from "@/services/customerQueue/list";
import { Button } from "@/components/ui/button";
import QueueCard from "./QueueCard";

export default function CustomerQueue() {
  const { shopId } = useShop();
  const [queueData, setQueueData] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);

  const fetchQueue = async () => {
    if (!shopId) return;
    setLoading(true);
    try {
      const res = await fetchCustomerQueueList(shopId);
      setQueueData(res?.data || []);
    } catch (err) {
      console.error("Error fetching customer queue:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopId]);

  const handleClearQueue = async () => {
    if (!confirm("Do you want to clear the queue?")) return;
    setClearing(true);
    try {
      await clearCustomerQueue(shopId);
      await fetchQueue();
    } catch (err) {
      console.error("Failed to clear customer queue:", err);
    } finally {
      setClearing(false);
    }
  };

  const filtered = searchText.trim()
    ? queueData.filter((c) => c.firstName?.toLowerCase().includes(searchText.toLowerCase()) || c.email?.toLowerCase().includes(searchText.toLowerCase()))
    : queueData;

  return (
    <div className="rounded-xl border border-border bg-component-bg p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="m-0 text-[18px] font-semibold text-text">Customer queue</h2>
        <div className="flex gap-2">
          <Button size="sm">Scan QR</Button>
          <Button size="sm">Add Customer</Button>
          <Button size="sm" variant="destructive" onClick={handleClearQueue} disabled={clearing}>
            Clear Queue
          </Button>
        </div>
      </div>

      <div className="mt-3">
        <input
          type="text"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          placeholder="Quick check-in — search by name..."
          className="w-full rounded-lg border border-border bg-component-bg px-3 py-2 text-sm outline-none focus:border-primary"
        />
      </div>

      <div className="mt-4 flex min-h-[80px] max-h-[330px] flex-wrap gap-2 overflow-y-auto">
        {loading ? (
          <div className="flex w-full items-center justify-center py-6 text-muted-foreground">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="flex w-full items-center justify-center py-6 text-muted-foreground">No Data Found</div>
        ) : (
          filtered.map((ticket, index) => <QueueCard key={ticket.id || index} data={ticket} onRemove={fetchQueue} />)
        )}
      </div>
    </div>
  );
}
