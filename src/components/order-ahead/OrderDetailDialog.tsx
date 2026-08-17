"use client";

import { useState } from "react";
import { Printer, X } from "lucide-react";
import Drawer from "@/components/ui/Drawer";
import { Button } from "@/components/ui/button";
import PrintOrderModal from "./PrintOrderModal";
import { getCustomerName, getOrderLineItems } from "./constants";

function money(v: number | undefined) {
  return `$${(v ?? 0).toFixed(2)}`;
}

export default function OrderDetailDialog({ open, onClose, type, item }) {
  const [printOpen, setPrintOpen] = useState(false);

  if (!item) return null;

  const isPreSale = type === "presale";
  const customerName = isPreSale
    ? getCustomerName(item)
    : `${item?.customer?.firstName || ""} ${item?.customer?.lastName || ""}`.trim();
  const source = isPreSale ? item?.info?.source : item?.source;
  const deliveryMethod = isPreSale ? item?.info?.saleData?.deliveryMethod : item?.deliveryMethod;
  const total = isPreSale ? item?.info?.saleData?.finalPayable : item?.finalPayable;
  const lineItems = getOrderLineItems(type, item);

  return (
    <Drawer open={open} onClose={onClose} side="right" size={1000}>
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <div className="text-lg font-semibold">Order Details - {item.advertisedId}</div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              {customerName || "Guest"} · {source} · {deliveryMethod?.replace(/_/g, " ")}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setPrintOpen(true)}>
              <Printer className="size-3.5" /> Print Invoice
            </Button>
            <button
              type="button"
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Close">
              <X className="size-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {lineItems.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">No items found</div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {lineItems.map((li, i) => (
                <div key={i} className="overflow-hidden rounded-lg border border-border bg-background shadow-sm">
                  <div className="flex items-center justify-between gap-4 border-b border-border p-2 px-3">
                    <div className="min-w-0">
                      <div className="truncate text-base font-semibold">{li.name}</div>
                      <div className="text-xs text-muted-foreground">{li.brand || "-"}</div>
                    </div>
                    <span className="shrink-0 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-semibold whitespace-nowrap text-amber-800 shadow-sm">
                      QTY {li.qty}
                    </span>
                  </div>

                  <div className="flex">
                    <div className="flex items-center gap-3 p-3">
                      <div className="relative flex size-37.5 shrink-0 items-center justify-center rounded-md border border-border bg-muted text-xs font-medium text-muted-foreground">
                        No Image
                        {li.thumbnail ? (
                          <img
                            src={li.thumbnail}
                            alt={li.name}
                            className="absolute inset-0 size-full rounded-md object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        ) : null}
                      </div>
                    </div>

                    <div className="flex-1">
                      <div className="space-y-2 p-4 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-muted-foreground">Unit Price</span>
                          <span className="font-semibold">{money(li.unitPrice)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-muted-foreground">Subtotal</span>
                          <span className="font-semibold">{money(li.subtotal)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-muted-foreground">Discounts</span>
                          <span className="font-semibold text-emerald-600">-{money(li.discount)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-muted-foreground">Tax</span>
                          <span className="font-semibold">{money(li.tax)}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between rounded-b-lg border-t border-border bg-muted/50 px-4 py-3">
                        <span className="text-base font-semibold">Item Total</span>
                        <span className="text-base font-semibold">{money(li.total)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-border px-6 py-4 text-sm font-semibold">
          <span>Total</span>
          <span>{total != null ? money(Number(total)) : "—"}</span>
        </div>
      </div>

      <PrintOrderModal open={printOpen} onClose={() => setPrintOpen(false)} type={type} item={item} />
    </Drawer>
  );
}
