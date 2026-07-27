"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { getCustomerName, getPreSaleLifecycle } from "./constants";

function getDisplayLineItems(type, item) {
  if (type !== "presale") {
    return (item?.nonPackagedLineItems || []).map((li) => ({
      name: li?.snapShotData?.productName,
      qty: li?.purchaseQuantity,
      price: li?.finalTotalPrice ?? li?.initialTotalPrice,
    }));
  }

  const saleData = item?.info?.saleData;
  const lifecycle = getPreSaleLifecycle(item);
  const nonPackaged =
    lifecycle === "NEW" ? saleData?.nonPackagedLineItems : saleData?.confirmedNonPackagedLineItems || saleData?.nonPackagedLineItems;

  return (nonPackaged || []).map((li) => ({
    name: li?.snapShotData?.productName,
    qty: li?.purchaseQuantity,
    price: li?.finalTotalPrice ?? li?.initialTotalPrice,
  }));
}

export default function OrderDetailDialog({ open, onClose, type, item }) {
  if (!item) return null;

  const isPreSale = type === "presale";
  const customerName = isPreSale
    ? getCustomerName(item)
    : `${item?.customer?.firstName || ""} ${item?.customer?.lastName || ""}`.trim();
  const source = isPreSale ? item?.info?.source : item?.source;
  const deliveryMethod = isPreSale ? item?.info?.saleData?.deliveryMethod : item?.deliveryMethod;
  const total = isPreSale ? item?.info?.saleData?.finalPayable : item?.finalPayable;
  const lineItems = getDisplayLineItems(type, item);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Order #{item.advertisedId}</DialogTitle>
          <DialogDescription>
            {customerName || "Guest"} · {source} · {deliveryMethod?.replace(/_/g, " ")}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[50vh] space-y-2 overflow-y-auto">
          {lineItems.length === 0 && (
            <div className="py-6 text-center text-sm text-muted-foreground">No line items available</div>
          )}
          {lineItems.map((li, i) => (
            <div key={i} className="flex items-center justify-between border-b py-2 text-sm last:border-0">
              <div>
                <div className="font-medium">{li.name || "Unknown product"}</div>
                <div className="text-xs text-muted-foreground">Qty {li.qty}</div>
              </div>
              <div className="font-medium">{li.price != null ? `$${Number(li.price).toFixed(2)}` : "—"}</div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between border-t pt-3 text-sm font-semibold">
          <span>Total</span>
          <span>{total != null ? `$${Number(total).toFixed(2)}` : "—"}</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
