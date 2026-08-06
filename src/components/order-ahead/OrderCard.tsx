"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ChevronDown, GripVertical, Truck, MapPin, Store } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getOrderStatuses } from "@/services/sales/getOrderStatuses";
import { updateOrderStatus } from "@/services/sales/updateOrderStatus";
import { useShop } from "@/context/shop-context";
import {
  getCustomerName,
  getPreSaleLifecycle,
  getPreSalePaymentStatus,
  LIFECYCLE_BADGE,
  LIFECYCLE_ACTION_CLASS,
  abbreviateDuration,
} from "./constants";
import OrderDetailDialog from "./OrderDetailDialog";
import DeliveryJobDrawer from "./DeliveryJobDrawer";
import DeliveryOptionsDrawer from "./DeliveryOptionsDrawer";

const DELIVERY_ICON = {
  DELIVERY: Truck,
  PICK_UP: MapPin,
  IN_STORE: Store,
  SHIPMENT: Truck,
};

// Drives the Cancel/Next(-or-Complete) buttons for a Sale card by looking up
// the source+deliveryMethod status pipeline and finding what comes next.
// `enabled: false` for pre-sale cards short-circuits the fetch (still called
// unconditionally to satisfy the rules of hooks).
function useSaleStatusFlow(sale, enabled) {
  const { shopId } = useShop();
  const [statuses, setStatuses] = useState(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    getOrderStatuses(sale.source, sale.deliveryMethod).then((res) => {
      setStatuses(res?.data?.data?.statuses || []);
    });
  }, [enabled, sale.source, sale.deliveryMethod]);

  const forward = (statuses || []).filter((s) => !s.isTerminationState);
  const currentIndex = forward.findIndex(
    (s) => s.statusId === sale?.status?.statusId,
  );
  const nextStatus = currentIndex >= 0 ? forward[currentIndex + 1] : null;
  const cancelStatus = (statuses || []).find((s) => s.statusId === "CANCELLED");

  const moveTo = async (statusId, onDone) => {
    setUpdating(true);
    try {
      await updateOrderStatus({ shopId, id: sale.id, statusId });
      toast.success("Order status updated");
      onDone?.();
    } catch (err) {
      toast.error(err?.message || "Failed to update status");
    } finally {
      setUpdating(false);
    }
  };

  return { nextStatus, cancelStatus, updating, moveTo };
}

// Renders either a pre-sale (NEW/CONFIRMED columns) or a Sale (Processing and
// later columns) card. `type` distinguishes the two shapes.
export default function OrderCard({
  type,
  item,
  onConfirm,
  onCancel,
  onAssignPackages,
  onRefresh,
  sortId,
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [deliveryJobDrawerOpen, setDeliveryJobDrawerOpen] = useState(false);
  const [deliveryOptionsDrawerOpen, setDeliveryOptionsDrawerOpen] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: sortId });

  const style = { transform: CSS.Transform.toString(transform), transition };

  const isPreSale = type === "presale";
  const advertisedId = item.advertisedId;
  const customerName =
    (isPreSale
      ? getCustomerName(item)
      : `${item?.customer?.firstName || ""} ${item?.customer?.lastName || ""}`.trim()) ||
    "Guest";
  const source = isPreSale ? item?.info?.source : item?.source;
  const deliveryMethod = isPreSale
    ? item?.info?.saleData?.deliveryMethod
    : item?.deliveryMethod;
  const paymentStatus = isPreSale
    ? getPreSalePaymentStatus(item)
    : item?.paymentStatus;
  const subtotal = isPreSale
    ? item?.info?.saleData?.finalSubTotal
    : item?.finalSubTotal;
  const lifecycle = isPreSale
    ? getPreSaleLifecycle(item)
    : item?.status?.statusId;
  const createdAgo = item?.createdAt ? abbreviateDuration(item.createdAt) : "";
  const DeliveryIcon = DELIVERY_ICON[deliveryMethod] || MapPin;
  const badge = LIFECYCLE_BADGE[lifecycle];
  const actionClass = LIFECYCLE_ACTION_CLASS[lifecycle] || "";

  // A delivery job (created from Delivery Management) drives its own status —
  // once one's been issued for this order, Awaiting Driver/Out for Delivery
  // can no longer be advanced from here; Next opens the job instead.
  const deliveryFulfillmentStrategy = isPreSale
    ? item?.info?.saleData?.deliveryFulfillmentStrategy
    : item?.deliveryFulfillmentStrategy;
  const isDeliveryJobOrder =
    deliveryFulfillmentStrategy === "DELIVERY_JOB" &&
    (lifecycle === "AWAITING_DRIVER" || lifecycle === "OUT_FOR_DELIVERY");

  // Packaged & Ready -> Awaiting Driver is the one transition where the user
  // gets a choice: advance the status normally, or hand the delivery off to
  // a newly-created delivery job instead (which then drives status itself).
  const showDeliveryOptionsOnNext =
    !isPreSale &&
    lifecycle === "PACKAGED_AND_READY" &&
    deliveryMethod === "DELIVERY" &&
    (!deliveryFulfillmentStrategy || deliveryFulfillmentStrategy === "STANDARD");

  const saleFlow = useSaleStatusFlow(item, !isPreSale);
  const nextLabel =
    saleFlow.nextStatus?.statusId === "COMPLETED" ? "Complete" : "Next";
  const nextClass =
    saleFlow.nextStatus?.statusId === "COMPLETED"
      ? LIFECYCLE_ACTION_CLASS.PACKAGED_AND_READY
      : LIFECYCLE_ACTION_CLASS.PROCESSING;

  return (
    <>
      <Card ref={setNodeRef} style={style} className="w-full gap-3 p-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            {...attributes}
            {...listeners}
            className="cursor-grab text-muted-foreground active:cursor-grabbing"
            aria-label="Drag to reorder">
            <GripVertical className="size-4" />
          </button>
          {badge && <Badge className={badge.className}>{badge.label}</Badge>}
          <Badge
            className={
              paymentStatus === "PAID_IN_FULL"
                ? "bg-emerald-600 text-white"
                : "bg-amber-400 text-black"
            }>
            {paymentStatus === "PAID_IN_FULL" ? "Paid" : "Unpaid"}
          </Badge>
          <Badge variant="outline" className="ml-auto">
            {source}
          </Badge>
        </div>

        <div className="text-sm font-semibold">#{advertisedId}</div>
        <div className="text-xs text-muted-foreground">
          {createdAgo && `${createdAgo} · `}by {customerName}
        </div>

        {deliveryMethod && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <DeliveryIcon className="size-3.5" />
            {deliveryMethod.replace(/_/g, " ")}
          </div>
        )}

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="font-medium">
            {subtotal != null ? `$${Number(subtotal).toFixed(2)}` : "—"}
          </span>
        </div>

        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="flex-1"
            onClick={() => setDetailsOpen(true)}>
            Details <ChevronDown className="size-3.5" />
          </Button>

          {isPreSale && lifecycle === "NEW" && (
            <>
              <Button
                size="sm"
                variant="outline"
                className="flex-1 border-destructive text-destructive hover:bg-destructive/10"
                onClick={() => onCancel(item)}>
                Cancel
              </Button>
              <Button
                size="sm"
                className={`flex-1 ${actionClass}`}
                onClick={() => onConfirm(item)}>
                Confirm
              </Button>
            </>
          )}

          {isPreSale && lifecycle === "CONFIRMED" && (
            <>
              <Button
                size="sm"
                variant="outline"
                className="flex-1 border-destructive text-destructive hover:bg-destructive/10"
                onClick={() => onCancel(item)}>
                Cancel
              </Button>
              <Button
                size="sm"
                className={`flex-1 ${actionClass}`}
                onClick={() => onAssignPackages(item)}>
                Assign Pkgs
              </Button>
            </>
          )}

          {!isPreSale && (
            <>
              <Button
                size="sm"
                variant="outline"
                className="flex-1 border-destructive text-destructive hover:bg-destructive/10"
                disabled={
                  isDeliveryJobOrder ||
                  !saleFlow?.cancelStatus ||
                  saleFlow?.updating
                }
                onClick={() =>
                  saleFlow.moveTo(saleFlow.cancelStatus.statusId, onRefresh)
                }>
                Cancel
              </Button>
              <Button
                size="sm"
                className={`flex-1 ${nextClass}`}
                disabled={
                  isDeliveryJobOrder
                    ? false
                    : !saleFlow?.nextStatus || saleFlow?.updating
                }
                onClick={() => {
                  if (isDeliveryJobOrder) setDeliveryJobDrawerOpen(true);
                  else if (showDeliveryOptionsOnNext)
                    setDeliveryOptionsDrawerOpen(true);
                  else saleFlow.moveTo(saleFlow.nextStatus.statusId, onRefresh);
                }}>
                {isDeliveryJobOrder ? "Next" : nextLabel}
              </Button>
            </>
          )}
        </div>

        {isDeliveryJobOrder && (
          <p className="text-xs text-amber-600">
            A delivery job was issued for this order. Change the status from
            delivery job page to change the status of the order.
          </p>
        )}
      </Card>

      <OrderDetailDialog
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        type={type}
        item={item}
      />

      {isDeliveryJobOrder && (
        <DeliveryJobDrawer
          open={deliveryJobDrawerOpen}
          onClose={() => setDeliveryJobDrawerOpen(false)}
          advertisedSaleId={advertisedId}
        />
      )}

      {showDeliveryOptionsOnNext && (
        <DeliveryOptionsDrawer
          open={deliveryOptionsDrawerOpen}
          onClose={() => setDeliveryOptionsDrawerOpen(false)}
          saleId={item.id}
          onStandard={() =>
            saleFlow.moveTo(saleFlow.nextStatus?.statusId, onRefresh)
          }
          onJobCreated={() => onRefresh?.()}
        />
      )}
    </>
  );
}
