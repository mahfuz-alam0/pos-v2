"use client";

import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Trash2, Minus, Plus, Info } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { addToCart } from "@/store/slices/cartSlice";
import { addLineItemsAction } from "@/store/slices/lineItemsSlice";
import { updateSalesDetail } from "@/store/slices/salesDetailSlice";
import { getQuoteForSale } from "@/store/slices/quoteForSaleSlice";
import { getQuoteForSales } from "@/services/sales/getQuoteforSales";
import { quoteApiManager } from "@/utils/quoteApiManager";

// Ported from components/products-cart.js — the in-progress cart table.
//
// Scope: this is the product/cart slice only. The old 3200-line file also
// carried deal drawers, split/print/final-price/discount flows and the tablet
// product browser; those are separate concerns and are intentionally NOT ported
// here (see report). Preserved exactly: the display<->backend quantity math
// (purchaseQuantity = displayValue * projectQtyConversionRate), the decimal
// (0.25-step) vs integer (1-step) rules, dedup, remove, and the post-change
// quote refresh.
//
// Redux wiring maps old store keys to the new slices:
//   old state.addToCart.cart        -> state.cart.cart
//   old state.AddLineItems.lineItems-> state.lineItems.lineItems
//   old state.SetSalesDetail        -> state.salesDetail        (quote body)
//   old state.SalesData             -> state.saleData           (loaded sale)
//   old state.QuoteForSale.lineItems-> state.quoteForSale.lineItems (order summary)
export default function ProductsCart() {
  const dispatch = useDispatch();
  const cart = useSelector((state: any) => state?.cart?.cart) || [];
  const quoteBody = useSelector((state: any) => state?.salesDetail);
  const saleDetail = useSelector((state: any) => state?.saleData) || {};
  const getOrderSummary = useSelector((state: any) => state?.quoteForSale?.lineItems);
  const [counters, setCounters] = useState({});

  // Editing is locked once an existing sale is loaded, same as the old file.
  const isLocked = Object.keys(saleDetail).length > 0;

  // shouldAllowDecimal comes from the order-summary line item's
  // displayQtyMeasurementPolicy, falling back to the cart record's flag.
  const getShouldAllowDecimal = (record) => {
    const lineItem = getOrderSummary?.data?.nonPackagedLineItems?.find(
      (item) => item.createdLineItem.packageId === record.id
    );
    const policyFlag =
      lineItem?.createdLineItem?.snapShotData?.displayQtyMeasurementPolicy
        ?.shouldAllowDecimalValue;
    if (policyFlag !== undefined) return policyFlag === true;
    return record.shouldAllowDecimalValue === true;
  };

  const refreshQuote = (updatedLineItems) => {
    const updatedQuoteBody = { ...quoteBody, lineItems: updatedLineItems };
    quoteApiManager
      .call(getQuoteForSales, updatedQuoteBody, "productsCart-quote")
      .then((res) => dispatch(getQuoteForSale(res.data)))
      .catch((err) => toast.error(err?.message || "Failed to refresh quote"));
  };

  const commitQuantity = (record, backendQuantity) => {
    const updatedLineItems = cart.map((item) =>
      item.key === record.key
        ? {
            ...item,
            inventoryId: item?.inventoryId,
            packageId: item?.id,
            purchaseQuantity: backendQuantity,
            disabledDiscountSources: [],
          }
        : item
    );
    dispatch(updateSalesDetail({ lineItems: updatedLineItems }));
    dispatch(addToCart(updatedLineItems));
    dispatch(addLineItemsAction(updatedLineItems));
    refreshQuote(updatedLineItems);
  };

  const handleIncrement = (record) => {
    const conversionRate = record?.projectQtyConversionRate || 1;
    const currentDisplayValue = record.purchaseQuantity
      ? record.purchaseQuantity / conversionRate
      : 1;
    const shouldAllowDecimal = getShouldAllowDecimal(record);

    const newDisplayValue = shouldAllowDecimal
      ? Math.round((currentDisplayValue + 0.25) * 100) / 100
      : Math.round(currentDisplayValue + 1);

    const displayValue = shouldAllowDecimal
      ? newDisplayValue.toFixed(2)
      : newDisplayValue.toString();
    setCounters((c) => ({ ...c, [record.key]: displayValue }));

    commitQuantity(record, newDisplayValue * conversionRate);
  };

  const handleDecrement = (record) => {
    const conversionRate = record?.projectQtyConversionRate || 1;
    const currentDisplayValue = record.purchaseQuantity
      ? record.purchaseQuantity / conversionRate
      : 1;
    const shouldAllowDecimal = getShouldAllowDecimal(record);
    const minValue = shouldAllowDecimal ? 0.25 : 1;

    if (currentDisplayValue > minValue) {
      const newDisplayValue = shouldAllowDecimal
        ? Math.max(0.25, Math.round((currentDisplayValue - 0.25) * 100) / 100)
        : Math.max(1, Math.round(currentDisplayValue - 1));

      const displayValue = shouldAllowDecimal
        ? newDisplayValue.toFixed(2)
        : newDisplayValue.toString();
      setCounters((c) => ({ ...c, [record.key]: displayValue }));

      commitQuantity(record, newDisplayValue * conversionRate);
    }
  };

  const handleQuantityChange = (record, value) => {
    const shouldAllowDecimal = getShouldAllowDecimal(record);
    const isValidNumberPattern = shouldAllowDecimal
      ? /^\d*\.?\d*$/.test(value)
      : /^\d*$/.test(value);

    if (!(value === "" || isValidNumberPattern)) return;

    // Keep the raw input visible for good typing UX.
    setCounters((c) => ({ ...c, [record.key]: value }));

    // Don't push incomplete values to the cart.
    if (
      value === "" ||
      value === "0" ||
      (shouldAllowDecimal && (value === "0." || value.endsWith(".")))
    ) {
      return;
    }

    const numericValue = parseFloat(value);
    if (isNaN(numericValue)) return;

    let finalDisplayValue;
    if (shouldAllowDecimal) {
      if (numericValue < 0.25) return;
      finalDisplayValue = numericValue;
    } else {
      if (numericValue < 1) return;
      finalDisplayValue = Math.round(numericValue);
    }

    const conversionRate = record?.projectQtyConversionRate || 1;
    commitQuantity(record, finalDisplayValue * conversionRate);
  };

  const handleRemove = (record) => {
    const updatedLineItems = cart.filter((item) => item.key !== record.key);
    dispatch(addLineItemsAction(updatedLineItems));
    dispatch(addToCart(updatedLineItems));
    dispatch(updateSalesDetail({ lineItems: updatedLineItems }));
    setCounters((c) => {
      const next = { ...c };
      delete next[record.key];
      return next;
    });
    refreshQuote(updatedLineItems);
  };

  const displayQty = (record) => {
    if (counters[record.key] !== undefined) return counters[record.key];
    const conversionRate = record?.projectQtyConversionRate || 1;
    return record.purchaseQuantity ? record.purchaseQuantity / conversionRate : 1;
  };

  if (cart.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-900 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-200">
        <Info className="size-4 flex-shrink-0" />
        No items in cart
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="px-2 py-2">Product Name</th>
            <th className="px-2 py-2">Price</th>
            <th className="px-2 py-2 text-center">Qty</th>
            <th className="px-2 py-2 text-right">Action</th>
          </tr>
        </thead>
        <tbody>
          {cart.map((record) => (
            <tr key={record.key ?? record.id} className="border-b">
              <td className="px-2 py-2">
                <div className="text-primary">{record?.productName}</div>
              </td>
              <td className="px-2 py-2">{record?.price}</td>
              <td className="px-2 py-2">
                <div className="flex items-center justify-center gap-1">
                  <Button
                    size="icon"
                    variant="secondary"
                    disabled={isLocked}
                    onClick={() => handleDecrement(record)}
                  >
                    <Minus className="size-4" />
                  </Button>
                  <Input
                    value={displayQty(record)}
                    onChange={(e) => handleQuantityChange(record, e.target.value)}
                    disabled={isLocked}
                    inputMode={getShouldAllowDecimal(record) ? "decimal" : "numeric"}
                    className="w-14 text-center"
                  />
                  <Button
                    size="icon"
                    variant="secondary"
                    disabled={isLocked}
                    onClick={() => handleIncrement(record)}
                  >
                    <Plus className="size-4" />
                  </Button>
                </div>
              </td>
              <td className="px-2 py-2 text-right">
                {!isLocked && (
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <button
                          type="button"
                          aria-label="Remove"
                          className="ml-auto inline-flex rounded-lg bg-destructive/90 p-2 text-white hover:bg-destructive"
                          onClick={() => handleRemove(record)}
                        >
                          <Trash2 className="size-4" />
                        </button>
                      }
                    />
                    <TooltipContent>Remove</TooltipContent>
                  </Tooltip>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
