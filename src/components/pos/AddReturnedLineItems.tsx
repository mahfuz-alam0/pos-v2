"use client";

import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getQuoteForReturns } from "@/services/sales/getQuoteForReturns";
import { getQuoteForSale } from "@/store/slices/quoteForSaleSlice";
import { updateSalesDetail } from "@/store/slices/salesDetailSlice";

/**
 * Editable list of items being returned. Quantity is clamped to the originally
 * purchased quantity (existingQuantity); every change re-fetches the return
 * quote. The list is controlled by the parent (shared with ReturnLineItems).
 *
 * Props:
 *   returnedLineItems           — current returned-items array (controlled).
 *   onReturnedLineItemsChange   — setter for the returned-items array.
 */
export default function AddReturnedLineItems({
  returnedLineItems = [],
  onReturnedLineItemsChange,
}) {
  const saleDetail = useSelector((state: any) => state?.saleData) || {};
  const quoteBody = useSelector((state: any) => state?.salesDetail);
  const dispatch = useDispatch();
  const [counters, setCounters] = useState({});

  const commit = (updatedLineItems, { catchReset = false } = {}) => {
    dispatch(updateSalesDetail({ ...quoteBody, lineItems: updatedLineItems }));
    onReturnedLineItemsChange?.(updatedLineItems);

    const updatedQuoteBody = {
      shopId: saleDetail?.shopId,
      saleId: saleDetail?.id,
      lineItems: updatedLineItems,
    };

    getQuoteForReturns(updatedQuoteBody)
      .then((res) => {
        dispatch(getQuoteForSale(res.data));
      })
      .catch(() => {
        toast.error("Error updating line items");
        if (catchReset) dispatch(getQuoteForSale({ lineItems: [] }));
      });
  };

  const handleQuantityChange = (record, value) => {
    const intValue = parseInt(value, 10);
    if (
      !isNaN(intValue) &&
      intValue <= parseInt(record.existingQuantity) &&
      intValue >= 0
    ) {
      setCounters({ ...counters, [record.key]: intValue });
      const updatedLineItems = returnedLineItems.map((item) =>
        item.id === record.id ? { ...item, quantity: intValue } : item
      );
      commit(updatedLineItems);
    }
  };

  const handleIncrement = (record) => {
    const currentValue = counters[record.key] || record.quantity;
    if (currentValue < parseInt(record.existingQuantity)) {
      setCounters({ ...counters, [record.key]: currentValue + 1 });
      const updatedLineItems = returnedLineItems.map((item) =>
        item.id === record.id
          ? { ...item, quantity: item.quantity ? item.quantity + 1 : 1 }
          : item
      );
      commit(updatedLineItems);
    }
  };

  const handleDecrement = (record) => {
    const currentValue = counters[record.key] || record.quantity;
    if (currentValue > 0) {
      setCounters({ ...counters, [record.key]: currentValue - 1 });
      const updatedLineItems = returnedLineItems.map((item) =>
        item.id === record.id
          ? { ...item, quantity: item.quantity ? item.quantity - 1 : 0 }
          : item
      );
      commit(updatedLineItems, { catchReset: true });
    }
  };

  const handleDelete = (record) => {
    const updatedLineItems = returnedLineItems.filter(
      (item) => item.id !== record.id
    );
    commit(updatedLineItems);
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted text-left text-muted-foreground">
          <tr>
            <th className="px-3 py-2 font-medium">Product Name</th>
            <th className="px-3 py-2 font-medium">Unit Price</th>
            <th className="px-3 py-2 font-medium">Package ID</th>
            <th className="px-3 py-2 text-center font-medium">Qty</th>
            <th className="px-3 py-2 text-center font-medium">Action</th>
          </tr>
        </thead>
        <tbody>
          {returnedLineItems.map((record) => (
            <tr key={record.key} className="border-t border-border">
              <td className="px-3 py-2 text-primary">{record?.productName}</td>
              <td className="px-3 py-2">${record?.price}</td>
              <td className="px-3 py-2">{record?.advertisedId}</td>
              <td className="px-3 py-2">
                <div className="flex items-center justify-center gap-1">
                  <Button size="icon-sm" onClick={() => handleDecrement(record)}>
                    -
                  </Button>
                  <Input
                    className="w-12 text-center"
                    value={counters[record.key] || record.quantity || 0}
                    min={1}
                    max={parseInt(record.existingQuantity)}
                    onChange={(e) =>
                      handleQuantityChange(record, parseInt(e.target.value))
                    }
                  />
                  <Button size="icon-sm" onClick={() => handleIncrement(record)}>
                    +
                  </Button>
                </div>
              </td>
              <td className="px-3 py-2 text-center">
                <button
                  onClick={() => handleDelete(record)}
                  className="text-destructive"
                  title="Remove"
                >
                  <Trash2 className="mx-auto size-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
