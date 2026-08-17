"use client";

import { forwardRef, type CSSProperties } from "react";
import Barcode from "react-barcode";
import { getCustomerName, getDeliveryAddress, getCustomerPhone, getOrderLineItems } from "./constants";

interface OrderPrintContentProps {
  type: string;
  item: any;
  variant?: "RECEIPT" | "PULL_SHEET";
  style?: CSSProperties;
}

function money(v: number | undefined) {
  return `$${(v ?? 0).toFixed(2)}`;
}

function fmt(v: string | undefined) {
  if (!v) return "-";
  return new Date(v).toLocaleString([], { month: "2-digit", day: "2-digit", year: "2-digit", hour: "numeric", minute: "2-digit" });
}

function txnSum(transactions: any[], filter: (t: any) => boolean) {
  return (transactions || []).filter(filter).reduce((s, t) => s + (t.amount || 0), 0);
}

/**
 * Fixed print layout for an order-ahead order — two variants sharing the
 * same product-list core: RECEIPT (customer-facing, ported field-for-field
 * from the old app's tailorReceiptData: store name/address/phone/email,
 * Store #/Budtender/Customer/Customer Type, per-item discount + METRC info,
 * per-tax breakdown, CASH/CARD/Tips/Change, barcode) and PULL_SHEET
 * ("Pre-Order Fulfillment Pull Sheet" — staff-facing, leads with customer
 * contact + delivery address so whoever packs the order knows where it's
 * going, ported from tailorPreOrderReceiptData).
 */
const OrderPrintContent = forwardRef<HTMLDivElement, OrderPrintContentProps>(function OrderPrintContent(
  { type, item, variant = "RECEIPT", style },
  ref
) {
  const shopDetails = (typeof window !== "undefined" && JSON.parse(localStorage.getItem("shopDetails") || "null")) || null;

  if (!item) return null;

  const isPreSale = type === "presale";
  const isPullSheet = variant === "PULL_SHEET";
  const customerFullName = (isPreSale ? getCustomerName(item) : `${item?.customer?.firstName || ""} ${item?.customer?.lastName || ""}`.trim()) || "Guest";
  // Receipt customer line matches the old app's tailorReceiptData exactly — first name only.
  const customerFirstName = isPreSale ? customerFullName.split(" ")[0] : item?.customer?.firstName || "Guest";
  const customerPhone = getCustomerPhone(type, item);
  const deliveryMethod = isPreSale ? item?.info?.saleData?.deliveryMethod : item?.deliveryMethod;
  const address = getDeliveryAddress(type, item);
  const lineItems = getOrderLineItems(type, item);
  const subtotal = isPreSale ? item?.info?.saleData?.finalSubTotal : item?.finalSubTotal;
  const total = isPreSale ? item?.info?.saleData?.finalPayable : item?.finalPayable;
  const tax = lineItems.reduce((s, li) => s + (li.tax || 0), 0);
  const orderTime = isPreSale ? item?.createdAt : item?.placedAtISO || item?.createdAt;

  const storeName = shopDetails?.shopName || shopDetails?.label || "-";
  const loc = shopDetails?.locationDetails;
  const storeAddress = [loc?.streetAddress, loc?.city, loc?.state, loc?.zipCode, loc?.country].filter(Boolean).join(", ");
  const storePhone = shopDetails?.phoneNumber || shopDetails?.phone || "";
  const storeEmail = shopDetails?.email || "";
  const budtender = item?.creatorInfo?.name || "";
  const customerType = item?.customerType?.name || "";

  const transactions = item?.transactions || [];
  const cashPayment = txnSum(transactions, (t) => t.method === "CASH" && t.event === "CASH_DEPOSITED");
  const cashChange = txnSum(transactions, (t) => t.method === "CASH" && t.event === "CASH_RETURNED");
  const virtualDeposited = txnSum(transactions, (t) => t.method === "VIRTUAL" && t.event === "VIRTUAL_DEPOSITED");
  const processingDiscount = txnSum(transactions, (t) => t.event === "PAYMENT_PROCESSING_DISCOUNT");
  const cardPayment = virtualDeposited - processingDiscount;
  const tipGiven = Number(item?.tipGiven || 0);

  // Dedupe tax lines by name across every line item, same as the old app's tailorReceiptData.
  const taxBreakdown = lineItems
    .flatMap((li) => li.taxesApplied || [])
    .filter((t: any, i: number, self: any[]) => self.findIndex((s) => s.name === t.name) === i);

  return (
    <div
      ref={ref}
      id="order-ahead-print-area"
      style={{ fontFamily: "Arial, Helvetica, sans-serif", ...style }}
      className="w-72 rounded-md p-3 text-[11px] leading-tight ring-1 ring-foreground/10"
    >
      {isPullSheet ? (
        <div className="text-center">
          <div className="text-sm font-bold">{storeName}</div>
          <div className="text-sm font-bold">Pre-Order Fulfillment Pull Sheet</div>
        </div>
      ) : (
        <div className="space-y-0.5 text-center font-bold">
          <div className="text-base">{storeName}</div>
          {storeAddress && <div>{storeAddress}</div>}
          {storePhone && <div>{storePhone}</div>}
          {storeEmail && <div>{storeEmail}</div>}
        </div>
      )}
      <div className="my-1.5 h-px bg-border" />

      {isPullSheet ? (
        <div className="space-y-0.5">
          <div className="flex justify-between gap-2">
            <span>Order #:</span>
            <span className="truncate font-bold">{item.advertisedId}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span>Order Time:</span>
            <span className="truncate">{fmt(orderTime)}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span>Customer:</span>
            <span className="truncate">{customerFullName}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span>Phone:</span>
            <span className="truncate">{customerPhone || "-"}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span>Method:</span>
            <span className="truncate">{deliveryMethod?.replace(/_/g, " ") || "-"}</span>
          </div>
        </div>
      ) : (
        <div className="space-y-0.5 font-bold">
          <div>Store # {storeName}</div>
          {budtender && <div>Budtender - {budtender}</div>}
          <div>Customer - {customerFirstName}</div>
          {customerType && <div>Customer Type - {customerType}</div>}
        </div>
      )}

      {deliveryMethod === "DELIVERY" && (
        <>
          <div className="my-1.5 h-px bg-border" />
          <div className="space-y-0.5">
            <div className="font-bold">Delivery Address</div>
            {address ? (
              <>
                {address.lines.map((line, i) => (
                  <div key={i}>{line}</div>
                ))}
                {address.cityLine && <div>{address.cityLine}</div>}
              </>
            ) : (
              <div className="text-muted-foreground">No address on file</div>
            )}
          </div>
        </>
      )}

      <div className="my-1.5 h-px bg-border" />

      <div>
        {isPullSheet && (
          <div className="mb-1 grid grid-cols-[1fr_auto_auto] gap-2 border-b border-dashed border-border pb-1 font-bold">
            <span>Item</span>
            <span>Qty</span>
            <span>Price</span>
          </div>
        )}
        {lineItems.length === 0 ? (
          <div className="text-muted-foreground">No items found</div>
        ) : isPullSheet ? (
          lineItems.map((li, i) => (
            <div key={i} className="grid grid-cols-[1fr_auto_auto] gap-2 py-0.5">
              <span className="truncate font-semibold">{li.name}</span>
              <span>{li.qty}</span>
              <span>{money(li.total)}</span>
            </div>
          ))
        ) : (
          lineItems.map((li, i) => (
            <div key={i} className="grid grid-cols-[1fr_auto_auto] gap-2 py-0.5">
              <div className="min-w-0">
                <span className="font-bold">{li.name}</span>
                {li.discountNotes && <span> {li.discountNotes}</span>}
                {li.metrcTag && (
                  <div className="text-[9px] text-muted-foreground">
                    {li.metrcTag}
                    {li.metrcBatchId ? `,  ${li.metrcBatchId}` : ""}
                  </div>
                )}
              </div>
              <span>{li.qty}</span>
              <span>{money(li.total)}</span>
            </div>
          ))
        )}
      </div>

      {!isPullSheet && (
        <>
          <div className="my-1.5 border-t border-dashed border-border" />
          <div className="space-y-0.5 text-right">
            <div className="font-bold">SUBTOTAL: {money(subtotal)}</div>
            <div className="font-bold">TAX: {money(tax)}</div>
            {taxBreakdown.map((t: any, i: number) => (
              <div key={t.name || i}>
                {t.name} - VERIFY - {(t.taxRate ?? t.rate ?? 0).toFixed(2)}% {money(t.amount)}
              </div>
            ))}
            <div className="h-2" />
            <div className="font-bold">TOTAL: {money(total)}</div>
            {cashPayment > 0 && <div className="font-bold">CASH: {money(cashPayment)}</div>}
            {cardPayment > 0 && <div className="font-bold">CARD: {money(cardPayment)}</div>}
            <div className="font-bold">Tips Collected (CASH): {money(tipGiven)}</div>
            {cashChange > 0 && <div className="font-bold">CHANGE: {money(cashChange)}</div>}
          </div>

          {item?.receiptNote && <div className="mt-2">Receipt Note: {item.receiptNote}</div>}

          <div className="mt-2 text-center font-bold">THANK YOU!</div>

          <div className="mt-2 flex flex-col items-center">
            <Barcode value={String(item.advertisedId)} renderer="svg" width={1.5} height={40} fontSize={12} />
          </div>
        </>
      )}
    </div>
  );
});

export default OrderPrintContent;
