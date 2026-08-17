"use client";

import Barcode from "react-barcode";

// Printable sale receipt. Field paths mirror legacy's tailorReceiptData/
// populateOrderData (hooks/usePrint.jsx:1830-2206) — order is the
// createOrderRes object (create-internal-sale response, with
// nonPackagedLineItems snapshotted from the quote at checkout).
export default function Receipt({ order, shopDetails, customerName, changeAmount = 0 }) {
  if (!order) return null;

  const lineItems = order?.nonPackagedLineItems || [];
  const subTotal = order?.subTotal ?? order?.finalSubTotal ?? 0;
  const total = order?.total ?? order?.finalPayable ?? 0;
  const orderId = order?.orderId ?? order?.advertisedId ?? order?.saleId ?? "N/A";

  const transactions = order?.transactions || [];
  const cashPaid = transactions
    .filter((t) => t.method === "CASH" && t.event === "CASH_DEPOSITED")
    .reduce((sum, t) => sum + (t.amount || 0), 0);
  const cardPaid = transactions
    .filter((t) => t.method === "VIRTUAL" && t.event === "VIRTUAL_DEPOSITED")
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  // One row per distinct tax rule, summed by name across all line items —
  // NOT deduped to the first match, or a tax applied on multiple lines only
  // shows one line's contribution while the TAX total (order?.tax) reflects
  // all of them, making the breakdown add up to far less than the header.
  const taxBreakdown: any[] = Object.values(
    lineItems
      .flatMap((item) => item?.createdLineItem?.snapShotData?.taxesApplied || [])
      .reduce((acc: Record<string, any>, t: any) => {
        const key = t.name;
        if (!acc[key]) acc[key] = { ...t, amount: 0 };
        acc[key].amount += t.amount ?? 0;
        return acc;
      }, {})
  );
  const tax =
    order?.tax ?? taxBreakdown.reduce((sum, t) => sum + (t.amount ?? 0), 0);

  const address = shopDetails?.locationDetails;
  const addressLine = [address?.streetAddress, address?.city, address?.state, address?.zipCode]
    .filter(Boolean)
    .join(", ");
  const storeName = shopDetails?.shopName || shopDetails?.label || "N/A";

  const row = (label, value, opts: { bold?: boolean } = {}) => (
    <div style={{ display: "flex", justifyContent: "space-between", fontWeight: opts.bold ? "bold" : "normal" }}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );

  return (
    <div style={{ fontFamily: "Arial, sans-serif", fontSize: 12, width: 320, color: "#000", background: "#fff" }}>
      <div style={{ textAlign: "center", marginBottom: 8 }}>
        <div style={{ fontWeight: "bold", fontSize: 18 }}>{storeName}</div>
        {addressLine && <div>{addressLine}</div>}
        {shopDetails?.phoneNumber && <div>{shopDetails.phoneNumber}</div>}
        {shopDetails?.email && <div>{shopDetails.email}</div>}
      </div>

      <div style={{ fontWeight: "bold" }}>
        <div>Store # {storeName}</div>
        <div>Order # {orderId}</div>
        <div>Budtender - {order?.creatorInfo?.name ?? "n/a"}</div>
        <div>Customer - {customerName || "n/a"}</div>
        <div>Customer Type - {order?.customerGroup?.name ?? "n/a"}</div>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 8 }}>
        <tbody>
          {lineItems.map((item, i) => {
            const discountNote = (item?.createdLineItem?.discountBreakDownHierarchy || [])
              .filter((d) => !d.isDisabled && d.notes)
              .map((d) => d.notes)
              .join(", ");
            return (
              <tr key={item?.createdLineItem?.packageId ?? i}>
                <td style={{ fontWeight: "bold" }}>
                  {item?.createdLineItem?.snapShotData?.productName ?? "Item"}
                  {discountNote && (
                    <div style={{ fontSize: 10, fontWeight: "normal", color: "#4b5563" }}>
                      {discountNote}
                    </div>
                  )}
                </td>
                <td style={{ textAlign: "center", fontWeight: "bold" }}>
                  {item?.createdLineItem?.purchaseQuantity ?? 1}
                </td>
                <td style={{ textAlign: "right", fontWeight: "bold" }}>
                  {(item?.createdLineItem?.finalTotalPrice ?? 0).toFixed(2)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div style={{ borderTop: "1px dashed #000", margin: "8px 0" }} />

      <div style={{ fontWeight: "bold" }}>
        {row("SUBTOTAL:", `$${subTotal.toFixed(2)}`)}
        {row("TAX:", `$${tax.toFixed(2)}`)}
      </div>
      {taxBreakdown.map((t, i) => (
        <div
          key={t.name ?? i}
          style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#1a4d8f" }}
        >
          <span>
            {t.name} - VERIFY - {(t.taxRate ?? t.rate ?? 0).toFixed(2)}%
          </span>
          <span>${(t.amount ?? 0).toFixed(2)}</span>
        </div>
      ))}
      <div style={{ fontWeight: "bold" }}>
        {row("TOTAL:", `$${total.toFixed(2)}`)}
        {cashPaid > 0 && row("CASH:", `$${cashPaid.toFixed(2)}`)}
        {cardPaid > 0 && row("CARD:", `$${cardPaid.toFixed(2)}`)}
        {changeAmount > 0 && row("CHANGE:", `$${Number(changeAmount).toFixed(2)}`)}
      </div>

      {order?.receiptNote && (
        <div style={{ marginTop: 8 }}>
          <span>Receipt Note: {order.receiptNote}</span>
        </div>
      )}

      <div style={{ textAlign: "center", fontWeight: "bold", marginTop: 10 }}>THANK YOU!</div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: 8 }}>
        <Barcode value={String(orderId)} renderer="svg" width={1.5} height={40} fontSize={12} />
      </div>
    </div>
  );
}
