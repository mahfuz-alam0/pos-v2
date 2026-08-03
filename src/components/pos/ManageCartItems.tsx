"use client";

import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { FileText, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useShop } from "@/context/shop-context";
import { getQuoteForSales } from "@/services/sales/getQuoteforSales";
import { getQuoteForSale } from "@/store/slices/quoteForSaleSlice";
import { updateSalesDetail } from "@/store/slices/salesDetailSlice";
import { addLineItemsAction } from "@/store/slices/lineItemsSlice";
import { addToCart } from "@/store/slices/cartSlice";
import PrintLabelModal from "@/components/pos/PrintLabelModal";

/**
 * Cart line-item quantity / removal manager. Every change updates the cart +
 * line-items + salesDetail and re-fetches the quote, exactly as the old drawer
 * did. When a completed sale is loaded (saleData populated) the quantity
 * controls are read-only and a Package ID column is shown instead of actions.
 *
 * Exit-label view/print (old app's separate side-drawer) is replaced by
 * PrintLabelModal — the same component ProductsCart.tsx uses — instead of
 * re-porting the old drawer.
 *
 * Props:
 *   onBack() — old `setManageCartItems(false)`.
 */
export default function ManageCartItems({ onBack }) {
  const lineItems = useSelector((state: any) => state?.lineItems?.lineItems) || [];
  const cart = useSelector((state: any) => state?.cart?.cart) || [];
  const getOrderSummary = useSelector((state: any) => state?.quoteForSale?.lineItems);
  const saleDetail = useSelector((state: any) => state?.saleData) || {};
  const quoteBody = useSelector((state: any) => state?.salesDetail);
  const [counters, setCounters] = useState({});
  const [printLabelRecord, setPrintLabelRecord] = useState<any>(null);
  const { shopId } = useShop();
  const dispatch = useDispatch();

  const saleLoaded = Object.keys(saleDetail).length > 0;

  const refreshQuote = (updatedLineItems) => {
    const updatedQuoteBody = { ...quoteBody, lineItems: updatedLineItems };
    getQuoteForSales(updatedQuoteBody).then((res) => {
      dispatch(getQuoteForSale(res.data));
    });
  };

  const mapCart = (record, purchaseQuantity) =>
    cart.map((item) => {
      if (item.id === record.id) {
        return {
          ...item,
          inventoryId: item?.inventoryId,
          packageId: item?.id,
          purchaseQuantity,
          disabledDiscountSources: [],
        };
      }
      return item;
    });

  const handleIncrement = (record) => {
    const currentValue = Number(counters[record.key]) || 1;
    const newValue = record.shouldAllowDecimalValue
      ? Number((currentValue + 0.25).toFixed(2))
      : Math.round(currentValue + 1);

    setCounters({ ...counters, [record.key]: newValue });
    const updatedLineItems = mapCart(record, newValue);
    dispatch(updateSalesDetail({ lineItems: updatedLineItems }));
    dispatch(addToCart(updatedLineItems));
    dispatch(addLineItemsAction(updatedLineItems));
    refreshQuote(updatedLineItems);
  };

  const handleDecrement = (record) => {
    const currentValue = Number(counters[record.key]) || 1;
    if (currentValue > 1) {
      const newValue = record.shouldAllowDecimalValue
        ? Number((currentValue - 0.25).toFixed(2))
        : Math.round(currentValue - 1);

      setCounters({ ...counters, [record.key]: newValue });
      const updatedLineItems = mapCart(record, newValue);
      dispatch(addLineItemsAction(updatedLineItems));
      dispatch(updateSalesDetail({ lineItems: updatedLineItems }));
      dispatch(addToCart(updatedLineItems));
      refreshQuote(updatedLineItems);
    }
  };

  const handleQuantityChange = (record, value) => {
    // ponytail: old code referenced an undefined `isDecimalAllowed` here, which
    // threw; use the item's own decimal flag so entry never crashes.
    let newValue;
    if (record.shouldAllowDecimalValue) {
      newValue = parseFloat(value);
      if (isNaN(newValue)) newValue = 1;
    } else {
      newValue = Math.max(1, parseInt(value, 10));
      if (isNaN(newValue)) newValue = 1;
    }

    setCounters({ ...counters, [record.key]: newValue });
    const updatedLineItems = mapCart(record, newValue);
    dispatch(addLineItemsAction(updatedLineItems));
    dispatch(updateSalesDetail({ lineItems: updatedLineItems }));
    dispatch(addToCart(updatedLineItems));
    refreshQuote(updatedLineItems);
  };

  const handleDelete = (record) => {
    const updatedLineItems = lineItems.filter((item) => item.id !== record.id);
    dispatch(addLineItemsAction(updatedLineItems));
    dispatch(addToCart(updatedLineItems));
    dispatch(updateSalesDetail({ lineItems: updatedLineItems }));
    const updatedCounters = { ...counters };
    delete updatedCounters[record.key];
    setCounters(updatedCounters);
    refreshQuote(updatedLineItems);
  };

  const unitPriceFor = (record) =>
    getOrderSummary?.data?.nonPackagedLineItems?.find(
      (item) => item.createdLineItem.packageId === record.id
    )?.createdLineItem?.initialUnitPrice;

  const hasPromo = (record) =>
    quoteBody.couponId !== null ||
    quoteBody.loyaltyPointsClaimed !== 0 ||
    quoteBody.applicableRegularDeals?.some(
      (deal) => deal.productId === record?.productId
    );

  return (
    <div className="w-full">
      <div className="mb-3 flex items-center justify-between">
        <div className="font-semibold">Manage Cart Items</div>
        <Button size="sm" onClick={() => onBack?.()}>
          Back
        </Button>
      </div>

      {lineItems.length === 0 ? (
        <div className="rounded-lg border border-border bg-muted p-4 text-sm text-muted-foreground">
          No items in cart
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Product</th>
                {!saleLoaded && (
                  <th className="px-3 py-2 font-medium">Unit QTY</th>
                )}
                <th className="px-3 py-2 font-medium">Unit Price</th>
                <th className="px-3 py-2 font-medium">Total Price</th>
                <th className="px-3 py-2 text-center font-medium">Count</th>
                {saleLoaded ? (
                  <th className="px-3 py-2 font-medium">Package ID</th>
                ) : (
                  <th className="px-3 py-2 font-medium">Action</th>
                )}
              </tr>
            </thead>
            <tbody>
              {lineItems.map((record) => {
                const unitPrice = unitPriceFor(record);
                const qty =
                  counters[record.key] ?? record.purchaseQuantity ?? 1;
                const totalPrice = (unitPrice ?? 0) * (record.purchaseQuantity ?? 0);
                const availableQty = record?.quantityLeft || 0;
                const exceeds = parseFloat(qty) > availableQty;
                return (
                  <tr key={record.key} className="border-t border-border">
                    <td className="px-3 py-2">
                      <div className="line-clamp-1 font-semibold">
                        {record?.productName}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {record.deals?.packageId}
                        </span>
                        {hasPromo(record) && (
                          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                            Promo
                          </Badge>
                        )}
                      </div>
                    </td>
                    {!saleLoaded && (
                      <td className="px-3 py-2 text-[#5c8ec0]">
                        {record?.quantityLeft?.toFixed(2)}
                        {record?.sellableUomShortForm}
                      </td>
                    )}
                    <td className="px-3 py-2">{unitPrice ?? "N/A"}</td>
                    <td className="px-3 py-2">${totalPrice.toFixed(2)}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          size="icon-sm"
                          onClick={() => handleDecrement(record)}
                          disabled={saleLoaded}
                        >
                          -
                        </Button>
                        <Input
                          value={qty}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => {
                            handleQuantityChange(record, e.target.value);
                            if (parseFloat(e.target.value) > availableQty) {
                              toast.error(
                                "Entered quantity exceeds available quantity."
                              );
                            }
                          }}
                          inputMode={
                            record.shouldAllowDecimalValue
                              ? "decimal"
                              : "numeric"
                          }
                          disabled={saleLoaded}
                          className={`w-16 text-center ${
                            exceeds ? "border-destructive" : ""
                          }`}
                        />
                        <Button
                          size="icon-sm"
                          onClick={() => handleIncrement(record)}
                          disabled={saleLoaded}
                        >
                          +
                        </Button>
                      </div>
                    </td>
                    {saleLoaded ? (
                      <td className="px-3 py-2">
                        {record?.advertisedPackageId}
                      </td>
                    ) : (
                      <td className="px-3 py-2">
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => setPrintLabelRecord(record)}
                            className="rounded-lg bg-sky-500/10 p-2 text-sky-600 hover:bg-sky-500/20 dark:bg-sky-500/15 dark:text-sky-400"
                            title="Print Label"
                          >
                            <FileText className="size-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(record)}
                            className="rounded-lg bg-destructive/10 p-2 text-destructive hover:bg-destructive/20"
                            title="Remove item"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <PrintLabelModal
        open={printLabelRecord != null}
        onClose={() => setPrintLabelRecord(null)}
        packageId={printLabelRecord?.id}
        shopId={shopId}
      />
    </div>
  );
}
