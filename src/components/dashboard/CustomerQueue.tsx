"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useShop } from "@/context/shop-context";
import { fetchCustomerQueueList, clearCustomerQueue } from "@/services/customerQueue/list";
import { connectToSocket } from "@/lib/socket";
import { Button } from "@/components/ui/button";
import QueueCard from "./QueueCard";
import QuickCheckIn from "./QuickCheckIn";
import QrCheckIn from "@/components/settings/QrCheckIn";
import AddCustomerToQueue from "@/components/customers/AddCustomerToQueue";
import CustomerDetailDrawer from "@/components/front-desk/CustomerDetailDrawer";

// `onCustomerServed`: optional hook fired (in addition to the default
// refetch) when a queue card is moved to serving — the Front Desk page uses
// this to hand the customer off into POS; the Dashboard widget leaves it unset.
export default function CustomerQueue({ sidepanel = false, onCustomerServed = null }) {
  const { shopId } = useShop();
  const [queueData, setQueueData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [addCustomerOpen, setAddCustomerOpen] = useState(false);
  const [detailsRecord, setDetailsRecord] = useState(null);
  const socketRef = useRef(null);

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

  useEffect(() => {
    if (!shopId) return;

    socketRef.current = connectToSocket({
      url: `${process.env.NEXT_PUBLIC_BASE_URL}/customer-queue`,
      shopId,
    });
    if (!socketRef.current) return;

    const handleUpdateQueue = () => fetchQueue();
    socketRef.current.on("updateQueue", handleUpdateQueue);
    socketRef.current.on("customerUpdated", handleUpdateQueue);
    socketRef.current.on("customersCleared", async () => {
      await fetchQueue();
      toast.success("Customer queue cleared successfully!");
    });

    return () => socketRef.current?.disconnect();
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
      toast.error("Failed to clear customer queue.");
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className={sidepanel ? "flex h-full flex-col" : "rounded-xl border border-border bg-component-bg p-4"}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="m-0 text-lg font-semibold text-text capitalize">Customer queue</h2>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => setQrOpen(true)}>
            Scan QR
          </Button>
          <Button size="sm" onClick={() => setAddCustomerOpen(true)}>
            Add Customer
          </Button>
          <Button size="sm" onClick={handleClearQueue} disabled={clearing}>
            Clear Queue
          </Button>
        </div>
      </div>

      <div className="mt-3 border-b border-border pb-3">
        <QuickCheckIn shopId={shopId} queueData={queueData} onCheckedIn={fetchQueue} />
      </div>

      <div
        className={`mt-3 flex flex-wrap gap-2 overflow-y-auto ${sidepanel ? "min-h-0" : "min-h-20 max-h-82.5"}`}
        style={sidepanel ? { scrollbarWidth: "none" } : undefined}
      >
        {loading ? (
          <div className="flex w-full items-center justify-center py-6 text-muted-foreground">Loading…</div>
        ) : queueData.length === 0 ? (
          <div className="flex w-full items-center justify-center py-6 text-muted-foreground">No Data Found</div>
        ) : (
          queueData.map((ticket, index) => (
            <QueueCard
              key={ticket.id || index}
              data={ticket}
              onRemove={fetchQueue}
              onServe={(record) => {
                fetchQueue();
                onCustomerServed?.(record);
              }}
              onOpenDetails={setDetailsRecord}
              sidepanel={sidepanel}
            />
          ))
        )}
      </div>

      <QrCheckIn open={qrOpen} onOpenChange={setQrOpen} shopId={shopId} onSuccess={fetchQueue} />
      <AddCustomerToQueue
        open={addCustomerOpen}
        onOpenChange={setAddCustomerOpen}
        shopId={shopId}
        queueData={queueData}
        onCheckedIn={fetchQueue}
      />
      <CustomerDetailDrawer
        open={!!detailsRecord}
        onClose={() => setDetailsRecord(null)}
        customerId={detailsRecord?.customerId}
      />
    </div>
  );
}
