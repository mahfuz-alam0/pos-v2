"use client";

import { useDispatch, useSelector } from "react-redux";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getQuoteForReturns } from "@/services/sales/getQuoteForReturns";
import { getQuoteForSale } from "@/store/slices/quoteForSaleSlice";
import { updateSalesDetail } from "@/store/slices/salesDetailSlice";

/**
 * Return flow — lists the sale's purchased line items and lets staff mark one
 * for return ("Accept Returns"), seeding it into the returned-items list at
 * quantity 1 and refreshing the return quote. The returned-items list is held
 * by the parent (controlled) since there is no returned-items redux slice in
 * this app; AddReturnedLineItems edits the same list.
 *
 * Props:
 *   returnedLineItems           — current returned-items array (controlled).
 *   onReturnedLineItemsChange   — setter for the returned-items array.
 */
export default function ReturnLineItems({
  returnedLineItems = [],
  onReturnedLineItemsChange,
}) {
  const lineItems = useSelector((state: any) => state?.lineItems?.lineItems) || [];
  const saleDetail = useSelector((state: any) => state?.saleData) || {};
  const quoteBody = useSelector((state: any) => state?.salesDetail);
  const dispatch = useDispatch();

  let formattedData;
  if (saleDetail && saleDetail.nonPackagedLineItems) {
    formattedData = saleDetail.nonPackagedLineItems.map((item) => ({
      productName: item?.snapShotData?.productName,
      inventoryId: item?.inventoryId,
      price: item?.initialUnitPrice,
      deals: {
        name: item?.snapshotData?.productName,
        price: item?.initialUnitPrice,
      },
      purchaseQuantity: item?.purchaseQuantity,
      advertisedId: saleDetail?.advertisedId,
      packageId: item?.packageId,
    }));
  }

  const data = Object.keys(saleDetail).length > 0 ? formattedData || [] : lineItems;

  const handleAcceptReturn = (record) => {
    let updatedReturnsData = [...returnedLineItems];
    const recordIndex = updatedReturnsData.findIndex(
      (item) => item.packageId === record.packageId
    );

    const entry = {
      ...record,
      id: record.packageId,
      key: record.packageId,
      quantity: 1,
      existingQuantity: record.purchaseQuantity,
    };

    if (recordIndex !== -1) {
      updatedReturnsData[recordIndex] = entry;
    } else {
      updatedReturnsData.push(entry);
    }

    onReturnedLineItemsChange?.(updatedReturnsData);

    const updatedQuoteBody = {
      shopId: saleDetail?.shopId,
      saleId: saleDetail?.id,
      lineItems: updatedReturnsData,
    };

    getQuoteForReturns(updatedQuoteBody).then((res) => {
      dispatch(getQuoteForSale(res.data));
      dispatch(
        updateSalesDetail({
          ...quoteBody,
          lineItems: res.data.lineItems,
        })
      );
    });
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
          {data.map((record, i) => (
            <tr key={record.packageId || i} className="border-t border-border">
              <td className="px-3 py-2 text-primary">{record?.productName}</td>
              <td className="px-3 py-2">${record?.price}</td>
              <td className="px-3 py-2">{record?.advertisedId}</td>
              <td className="px-3 py-2">
                <div className="flex items-center justify-center gap-1">
                  <Button size="icon-sm" disabled>
                    -
                  </Button>
                  <Input
                    className="w-12 text-center"
                    defaultValue={record?.purchaseQuantity || 0}
                    disabled
                  />
                  <Button size="icon-sm" disabled>
                    +
                  </Button>
                </div>
              </td>
              <td className="px-3 py-2 text-center">
                <Button size="sm" onClick={() => handleAcceptReturn(record)}>
                  Accept Returns
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
