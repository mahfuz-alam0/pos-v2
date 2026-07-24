"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import Drawer from "@/components/ui/Drawer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useShop } from "@/context/shop-context";
import { listLeaflyOrders } from "@/services/orderAhead/listLeaflyOrders";
import { decideLeaflyPreSale } from "@/services/orderAhead/decideLeaflyPreSale";

const STATUS_VARIANT = {
  submitted: "secondary",
  accepted: "default",
  rejected: "destructive",
  cancelled: "destructive",
};

function OrderRow({ order, onDecide, deciding }) {
  const d = order?.orderData;
  return (
    <div className="flex items-center justify-between rounded-lg border p-3">
      <div>
        <div className="font-medium">
          {d?.firstName} {d?.lastName}
        </div>
        <div className="text-xs text-muted-foreground">
          Order {order?.leaflyOrderId || d?.id} · {d?.fulfillmentMechanism}
        </div>
        <div className="text-sm">${((d?.total || 0) / 100).toFixed(2)}</div>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant={STATUS_VARIANT[order?.status] || "secondary"}>{order?.status}</Badge>
        {order?.status === "submitted" && (
          <>
            <Button size="sm" disabled={deciding} onClick={() => onDecide(order, true)}>
              Accept
            </Button>
            <Button size="sm" variant="outline" disabled={deciding} onClick={() => onDecide(order, false)}>
              Reject
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

// Simplified from the old app's version — no per-order detail sub-drawer with
// ID photo preview; add if fulfillment staff actually need it day-to-day.
export default function LeaflyOrdersDrawer({ open, onClose }) {
  const { shopId } = useShop();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [decidingId, setDecidingId] = useState(null);

  const fetchOrders = useCallback(() => {
    if (!shopId) return;
    setLoading(true);
    listLeaflyOrders(shopId)
      .then((res) => setOrders(res?.data?.data?.orders || []))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, [shopId]);

  useEffect(() => {
    if (open) fetchOrders();
  }, [open, fetchOrders]);

  const handleDecide = async (order, isAccepted) => {
    const leaflyOrderId = order?.leaflyOrderId || order?.orderData?.id;
    setDecidingId(leaflyOrderId);
    try {
      await decideLeaflyPreSale({ shopId, leaflyOrderId, isAccepted });
      toast.success(isAccepted ? "Order accepted" : "Order rejected");
      fetchOrders();
    } catch (err) {
      toast.error(err?.message || "Failed to update order");
    } finally {
      setDecidingId(null);
    }
  };

  const pending = orders.filter((o) => o.status === "submitted");
  const ongoing = orders.filter((o) => o.status === "accepted");
  const cancelled = orders.filter((o) => o.status === "rejected" || o.status === "cancelled");

  return (
    <Drawer open={open} onClose={onClose} side="right" size={640} zIndex={60}>
      <div className="flex h-full flex-col">
        <div className="border-b px-6 py-4 text-base font-semibold">Leafly Orders</div>
        <div className="flex-1 overflow-y-auto p-4">
          <Tabs defaultValue="pending">
            <TabsList>
              <TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger>
              <TabsTrigger value="ongoing">Ongoing ({ongoing.length})</TabsTrigger>
              <TabsTrigger value="cancelled">Cancelled ({cancelled.length})</TabsTrigger>
            </TabsList>
            {[
              { key: "pending", items: pending },
              { key: "ongoing", items: ongoing },
              { key: "cancelled", items: cancelled },
            ].map(({ key, items }) => (
              <TabsContent key={key} value={key} className="mt-3 space-y-2">
                {loading && <div className="py-8 text-center text-muted-foreground">Loading...</div>}
                {!loading && items.length === 0 && (
                  <div className="py-8 text-center text-muted-foreground">No orders</div>
                )}
                {!loading &&
                  items.map((order) => (
                    <OrderRow
                      key={order.id}
                      order={order}
                      onDecide={handleDecide}
                      deciding={decidingId === (order?.leaflyOrderId || order?.orderData?.id)}
                    />
                  ))}
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </div>
    </Drawer>
  );
}
