"use client";

import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  ChevronDown,
  ChevronRight,
  Trash2,
  Info,
  Loader2,
} from "lucide-react";
import TaxBreakdown from "./TaxBreakdown";
import Drawer from "@/components/ui/Drawer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getQuoteForSales } from "@/services/sales/getQuoteforSales";
import { quoteApiManager } from "@/utils/quoteApiManager";
import { getQuoteForSale } from "@/store/slices/quoteForSaleSlice";

/**
 * Cart line-item breakdown: packaged (BOGO/bundle) deals, non-packaged items
 * with per-item discount/tax breakdown, misc discount + misc charges, subtotal.
 *
 * Props (contract preserved from the old app):
 *   currentAction               — null renders the full per-item breakdown
 *   getOrderSummary             — quote object ({ data: {...} })
 *   deleteMiscCharge(taxProfileId)
 *   setSubTotalValue(number)    — reports the running subtotal to the parent
 *   getMiscDiscountFromOrderData(data) — computes the misc discount dollar amount
 *   deleteMiscallenousDiscount()       — remove the misc discount (async or sync)
 *   deleteLoyaltyPoints, removeDealFromSelectedProduct — accepted for contract
 *                                                        parity (unused here)
 */
export default function ProductPromoTaxes({
  currentAction,
  getOrderSummary,
  deleteMiscCharge,
  setSubTotalValue,
  getMiscDiscountFromOrderData,
  deleteMiscallenousDiscount,
}) {
  const [expanded, setExpanded] = useState(null);
  const [originalPrice, setOriginalPrice] = useState(0.0);
  const [currentSubtotal, setCurrentSubtotal] = useState(0.0);
  const [isLoadingQuote, setIsLoadingQuote] = useState(false);
  const [isRemovingMiscDiscount, setIsRemovingMiscDiscount] = useState(false);
  const [expandedItems, setExpandedItems] = useState(new Set());
  const [errorDrawer, setErrorDrawer] = useState(false);

  const dispatch = useDispatch();
  const quoteBody = useSelector((state) => state?.salesDetail);
  const lineItems = useSelector((state) => state?.lineItems?.lineItems);

  const toggleExpand = (id) =>
    setExpanded((prev) => (prev === id ? null : id));

  const toggleExpandDeals = (itemId) =>
    setExpandedItems((prev) => {
      const next = new Set(prev);
      next.has(itemId) ? next.delete(itemId) : next.add(itemId);
      return next;
    });

  const isExpanded = (itemId) => expandedItems.has(itemId);

  // Transform persisted cart items to display format when the order summary
  // has no non-packaged line items yet.
  const getFallbackLineItems = () => {
    if (getOrderSummary?.data?.nonPackagedLineItems?.length > 0) {
      return getOrderSummary.data.nonPackagedLineItems;
    }
    if (lineItems && lineItems.length > 0) {
      return lineItems.map((item) => ({
        createdLineItem: {
          inventoryId: item.inventoryId || item.id,
          packageId: item.packageId || item.id,
          purchaseQuantity: item.purchaseQuantity || 1,
          initialUnitPrice: item.price || 0,
          finalUnitPrice: item.price || 0,
          finalTotalPrice: (item.price || 0) * (item.purchaseQuantity || 1),
          totalPriceBeforeTax: (item.price || 0) * (item.purchaseQuantity || 1),
          discountBreakDownHierarchy: item.discountBreakDownHierarchy || [],
          snapShotData: {
            productId: item.productId || item.id,
            productName: item.productName || "Unknown Product",
            taxesApplied: item.taxesApplied || [],
          },
        },
      }));
    }
    return [];
  };

  const fallbackLineItems = getFallbackLineItems();
  const cartItemsCount =
    (getOrderSummary?.data?.packagedLineItems?.length || 0) +
    fallbackLineItems.length;

  // Fetch a fresh quote when there are persisted cart items but no order summary.
  useEffect(() => {
    const shouldFetchQuote =
      lineItems &&
      lineItems.length > 0 &&
      (!getOrderSummary?.data?.nonPackagedLineItems ||
        getOrderSummary?.data?.nonPackagedLineItems?.length === 0) &&
      quoteBody &&
      Object.keys(quoteBody).length > 0 &&
      !isLoadingQuote;

    if (!shouldFetchQuote) return;

    setIsLoadingQuote(true);
    const updatedQuoteBody = { ...quoteBody, lineItems };
    let hasCriticalError = false;

    quoteApiManager
      .call(getQuoteForSales, updatedQuoteBody, "product-promo-taxes")
      .then((res) => {
        if (res?.data) dispatch(getQuoteForSale(res.data));
      })
      .catch((error) => {
        // Don't retry on customer validation (403) or other critical errors.
        if (error?.response?.status === 403 || error?.error) {
          hasCriticalError = true;
        }
      })
      .finally(() => {
        if (!hasCriticalError) setIsLoadingQuote(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    lineItems?.length,
    getOrderSummary?.data?.nonPackagedLineItems?.length,
    quoteBody.customerId,
    quoteBody.drawerId,
    quoteBody.registerId,
    dispatch,
    isLoadingQuote,
  ]);

  const errorList = [
    ...(getOrderSummary?.data?.errorMessages?.loyaltyPoints || []).map(
      (msg, index) => (
        <p key={`loyalty-${index}`} className="mb-0">
          <b>Loyalty Points Error:</b> {msg}
        </p>
      )
    ),
    ...(getOrderSummary?.data?.errorMessages?.coupon || []).map((msg, index) => (
      <p key={`coupon-${index}`} className="mb-0">
        <b>Coupons Error:</b> {msg}
      </p>
    )),
    ...Object.entries(
      getOrderSummary?.data?.errorMessages?.regularDeals || {}
    ).flatMap(([dealId, messages]) =>
      messages.map((msg, index) => (
        <p key={`deal-${dealId}-${index}`} className="mb-0">
          <b>Deals:</b> {msg}
        </p>
      ))
    ),
  ];

  const calculateFinalPrice = (item) => {
    const unitPrice = item?.createdLineItem?.initialUnitPrice || 0;
    const quantity = item?.createdLineItem?.purchaseQuantity || 0;
    const basePrice = unitPrice * quantity;

    let totalDiscount = 0;
    item?.createdLineItem?.discountBreakDownHierarchy?.forEach((discount) => {
      totalDiscount += discount.totalDiscountApplied || 0;
    });

    let taxAmount = 0;
    item?.createdLineItem?.snapShotData?.taxesApplied?.forEach((tax) => {
      taxAmount += tax.amount || 0;
    });

    let miscCharges = 0;
    getOrderSummary?.data?.miscCharges?.forEach((charge) => {
      miscCharges += charge.finalTotalPrice || 0;
    });

    return basePrice - totalDiscount + taxAmount + miscCharges;
  };

  const handleDeleteMiscDiscount = async () => {
    if (!deleteMiscallenousDiscount || isRemovingMiscDiscount) return;
    try {
      setIsRemovingMiscDiscount(true);
      await Promise.resolve(deleteMiscallenousDiscount());
    } catch (err) {
      console.error("Error while deleting miscellaneous discount:", err);
    } finally {
      setIsRemovingMiscDiscount(false);
    }
  };

  // Running subtotal: sum of item finals (+ tip, - store credits) reported up.
  useEffect(() => {
    let totalPrice = 0;

    getOrderSummary?.data?.nonPackagedLineItems?.forEach((item) => {
      totalPrice += calculateFinalPrice(item);
    });

    getOrderSummary?.data?.packagedLineItems?.forEach((packageItem) => {
      packageItem.parentLineItems.forEach((item) => {
        totalPrice += item.createdLineItem.finalTotalPrice;
      });
      packageItem.childLineItems.forEach((item) => {
        totalPrice += item.createdLineItem.finalTotalPrice;
      });
    });

    const tipGiven = parseFloat(quoteBody?.tipGiven) || 0;

    if (originalPrice !== totalPrice) setOriginalPrice(totalPrice);

    let newSubtotal;
    if (quoteBody?.storeCreditsUtilized?.length > 0) {
      const totalStoreCredits = quoteBody.storeCreditsUtilized.reduce(
        (sum, credit) => sum + (credit.utilized || 0),
        0
      );
      newSubtotal = totalPrice - totalStoreCredits + tipGiven;
    } else {
      newSubtotal = totalPrice + tipGiven;
    }

    if (currentSubtotal !== newSubtotal) {
      setCurrentSubtotal(newSubtotal);
      setSubTotalValue(newSubtotal);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    getOrderSummary?.data?.nonPackagedLineItems,
    getOrderSummary?.data?.packagedLineItems,
    quoteBody?.tipGiven,
    quoteBody?.storeCreditsUtilized,
    originalPrice,
    currentSubtotal,
  ]);

  const chevron = (open) =>
    open ? (
      <ChevronDown className="size-4 text-[#8b8b8b]" />
    ) : (
      <ChevronRight className="size-4 text-[#8b8b8b]" />
    );

  const renderPackageItems = (packageItem) => {
    const dealName =
      packageItem?.bogoDealPackageConstructorSnapShotData?.name || "Package Deal";
    const dealDescription =
      packageItem?.bogoDealPackageConstructorSnapShotData?.description || "";
    const dealInfo = packageItem?.bogoDealPackageConstructorSnapShotData?.dealInfo;

    const getLineItemData = (item) =>
      item.createdLineItem ? item.createdLineItem : item;

    const getTotalPrice = (items) =>
      items.reduce((acc, item) => acc + getLineItemData(item).finalTotalPrice, 0);

    const parentTotal = getTotalPrice(packageItem.parentLineItems || []);
    const childTotal = getTotalPrice(packageItem.childLineItems || []);

    const packageId =
      packageItem.bundleId ||
      packageItem.parentLineItems?.[0]?.bundleId ||
      "default";
    const packageExpandId = `package-${packageId}`;
    const buyItemsExpandId = `buy-items-${packageId}`;
    const getItemsExpandId = `get-items-${packageId}`;

    const renderBuyGetItem = (item) => {
      const lineItem = getLineItemData(item);
      return (
        <div className="mb-2">
          <div className="mb-1 flex w-full items-center justify-between rounded bg-muted p-2">
            <div className="font-medium">
              <div className="flex items-center gap-2">
                {lineItem.snapShotData?.productName}
              </div>
              <div className="text-sm text-muted-foreground">
                Quantity:{" "}
                {lineItem?.snapShotData?.displayQtyConversionRateUsed > 0
                  ? `${parseFloat(lineItem.purchaseQuantity).toFixed(2)} ${
                      lineItem?.snapShotData?.purchaseUoMShortForm || "ea"
                    } (${(
                      lineItem.purchaseQuantity /
                      lineItem.snapShotData.displayQtyConversionRateUsed
                    ).toFixed(2)} ${
                      lineItem?.snapShotData?.displayQtyShortForm
                    }) x $${parseFloat(lineItem.initialUnitPrice).toFixed(2)}`
                  : `${parseFloat(lineItem.purchaseQuantity).toFixed(
                      2
                    )} x $${parseFloat(lineItem.initialUnitPrice).toFixed(2)}`}
              </div>
              {lineItem?.finalUnitPrice < lineItem?.snapShotData?.unitPackageCost && (
                <Badge variant="destructive" className="mb-0">
                  Under Cost
                </Badge>
              )}
            </div>
            <div className="mr-2 text-[14px] font-semibold">
              ${lineItem.finalTotalPrice.toFixed(2)}
            </div>
          </div>

          <div className="mb-1 rounded border-t border-border bg-muted/50 p-2">
            <div className="mt-2 flex justify-between">
              <span className="text-muted-foreground">Initial Price</span>
              <span className="mr-2">
                ${(lineItem.initialUnitPrice * lineItem.purchaseQuantity).toFixed(2)}
              </span>
            </div>

            {lineItem.discountBreakDownHierarchy?.length > 0 && (
              <div className="mt-2 flex justify-between border-t border-border pt-2">
                <span className="font-medium">Price After Discount</span>
                <span className="mr-2">
                  ${lineItem.totalPriceBeforeTax.toFixed(2)}
                </span>
              </div>
            )}

            {lineItem.snapShotData?.taxesApplied?.length > 0 && (
              <div className="mt-2">
                <div className="mb-1 text-sm font-semibold">Taxes Applied</div>
                {lineItem.snapShotData.taxesApplied.map((tax, tIndex) => (
                  <div key={`tax-${tIndex}`} className="flex justify-between">
                    <span className="text-muted-foreground">
                      {tax.name} ({tax.taxRate}%)
                    </span>
                    <span className="mr-2">${tax.amount.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-2 flex justify-between border-t border-border pt-2">
              <div className="font-semibold">Final Price</div>
              <div className="mr-2 font-semibold">
                ${lineItem.finalTotalPrice.toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      );
    };

    return (
      <div className="mb-2">
        <div className="flex items-center justify-between rounded bg-muted/50 px-2 py-2">
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => toggleExpandDeals(packageExpandId)}
            >
              {chevron(isExpanded(packageExpandId))}
            </Button>
            <div className="font-semibold">
              {dealName}
              <div>
                <span className="text-sm text-muted-foreground">
                  {dealDescription}
                </span>
              </div>
            </div>
          </div>
          <div className="mr-2 text-[14px] font-semibold">
            ${(parentTotal + childTotal).toFixed(2)}
          </div>
        </div>

        {isExpanded(packageExpandId) && (
          <div className="mb-1 rounded border-t border-border bg-muted/50 p-2">
            {/* Buy Items */}
            <div className="mt-2">
              <div className="mb-2 flex items-center justify-between rounded bg-muted px-2 py-2">
                <div className="flex items-center">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => toggleExpandDeals(buyItemsExpandId)}
                  >
                    {chevron(isExpanded(buyItemsExpandId))}
                  </Button>
                  <div className="font-semibold">
                    Buy Items ({packageItem.parentLineItems?.length || 0})
                  </div>
                </div>
                <div className="mr-2 text-[14px] font-semibold">
                  ${parentTotal.toFixed(2)}
                </div>
              </div>
              {isExpanded(buyItemsExpandId) && (
                <div className="ml-[30px]">
                  {(packageItem.parentLineItems || []).map((item, index) => (
                    <div key={`buy-${index}`}>{renderBuyGetItem(item)}</div>
                  ))}
                </div>
              )}
            </div>

            {/* Get Items */}
            <div className="mt-2">
              <div className="mb-2 flex items-center justify-between rounded bg-muted px-2 py-2">
                <div className="flex items-center">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => toggleExpandDeals(getItemsExpandId)}
                  >
                    {chevron(isExpanded(getItemsExpandId))}
                  </Button>
                  <div className="font-semibold">
                    Get Items ({packageItem.childLineItems?.length || 0})
                  </div>
                </div>
                <div className="mr-2 text-[14px] font-semibold">
                  ${childTotal.toFixed(2)}
                </div>
              </div>
              {isExpanded(getItemsExpandId) && (
                <div className="ml-[30px]">
                  {(packageItem.childLineItems || []).map((item, index) => (
                    <div key={`get-${index}`}>{renderBuyGetItem(item)}</div>
                  ))}
                </div>
              )}
            </div>

            {dealInfo && (
              <div className="mt-4 ml-[30px]">
                <div className="font-semibold">Bundle Discount</div>
                <div className="mt-1 flex justify-between">
                  <p className="mb-0 text-[#767676]">
                    {dealInfo.discountType === "PERCENTAGE"
                      ? `${dealInfo.discountRate}% off`
                      : `$${dealInfo.discountRate} off`}
                  </p>
                  <p className="mr-2 mb-0 text-[#E86F51]">
                    - $
                    {(
                      (parentTotal + childTotal) *
                      (dealInfo.discountRate / 100)
                    ).toFixed(2)}
                  </p>
                </div>
              </div>
            )}

            <div className="mt-4 ml-[30px] pb-2">
              <div className="flex justify-between font-semibold">
                <span>Total After Bundle Discount</span>
                <span className="mr-2">
                  ${(parentTotal + childTotal).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const nonPackagedHasErrors = (item) =>
    getOrderSummary?.data?.nonPackagedLineItems?.some(
      (orderItem) =>
        orderItem.createdLineItem.packageId ===
          (item.createdLineItem?.packageId || item.id) &&
        orderItem.errorMessages &&
        orderItem.errorMessages.length > 0
    );

  return (
    <TooltipProvider>
      <div className="mb-5 rounded-lg border border-border p-2">
        <div className="flex items-center">
          <div className="mt-1 mb-0 font-semibold capitalize">
            Cart Items ({cartItemsCount})
            {errorList.length > 0 && (
              <div className="mt-2 flex items-center justify-between gap-2 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                <span>
                  Oops! It looks like there are some issues with your cart items.
                </span>
                <button
                  type="button"
                  className="underline"
                  style={{ color: "#FF7F00" }}
                  onClick={() => setErrorDrawer(true)}
                >
                  View Details
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="max-h-[400px] overflow-y-auto">
          {(!getOrderSummary?.data?.packagedLineItems ||
            getOrderSummary?.data?.packagedLineItems?.length === 0) &&
          fallbackLineItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="text-center text-muted-foreground">
                <div className="mb-4 text-4xl">🛒</div>
                <div className="mb-2 text-lg font-medium">Your cart is empty</div>
                <div className="text-sm">Add some items to get started</div>
              </div>
            </div>
          ) : (
            <>
              {getOrderSummary?.data?.packagedLineItems?.map((packageItem, index) => (
                <div key={`package-${index}`}>{renderPackageItems(packageItem)}</div>
              ))}

              {fallbackLineItems.map((item, index) => {
                const hasErrors = nonPackagedHasErrors(item);
                const itemErrors = hasErrors
                  ? getOrderSummary?.data?.nonPackagedLineItems?.find(
                      (orderItem) =>
                        orderItem.createdLineItem.packageId ===
                        (item.createdLineItem?.packageId || item.id)
                    )?.errorMessages || []
                  : [];
                const assignedId = item.createdLineItem.snapShotData?.assignedId;

                return (
                  <div key={`item-${index}`}>
                    <div
                      className={`flex items-center rounded px-2 py-2 ${
                        index % 2 === 0 ? "bg-muted/40" : "bg-transparent"
                      } ${hasErrors ? "border-l-4 border-red-400 bg-red-50" : ""}`}
                    >
                      <div className="flex w-full items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center">
                          {hasErrors && (
                            <Tooltip>
                              <TooltipTrigger
                                render={
                                  <span className="mr-2 cursor-help text-red-500">
                                    <Info className="size-4" />
                                  </span>
                                }
                              />
                              <TooltipContent>
                                <strong>Item Errors:</strong>
                                <ul className="m-0 pl-4">
                                  {itemErrors.map((error, errorIndex) => (
                                    <li key={errorIndex}>{error}</li>
                                  ))}
                                </ul>
                              </TooltipContent>
                            </Tooltip>
                          )}

                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => toggleExpand(assignedId)}
                          >
                            {chevron(expanded === assignedId)}
                          </Button>

                          <div className="font-semibold">
                            <div className="flex items-center gap-2">
                              {item?.createdLineItem?.snapShotData?.productName}
                            </div>
                            <div>
                              <span className="text-sm text-muted-foreground">
                                Quantity:{" "}
                                <span>
                                  {item?.createdLineItem?.snapShotData
                                    ?.displayQtyConversionRateUsed > 0
                                    ? `${parseFloat(
                                        item?.createdLineItem?.purchaseQuantity
                                      ).toFixed(2)} ${
                                        item?.createdLineItem?.snapShotData
                                          ?.purchaseUoMShortForm || "ea"
                                      } (${(
                                        item?.createdLineItem?.purchaseQuantity /
                                        item?.createdLineItem?.snapShotData
                                          ?.displayQtyConversionRateUsed
                                      ).toFixed(2)} ${
                                        item?.createdLineItem?.snapShotData
                                          ?.displayQtyShortForm
                                      }) x $${parseFloat(
                                        item?.createdLineItem?.finalUnitPrice
                                      ).toFixed(2)} = $${(
                                        item?.createdLineItem?.purchaseQuantity *
                                        item?.createdLineItem?.finalUnitPrice
                                      ).toFixed(2)}`
                                    : `${parseFloat(
                                        item?.createdLineItem?.purchaseQuantity
                                      ).toFixed(2)} x $${parseFloat(
                                        item?.createdLineItem?.finalUnitPrice
                                      ).toFixed(2)} = $${(
                                        item?.createdLineItem?.purchaseQuantity *
                                        item?.createdLineItem?.finalUnitPrice
                                      ).toFixed(2)}`}
                                </span>{" "}
                              </span>
                            </div>
                            {item?.createdLineItem?.finalUnitPrice <
                              item?.createdLineItem?.snapShotData
                                ?.unitPackageCost && (
                              <Badge variant="destructive" className="mb-0">
                                Under Cost
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="mr-2 flex-shrink-0 whitespace-nowrap text-[14px] font-semibold">
                          $ {item?.createdLineItem?.finalTotalPrice?.toFixed(2)}
                        </div>
                      </div>
                    </div>

                    {expanded === assignedId && (
                      <div className="mb-1 mt-0 rounded border-t border-border bg-muted/50 p-2">
                        {currentAction === null && (
                          <>
                            {/* Deal discount */}
                            {fallbackLineItems?.map((lineItem) => {
                              if (
                                lineItem.createdLineItem?.snapShotData
                                  ?.assignedId !== assignedId
                              ) {
                                return null;
                              }
                              const dealDiscount =
                                lineItem.createdLineItem?.discountBreakDownHierarchy?.find(
                                  (discount) => discount.source === "DEAL"
                                );
                              return (
                                dealDiscount && (
                                  <div
                                    key={
                                      lineItem.createdLineItem.snapShotData
                                        ?.assignedId
                                    }
                                  >
                                    <div className="mt-2 ml-[30px] font-semibold">
                                      Applied Discounts
                                    </div>
                                    <div className="mt-1 mb-[10px] flex w-full justify-between pl-[30px]">
                                      <p className="mb-0 flex font-medium text-[#767676]">
                                        {dealDiscount?.notes} (
                                        {dealDiscount?.discountRateType ===
                                        "PERCENTAGE"
                                          ? `${dealDiscount?.discountRate}%`
                                          : `$${dealDiscount?.discountRate}`}
                                        )
                                      </p>
                                      <p className="mb-0 flex items-center text-[#E86F51]">
                                        <span className="mr-2 mt-1">
                                          - ${dealDiscount?.totalDiscountApplied}
                                        </span>
                                      </p>
                                    </div>
                                  </div>
                                )
                              );
                            })}

                            {/* Coupon discount */}
                            {item?.createdLineItem?.discountBreakDownHierarchy?.map(
                              (discount, i) =>
                                discount.source === "COUPON" ? (
                                  <div key={`coupon-${i}`}>
                                    <div className="mt-1 ml-[30px] flex justify-between">
                                      <p className="mb-0 flex gap-2 font-medium text-[#767676]">
                                        <span>{discount.notes}</span>(
                                        <span className="font-semibold">
                                          {discount.discountRateType ===
                                          "PERCENTAGE"
                                            ? `${discount.discountRate}%`
                                            : `$${discount.discountRate}`}
                                        </span>
                                        )
                                      </p>
                                      <p className="mb-0 flex items-center text-[#E86F51]">
                                        <span className="mr-2 mt-1">
                                          - ${discount.totalDiscountApplied}
                                        </span>
                                      </p>
                                    </div>
                                  </div>
                                ) : null
                            )}

                            {/* Loyalty discount */}
                            {item?.createdLineItem?.discountBreakDownHierarchy?.map(
                              (discount, i) =>
                                discount.source === "LOYALTY_POINTS" ? (
                                  <div key={`loyalty-${i}`}>
                                    <div className="mt-1 ml-[30px] flex justify-between">
                                      <p className="mb-0 flex gap-2 font-medium text-[#767676]">
                                        <span>{discount.notes}</span>(
                                        <span className="font-semibold">
                                          {discount.discountRateType ===
                                          "PERCENTAGE"
                                            ? `${discount.discountRate}%`
                                            : `$${discount.discountRate}`}
                                        </span>
                                        )
                                      </p>
                                      <p className="mb-0 flex items-center text-[#E86F51]">
                                        <span className="mr-2 mt-1">
                                          - ${discount.totalDiscountApplied}
                                        </span>
                                      </p>
                                    </div>
                                  </div>
                                ) : null
                            )}

                            <div className="mt-1 ml-[30px] flex justify-between">
                              <div className="-mt-[0.5em] font-medium">
                                Price Before Taxes
                              </div>
                              <div className="-mt-[0.5em] flex items-center font-medium">
                                <span className="mr-2">
                                  $
                                  {item?.createdLineItem?.totalPriceBeforeTax?.toFixed(
                                    2
                                  )}
                                </span>
                              </div>
                            </div>

                            <div className="my-2">
                              <TaxBreakdown
                                product={item.createdLineItem.snapShotData}
                              />
                            </div>

                            <div
                              className="pb-[7px]"
                              style={{
                                marginTop:
                                  getOrderSummary?.data?.miscCharges?.length > 0
                                    ? "20px"
                                    : "0px",
                              }}
                            >
                              <div className="mt-1 ml-[30px] flex justify-between">
                                <div className="-mt-[0.5em] font-semibold">
                                  Price After Taxes
                                </div>
                                <div className="-mt-[0.5em] flex items-center font-semibold">
                                  <span className="mr-2">
                                    $
                                    {item?.createdLineItem?.finalTotalPrice?.toFixed(
                                      2
                                    )}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>

      {/* Miscellaneous Discount */}
      {currentAction === null &&
        fallbackLineItems.length > 0 &&
        getOrderSummary?.data?.miscDiscount && (
          <>
            <div className="mt-3 px-3 font-semibold">Miscellaneous Discount</div>
            <div
              className="flex items-center justify-between px-3 py-2"
              style={{
                borderBottom: "1px dashed #cccccc82",
                marginBottom: "10px",
              }}
            >
              <p className="mb-0">
                {getOrderSummary?.data.miscDiscount?.name +
                  " (" +
                  (getOrderSummary?.data?.miscDiscount?.chargeType === "PERCENTAGE"
                    ? `${getOrderSummary?.data?.miscDiscount?.amount}%`
                    : `$${getOrderSummary?.data?.miscDiscount?.amount}`) +
                  ")"}
              </p>
              <div className="flex items-center gap-2">
                <span className="font-medium text-[#E86F51]">
                  -{" "}
                  {getOrderSummary?.data?.miscDiscount?.chargeType === "PERCENTAGE"
                    ? `$ ${parseFloat(
                        getMiscDiscountFromOrderData(getOrderSummary.data)
                      ).toFixed(2)}`
                    : `$${getOrderSummary?.data?.miscDiscount?.amount}`}
                </span>
                {isRemovingMiscDiscount ? (
                  <Loader2 className="size-4 animate-spin text-[#E86F51]" />
                ) : (
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <button
                          type="button"
                          aria-label="Delete Miscellaneous Discount"
                          className="cursor-pointer text-[#E86F51] transition-opacity hover:opacity-70"
                          onClick={handleDeleteMiscDiscount}
                        >
                          <Trash2 className="size-4" />
                        </button>
                      }
                    />
                    <TooltipContent>Delete Miscellaneous Discount</TooltipContent>
                  </Tooltip>
                )}
              </div>
            </div>
          </>
        )}

      {/* Miscellaneous Charges */}
      {currentAction === null &&
        fallbackLineItems.length > 0 &&
        getOrderSummary?.data?.miscCharges?.length > 0 && (
          <>
            <div className="mt-3 px-3 font-semibold">Miscellaneous Charges</div>
            {getOrderSummary.data.miscCharges.map((charge, index) => (
              <div
                key={index}
                className="flex items-start justify-between px-3 py-2"
                style={{
                  borderBottom: "1px dashed #cccccc82",
                  marginBottom: "10px",
                }}
              >
                <div className="mb-0 flex-1">
                  <div>
                    {charge.notes} (${charge.initialUnitPrice} x {charge.quantity})
                  </div>
                  {charge.snapShotData?.taxesApplied?.length > 0 && (
                    <div className="mt-1 text-xs text-muted-foreground">
                      Taxes:{" "}
                      {charge.snapShotData.taxesApplied
                        .map((tax) => `${tax.name} (${tax.taxRate}%)`)
                        .join(", ")}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-green-600">
                    +${charge.finalTotalPrice.toFixed(2)}
                  </span>
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <button
                          type="button"
                          aria-label="Delete Miscellaneous Charge"
                          className="cursor-pointer text-[#E86F51] transition-opacity hover:opacity-70"
                          onClick={() => deleteMiscCharge(charge.taxProfileId)}
                        >
                          <Trash2 className="size-4" />
                        </button>
                      }
                    />
                    <TooltipContent>Delete Miscellaneous Charge</TooltipContent>
                  </Tooltip>
                </div>
              </div>
            ))}
          </>
        )}

      {/* Subtotal */}
      {fallbackLineItems.length > 0 && (
        <div className="-mt-2 mb-2 flex items-center justify-between px-3">
          <div className="text-lg font-semibold">Subtotal</div>
          <div className="flex items-center text-base font-medium">
            ${" "}
            {getOrderSummary?.data?.finalPayable?.toFixed(2) ||
              fallbackLineItems
                .reduce(
                  (total, item) => total + item.createdLineItem.finalTotalPrice,
                  0
                )
                .toFixed(2)}
          </div>
        </div>
      )}

      <Drawer open={errorDrawer} onClose={() => setErrorDrawer(false)} side="right" size={520}>
        <div className="flex h-full flex-col p-4">
          <h3 className="mb-3 text-base font-semibold">Error Messages</h3>
          <div className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">
            <div className="font-semibold">There is something wrong with order:</div>
            <div className="mt-1">{errorList}</div>
          </div>
          <div className="mt-4 flex justify-end">
            <Button onClick={() => setErrorDrawer(false)}>OK</Button>
          </div>
        </div>
      </Drawer>
    </TooltipProvider>
  );
}
