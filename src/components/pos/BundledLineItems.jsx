"use client";

import { useDispatch, useSelector } from "react-redux";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getQuoteForSales } from "@/services/sales/getQuoteforSales";
import { getQuoteForSale } from "@/store/slices/quoteForSaleSlice";
import { updateSalesDetail } from "@/store/slices/salesDetailSlice";
import { resetBogoLineItems } from "@/store/slices/bogoLineItemsSlice";

/**
 * Displays BOGO / bundle-linked line items grouped by deal, with an expandable
 * per-item breakdown (quantity, original/final price, discount hierarchy).
 * Removing a bundle clears bundledLineItems, refreshes the quote, and resets
 * the bogo slice. Bundle-building logic is preserved from the original.
 */
export default function BundledLineItems() {
  const bogoData = useSelector((state) => state.bogoLineItems.bogoDeals || []);
  const quotePackagedLineItems = useSelector(
    (state) => state?.quoteForSale?.lineItems?.data?.packagedLineItems || []
  );
  const dispatch = useDispatch();
  const quoteBody = useSelector((state) => state?.salesDetail);

  const handleDelete = () => {
    dispatch(updateSalesDetail({ bundledLineItems: [] }));
    const updatedQuoteBody = { ...quoteBody, bundledLineItems: [] };
    getQuoteForSales(updatedQuoteBody).then((res) => {
      dispatch(getQuoteForSale(res.data));
      toast.success("Bogo bundle removed successfully");
    });
    dispatch(resetBogoLineItems());
  };

  const processBogoDataFromDeals = () => {
    if (!bogoData || !Array.isArray(bogoData) || bogoData.length === 0) {
      return [];
    }

    return bogoData
      .map((deal, dealIndex) => {
        const bundledItems = deal.bundledLineItems || [];

        return bundledItems.map((bundle, bundleIndex) => {
          const matchedQuoteBundle = quotePackagedLineItems.find(
            (quoteBundle) =>
              quoteBundle?.packageConstructorType === "BOGO_DEAL" &&
              quoteBundle?.bogoDealPackageConstructorSnapShotData?.id ===
                (deal.dealId || bundle.bogoDealId)
          );

          const findQuoteLineItem = (item, itemCategory) => {
            const quoteItems =
              itemCategory === "GET"
                ? matchedQuoteBundle?.childLineItems || []
                : matchedQuoteBundle?.parentLineItems || [];

            const matchedQuoteItem = quoteItems.find((quoteItem) => {
              const createdLineItem = quoteItem?.createdLineItem || {};
              return (
                (createdLineItem.packageId &&
                  createdLineItem.packageId === item.packageId &&
                  (!createdLineItem.inventoryId ||
                    createdLineItem.inventoryId ===
                      (item.inventoryId || item.pkg?.inventoryId))) ||
                createdLineItem.packageId === item.packageId
              );
            });

            return matchedQuoteItem?.createdLineItem || null;
          };

          const parentItems = bundle.parentLineItems || [];
          const childItems = bundle.childLineItems || [];

          const buildItem = (item, category) => {
            const quoteLineItem = findQuoteLineItem(
              item,
              category === "GET" ? "GET" : "BUY"
            );
            return {
              key: `${category === "GET" ? "child" : "parent"}-${dealIndex}-${bundleIndex}-${item.packageId}`,
              ...item,
              itemCategory: category,
              productName:
                item.pkg?.productName || item.pkg?.name || "Unknown Product",
              packageName:
                item.pkg?.name ||
                item.pkg?.deals?.packageName ||
                "Unknown Package",
              advertisedId:
                item.pkg?.advertisedId ||
                item.pkg?.deals?.packageId ||
                item.packageId,
              price:
                quoteLineItem?.initialUnitPrice ||
                item.pkg?.price ||
                item.pkg?.deals?.price ||
                0,
              sellableUomShortForm:
                quoteLineItem?.snapShotData?.purchaseUoMShortForm ||
                item.pkg?.sellableUomShortForm ||
                "ea",
              dealName: bundle.dealName || deal.dealName,
              discountRate:
                category === "GET"
                  ? bundle.discountRate || deal.discountRate || 0
                  : 0,
              purchaseQuantity:
                quoteLineItem?.purchaseQuantity || item.purchaseQuantity || 0,
              displayQtyConversionRateUsed:
                quoteLineItem?.snapShotData?.displayQtyConversionRateUsed,
              initialTotalPrice: quoteLineItem?.initialTotalPrice,
              finalTotalPrice: quoteLineItem?.finalTotalPrice,
              totalDiscountApplied: quoteLineItem?.totalDiscountApplied,
              discountBreakDownHierarchy:
                quoteLineItem?.discountBreakDownHierarchy || [],
            };
          };

          const allBundleItems = [
            ...parentItems.map((item) => buildItem(item, "BUY")),
            ...childItems.map((item) => buildItem(item, "GET")),
          ];

          const totalQuantity = allBundleItems.reduce(
            (sum, item) => sum + (item.purchaseQuantity || 0),
            0
          );

          return {
            key: `deal-${dealIndex}-bundle-${bundleIndex}`,
            dealId: deal.dealId || bundle.bogoDealId,
            dealName: deal.dealName || bundle.dealName,
            bogoType: deal.bogoType || "BOGO",
            discountRate: bundle.discountRate || deal.discountRate || 0,
            bundleType: bundle.type,
            totalQuantity,
            addedAt: deal.addedAt,
            childData: allBundleItems,
            bundledLineItems: bundledItems,
          };
        });
      })
      .flat();
  };

  const processedData = processBogoDataFromDeals();

  if (!processedData.length) {
    return (
      <div className="pt-4">
        <h2 className="mb-4 text-lg font-semibold">BOGO Bundles</h2>
        <div className="rounded-lg border-2 border-dashed border-border bg-muted py-8 text-center text-muted-foreground">
          <div className="mb-2 text-lg">🎁</div>
          <div>No BOGO bundles available</div>
          <div className="mt-1 text-sm">Add some BOGO deals to see them here</div>
        </div>
      </div>
    );
  }

  const renderChildTotal = (record) => {
    const price = record.price || 0;
    const quantity = record.purchaseQuantity || 1;
    const total =
      record.initialTotalPrice != null
        ? record.initialTotalPrice
        : price * quantity;

    const hierarchyDiscountAmount = Array.isArray(
      record.discountBreakDownHierarchy
    )
      ? record.discountBreakDownHierarchy.reduce(
          (sum, item) => sum + (Number(item?.totalDiscountApplied) || 0),
          0
        )
      : 0;

    const discountAmount =
      record.totalDiscountApplied != null
        ? Number(record.totalDiscountApplied) || 0
        : hierarchyDiscountAmount;

    const finalPrice =
      record.finalTotalPrice != null
        ? Number(record.finalTotalPrice) || 0
        : total - discountAmount;

    return (
      <div>
        <div className="font-medium">${total.toFixed(2)}</div>
        {discountAmount > 0 && (
          <div className="text-xs">
            <div className="text-red-500">-${discountAmount.toFixed(2)}</div>
            <div className="font-medium text-green-600">
              ${finalPrice.toFixed(2)}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="pt-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">BOGO Bundles</h2>
        <div className="text-sm text-muted-foreground">
          {bogoData.length} deal{bogoData.length !== 1 ? "s" : ""} •{" "}
          {processedData.length} bundle{processedData.length !== 1 ? "s" : ""}
        </div>
      </div>

      <div className="space-y-2">
        {processedData.map((record) => (
          <details
            key={record.key}
            className="rounded-lg border border-border"
            open
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3">
              <div>
                <div className="font-medium text-green-700">
                  {record.dealName}
                </div>
                <div className="text-xs text-muted-foreground">
                  Type: {record.bogoType} | Discount: {record.discountRate}% |{" "}
                  {record.totalQuantity} items
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={(e) => {
                  e.preventDefault();
                  handleDelete();
                }}
                title="Remove BOGO Deal"
              >
                <Trash2 className="text-destructive" />
              </Button>
            </summary>

            <div className="overflow-x-auto border-t border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted text-left text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">Product</th>
                    <th className="px-3 py-2 text-center font-medium">
                      Unit QTY
                    </th>
                    <th className="px-3 py-2 text-center font-medium">
                      Orig. Unit Price
                    </th>
                    <th className="px-3 py-2 text-center font-medium">
                      Orig. Total Price
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {record.childData.map((child) => {
                    const purchaseQuantity = Number(child.purchaseQuantity || 0);
                    const conv = Number(
                      child.displayQtyConversionRateUsed || 0
                    );
                    const displayQuantity =
                      conv > 0 && purchaseQuantity > 0
                        ? conv / purchaseQuantity
                        : purchaseQuantity;
                    return (
                      <tr key={child.key} className="border-t border-border">
                        <td className="px-3 py-2">
                          <div className="font-medium">{child.productName}</div>
                          <div className="text-xs text-muted-foreground">
                            Package: {child.packageName} — ID:{" "}
                            {child.advertisedId}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <div className="font-medium">
                            {parseFloat(displayQuantity).toFixed(2)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {child.sellableUomShortForm}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-center">
                          ${child.price}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {renderChildTotal(child)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </details>
        ))}
      </div>

      <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300">
        <strong>Summary:</strong> You have {bogoData.length} active BOGO deal
        {bogoData.length !== 1 ? "s" : ""}
      </div>
    </div>
  );
}
