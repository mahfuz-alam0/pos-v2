"use client";

import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import Drawer from "@/components/ui/Drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getQuoteForSales } from "@/services/sales/getQuoteforSales";
import { getQuoteForSale } from "@/store/slices/quoteForSaleSlice";
import { updateSalesDetail } from "@/store/slices/salesDetailSlice";

/**
 * Manual line-item pricing override drawer. Two modes:
 *   - Apply Discount: percentage/flat rate on the selected items.
 *   - Set Final Price: a single total distributed proportionally, or per-item
 *     unit/total prices.
 * Both write forced* fields onto the matching quoteBody line items (matched
 * strictly by appMaintainedId so split siblings are untouched), re-fetch the
 * quote, and keep the calculation logic identical to the antd original.
 *
 * Props:
 *   visible, onClose        — visibility.
 *   selectedItems           — array of selected item keys.
 *   filteredLineItems       — the full displayed line-item list.
 *   getOrderSummary         — current quote (state.quoteForSale.lineItems).
 *   onSuccess()             — fired after a successful apply.
 *   defaultTab              — "discount" | "finalPrice".
 */
export default function DiscountFinalPriceDrawer({
  visible,
  onClose,
  selectedItems = [],
  filteredLineItems = [],
  getOrderSummary,
  onSuccess,
  defaultTab = "discount",
}) {
  const dispatch = useDispatch();
  const quoteBody = useSelector((state) => state?.salesDetail);

  const [tab, setTab] = useState(defaultTab);
  const [discountType, setDiscountType] = useState("PERCENTAGE");
  const [discountRate, setDiscountRate] = useState(0);
  const [applyingDiscount, setApplyingDiscount] = useState(false);

  const [priceMode, setPriceMode] = useState("unit"); // 'unit' | 'total'
  const [finalPrices, setFinalPrices] = useState({});
  const [settingFinalPrice, setSettingFinalPrice] = useState(false);
  const [totalPriceOverride, setTotalPriceOverride] = useState("");
  const [pricingMethod, setPricingMethod] = useState("total"); // 'total' | 'individual'

  const selectedItemsData = filteredLineItems.filter((item) =>
    selectedItems.includes(item.key)
  );

  const handleClose = () => {
    setDiscountType("PERCENTAGE");
    setDiscountRate(0);
    setPriceMode("unit");
    setFinalPrices({});
    setTotalPriceOverride("");
    setPricingMethod("total");
    onClose?.();
  };

  const handleApplyDiscount = async () => {
    if (!discountRate || discountRate <= 0) {
      toast.error("Please enter a valid discount rate");
      return;
    }

    setApplyingDiscount(true);

    try {
      const selectedAMIds = new Set(
        selectedItemsData.map((item) => item.appMaintainedId || item.key)
      );

      const updatedLineItems = (quoteBody.lineItems || []).map((lineItem) => {
        const lineItemAMId = lineItem.appMaintainedId || lineItem.key;
        if (selectedAMIds.has(lineItemAMId)) {
          const discountValue = Math.max(0, parseFloat(discountRate) || 0);
          return {
            ...lineItem,
            forcedManualDiscountType:
              discountType === "PERCENTAGE" ? "PERCENTAGE" : "AMOUNT",
            forcedDiscountRate: discountValue,
            forcedRecommendedUnitPrice: 0,
          };
        }
        return lineItem;
      });

      const updatedQuoteBody = { ...quoteBody, lineItems: updatedLineItems };
      dispatch(updateSalesDetail(updatedQuoteBody));
      const res = await getQuoteForSales(updatedQuoteBody);
      dispatch(getQuoteForSale(res.data));
      toast.success(
        `Discount applied to ${selectedItemsData.length} item(s) successfully!`
      );
      onSuccess?.();
      handleClose();
    } catch (error) {
      console.error("[DiscountDrawer] Error applying discount:", error);
      toast.error(error?.error || error?.message || "Failed to apply discount");
    } finally {
      setApplyingDiscount(false);
    }
  };

  const handleSetFinalPrice = async () => {
    const hasPrices = Object.keys(finalPrices).some(
      (key) => finalPrices[key] && finalPrices[key] > 0
    );
    const hasTotalOverride =
      totalPriceOverride && parseFloat(totalPriceOverride) > 0;

    if (!hasPrices && !hasTotalOverride) {
      toast.error(
        "Please set prices for at least one item or enter a total price"
      );
      return;
    }

    setSettingFinalPrice(true);

    try {
      let updatedLineItems;
      const selectedAMIds = new Set(
        selectedItemsData.map((item) => item.appMaintainedId || item.key)
      );

      if (hasTotalOverride) {
        const newTotalPrice = parseFloat(totalPriceOverride);

        const totalBefore = selectedItemsData.reduce((sum, item) => {
          const orderSummaryItem =
            getOrderSummary?.data?.nonPackagedLineItems?.find(
              (orderItem) =>
                orderItem.createdLineItem.packageId ===
                (item.packageId || item.id)
            );
          const unitPrice =
            orderSummaryItem?.createdLineItem?.initialUnitPrice || item.price;
          return sum + unitPrice * item.purchaseQuantity;
        }, 0);

        const diff = totalBefore - newTotalPrice;

        updatedLineItems = (quoteBody.lineItems || []).map((lineItem) => {
          const lineItemAMId = lineItem.appMaintainedId || lineItem.key;
          if (!selectedAMIds.has(lineItemAMId)) return lineItem;

          const orderSummaryItem =
            getOrderSummary?.data?.nonPackagedLineItems?.find(
              (orderItem) =>
                orderItem.createdLineItem.packageId ===
                (lineItem.packageId || lineItem.id)
            );
          const unitPrice =
            orderSummaryItem?.createdLineItem?.initialUnitPrice ||
            lineItem.price;
          const itemTotal = unitPrice * lineItem.purchaseQuantity;

          const discountAmount =
            totalBefore > 0 ? (diff * itemTotal) / totalBefore : 0;
          const newItemTotal = itemTotal - discountAmount;
          const newUnitPrice = newItemTotal / (lineItem.purchaseQuantity || 1);

          return {
            ...lineItem,
            forcedManualDiscountType: "AMOUNT",
            forcedDiscountRate: Math.max(
              0,
              discountAmount / (lineItem.purchaseQuantity || 1)
            ),
            forcedRecommendedUnitPrice: newUnitPrice,
          };
        });
      } else {
        updatedLineItems = (quoteBody.lineItems || []).map((lineItem) => {
          const lineItemAMId = lineItem.appMaintainedId || lineItem.key;
          const selectedItem = selectedItemsData.find(
            (item) =>
              (item.appMaintainedId || item.key) === lineItemAMId &&
              finalPrices[item.appMaintainedId || item.key] &&
              finalPrices[item.appMaintainedId || item.key] > 0
          );

          if (selectedItem) {
            const priceKey = selectedItem.appMaintainedId || selectedItem.key;
            const inputValue = parseFloat(finalPrices[priceKey]);
            let finalUnitPrice;

            if (priceMode === "unit") {
              finalUnitPrice = inputValue;
            } else {
              finalUnitPrice = inputValue / (lineItem.purchaseQuantity || 1);
            }

            return {
              ...lineItem,
              forcedManualDiscountType: "AMOUNT",
              forcedDiscountRate: 0,
              forcedRecommendedUnitPrice: finalUnitPrice,
            };
          }
          return lineItem;
        });
      }

      const updatedQuoteBody = { ...quoteBody, lineItems: updatedLineItems };
      dispatch(updateSalesDetail(updatedQuoteBody));
      const res = await getQuoteForSales(updatedQuoteBody);
      dispatch(getQuoteForSale(res.data));
      toast.success(
        hasTotalOverride
          ? `Total price distributed across ${selectedItemsData.length} item(s) successfully!`
          : `Final price set for ${
              selectedItemsData.filter(
                (item) => finalPrices[item.id] && finalPrices[item.id] > 0
              ).length
            } item(s) successfully!`
      );
      onSuccess?.();
      handleClose();
    } catch (error) {
      console.error("[DiscountDrawer] Error setting final price:", error);
      toast.error(error?.error || error?.message || "Failed to set final price");
    } finally {
      setSettingFinalPrice(false);
    }
  };

  const handleFinalPriceChange = (itemId, value) => {
    setFinalPrices({ ...finalPrices, [itemId]: value });
  };

  const hasFinalPrice = (itemId) => {
    const orderSummaryItem = getOrderSummary?.data?.nonPackagedLineItems?.find(
      (orderItem) => orderItem.createdLineItem.packageId === itemId
    );
    return orderSummaryItem?.createdLineItem?.isPriceManuallySet === true;
  };

  const unitPriceOf = (item) => {
    const orderSummaryItem = getOrderSummary?.data?.nonPackagedLineItems?.find(
      (orderItem) => orderItem.createdLineItem.packageId === item.id
    );
    return orderSummaryItem?.createdLineItem?.initialUnitPrice || item.price;
  };

  return (
    <Drawer
      open={visible}
      onClose={handleClose}
      side="right"
      size={700}
      zIndex={9990}
    >
      <div className="flex h-full flex-col">
        <div className="border-b border-border px-6 py-4 text-base font-semibold">
          Pricing &amp; Discount Management
        </div>
        <div className="flex-1 overflow-auto p-4">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="discount">Apply Discount</TabsTrigger>
              <TabsTrigger value="finalPrice">Set Final Price</TabsTrigger>
            </TabsList>

            {/* Apply Discount */}
            <TabsContent value="discount" className="space-y-6">
              <Card size="sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="flex size-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                      {selectedItems.length}
                    </span>
                    Selected Items
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="max-h-48 space-y-2 overflow-y-auto">
                    {selectedItemsData.map((item) => {
                      const unitPrice = unitPriceOf(item);
                      return (
                        <div
                          key={item.id}
                          className="flex items-center justify-between rounded-lg border border-border bg-muted p-3"
                        >
                          <div className="flex-1">
                            <div className="text-sm font-medium">
                              {item.productName || item.name}
                            </div>
                            <div className="mt-1 text-xs text-muted-foreground">
                              Qty: {item.purchaseQuantity} × $
                              {unitPrice.toFixed(2)}
                            </div>
                          </div>
                          <Badge variant="secondary">
                            ${(unitPrice * item.purchaseQuantity).toFixed(2)}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card size="sm">
                <CardHeader>
                  <CardTitle>Discount Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>Discount Type</Label>
                    <Select value={discountType} onValueChange={setDiscountType}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PERCENTAGE">
                          Percentage (%)
                        </SelectItem>
                        <SelectItem value="AMOUNT">Flat Amount ($)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Discount Rate</Label>
                    <Input
                      type="number"
                      value={discountRate}
                      min={0}
                      max={discountType === "PERCENTAGE" ? 100 : undefined}
                      step="0.01"
                      onChange={(e) =>
                        setDiscountRate(parseFloat(e.target.value) || 0)
                      }
                      placeholder={`Enter discount ${
                        discountType === "PERCENTAGE" ? "percentage" : "amount"
                      }`}
                    />

                    {selectedItemsData.length > 0 && (
                      <div className="mt-3 space-y-2 rounded-lg border border-border bg-muted p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">
                            Item Total:
                          </span>
                          <span className="text-base font-semibold">
                            $
                            {selectedItemsData
                              .reduce(
                                (sum, item) =>
                                  sum + unitPriceOf(item) * item.purchaseQuantity,
                                0
                              )
                              .toFixed(2)}
                          </span>
                        </div>

                        {discountRate > 0 && (
                          <div className="flex items-center justify-between border-t border-border pt-2">
                            <span className="text-sm font-medium text-green-700">
                              New Item Total:
                            </span>
                            <span className="text-base font-bold text-green-700">
                              $
                              {selectedItemsData
                                .reduce((sum, item) => {
                                  const totalPrice =
                                    unitPriceOf(item) * item.purchaseQuantity;
                                  const discountAmount =
                                    discountType === "PERCENTAGE"
                                      ? (totalPrice * discountRate) / 100
                                      : discountRate;
                                  return (
                                    sum +
                                    Math.max(0, totalPrice - discountAmount)
                                  );
                                }, 0)
                                .toFixed(2)}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {discountRate > 0 && (
                    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950">
                      <div className="mb-2 text-sm font-medium text-blue-800 dark:text-blue-300">
                        Discount Preview
                      </div>
                      {selectedItemsData.map((item) => {
                        const totalPrice =
                          unitPriceOf(item) * item.purchaseQuantity;
                        const discountAmount =
                          discountType === "PERCENTAGE"
                            ? (totalPrice * discountRate) / 100
                            : discountRate;
                        const finalPrice = totalPrice - discountAmount;
                        return (
                          <div
                            key={item.id}
                            className="flex justify-between py-1 text-xs text-blue-700 dark:text-blue-300"
                          >
                            <span className="max-w-[200px] truncate">
                              {item.productName || item.name}
                            </span>
                            <span className="font-semibold">
                              ${totalPrice.toFixed(2)} → $
                              {Math.max(0, finalPrice).toFixed(2)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Button
                className="w-full"
                onClick={handleApplyDiscount}
                disabled={
                  applyingDiscount || !discountRate || discountRate <= 0
                }
              >
                {applyingDiscount ? "Applying Discount..." : "Apply Discount"}
              </Button>
            </TabsContent>

            {/* Set Final Price */}
            <TabsContent value="finalPrice" className="space-y-6">
              <Card size="sm">
                <CardContent className="pt-0">
                  <div className="flex gap-2">
                    {[
                      {
                        val: "total",
                        title: "Total Price Override",
                        sub: "Set one total price for all items",
                      },
                      {
                        val: "individual",
                        title: "Individual Pricing",
                        sub: "Set price for each item separately",
                      },
                    ].map((opt) => (
                      <button
                        key={opt.val}
                        onClick={() => {
                          setPricingMethod(opt.val);
                          setTotalPriceOverride("");
                          setFinalPrices({});
                        }}
                        className={`flex-1 rounded-lg border p-3 text-center transition-colors ${
                          pricingMethod === opt.val
                            ? "border-primary bg-primary/10"
                            : "border-border hover:bg-muted"
                        }`}
                      >
                        <div className="font-medium">{opt.title}</div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {opt.sub}
                        </div>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {pricingMethod === "total" && (
                <Card size="sm">
                  <CardHeader>
                    <CardTitle>Total Price Override</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>
                        Selected Total: $
                        {selectedItemsData
                          .reduce((sum, item) => {
                            const samePackageInCart = (
                              filteredLineItems || []
                            ).filter(
                              (li) =>
                                (li.packageId || li.id) ===
                                (item.packageId || item.id)
                            );
                            const posInGroup = samePackageInCart.findIndex(
                              (li) =>
                                (li.appMaintainedId || li.key) ===
                                (item.appMaintainedId || item.key)
                            );
                            const samePackageInSummary =
                              getOrderSummary?.data?.nonPackagedLineItems?.filter(
                                (o) => o.createdLineItem.packageId === item.id
                              );
                            const summaryItem =
                              samePackageInSummary?.[
                                posInGroup >= 0 ? posInGroup : 0
                              ];
                            const unitPrice =
                              summaryItem?.createdLineItem?.finalUnitPrice ??
                              summaryItem?.createdLineItem?.initialUnitPrice ??
                              item.price ??
                              0;
                            return (
                              sum + unitPrice * (item.purchaseQuantity ?? 0)
                            );
                          }, 0)
                          .toFixed(2)}
                      </span>
                      <span className="text-muted-foreground/50">|</span>
                      <span>
                        Order Total: $
                        {(getOrderSummary?.data?.finalPayable ?? 0).toFixed(2)}
                      </span>
                    </div>
                    <Input
                      type="number"
                      value={totalPriceOverride}
                      min={0}
                      step="0.01"
                      onChange={(e) => setTotalPriceOverride(e.target.value)}
                      placeholder="Enter new total price"
                    />

                    {totalPriceOverride &&
                      parseFloat(totalPriceOverride) > 0 && (
                        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-900 dark:bg-blue-950">
                          <div className="mb-2 text-xs font-semibold text-blue-800 dark:text-blue-300">
                            Price Distribution Preview:
                          </div>
                          <div className="space-y-1">
                            {selectedItemsData.map((item) => {
                              const unitPrice = unitPriceOf(item);
                              const currentTotal =
                                unitPrice * item.purchaseQuantity;
                              const totalBefore = selectedItemsData.reduce(
                                (sum, i) =>
                                  sum + unitPriceOf(i) * i.purchaseQuantity,
                                0
                              );
                              const diff =
                                totalBefore - parseFloat(totalPriceOverride);
                              const discountForItem =
                                (diff * currentTotal) / totalBefore;
                              const finalPrice = Math.max(
                                0,
                                currentTotal - discountForItem
                              );
                              return (
                                <div
                                  key={item.id}
                                  className="flex justify-between text-xs"
                                >
                                  <span className="max-w-[200px] truncate">
                                    {item.productName || item.name}
                                  </span>
                                  <span className="font-semibold">
                                    ${currentTotal.toFixed(2)} → $
                                    {finalPrice.toFixed(2)}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                  </CardContent>
                </Card>
              )}

              {pricingMethod === "individual" && (
                <>
                  <Card size="sm">
                    <CardHeader>
                      <CardTitle>Price Mode</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-3">
                        {[
                          {
                            val: "unit",
                            title: "Set Unit Price",
                            sub: "Set the price per unit for each item",
                          },
                          {
                            val: "total",
                            title: "Set Total Price",
                            sub: "Set the total price for all quantities of each item",
                          },
                        ].map((opt) => (
                          <label
                            key={opt.val}
                            className="flex w-full cursor-pointer items-start gap-2"
                          >
                            <input
                              type="radio"
                              name="priceMode"
                              value={opt.val}
                              checked={priceMode === opt.val}
                              onChange={() => {
                                setPriceMode(opt.val);
                                setFinalPrices({});
                              }}
                              className="mt-1"
                            />
                            <span>
                              <span className="block font-medium">
                                {opt.title}
                              </span>
                              <span className="block text-xs text-muted-foreground">
                                {opt.sub}
                              </span>
                            </span>
                          </label>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card size="sm">
                    <CardHeader>
                      <CardTitle>
                        {priceMode === "unit"
                          ? "Set Unit Prices"
                          : "Set Total Prices"}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="max-h-96 space-y-3 overflow-y-auto">
                        {selectedItemsData.map((item) => {
                          const unitPrice = unitPriceOf(item);
                          const totalPrice = unitPrice * item.purchaseQuantity;
                          const priceManuallySet = hasFinalPrice(item.id);
                          return (
                            <div
                              key={item.id}
                              className={`rounded-lg border bg-card p-4 ${
                                priceManuallySet
                                  ? "border-green-500"
                                  : "border-border"
                              }`}
                            >
                              <div className="mb-3 flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <div className="text-sm font-medium">
                                      {item.productName || item.name}
                                    </div>
                                    {priceManuallySet && (
                                      <Badge className="flex items-center gap-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                        <CheckCircle2 className="size-3" /> Price
                                        Override Active
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="mt-1 text-xs text-muted-foreground">
                                    Current: Qty {item.purchaseQuantity} × $
                                    {unitPrice.toFixed(2)} = $
                                    {totalPrice.toFixed(2)}
                                  </div>
                                </div>
                              </div>

                              <Label className="mb-1 text-xs">
                                {priceMode === "unit"
                                  ? "New Unit Price ($)"
                                  : "New Total Price ($)"}
                              </Label>
                              <Input
                                type="number"
                                value={finalPrices[item.id] ?? ""}
                                min={0}
                                step="0.01"
                                onChange={(e) =>
                                  handleFinalPriceChange(
                                    item.id,
                                    e.target.value === ""
                                      ? ""
                                      : parseFloat(e.target.value)
                                  )
                                }
                                placeholder={
                                  priceMode === "unit"
                                    ? `Current: $${unitPrice.toFixed(2)}`
                                    : `Current: $${totalPrice.toFixed(2)}`
                                }
                              />
                              {finalPrices[item.id] &&
                                finalPrices[item.id] > 0 && (
                                  <div className="mt-2 text-xs text-green-600">
                                    {priceMode === "unit"
                                      ? `New Total: $${(
                                          finalPrices[item.id] *
                                          item.purchaseQuantity
                                        ).toFixed(2)}`
                                      : `New Unit Price: $${(
                                          finalPrices[item.id] /
                                          item.purchaseQuantity
                                        ).toFixed(2)}`}
                                  </div>
                                )}
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}

              <Button
                className="w-full"
                onClick={handleSetFinalPrice}
                disabled={
                  settingFinalPrice ||
                  (pricingMethod === "total"
                    ? !(totalPriceOverride && parseFloat(totalPriceOverride) > 0)
                    : !Object.keys(finalPrices).some(
                        (key) => finalPrices[key] && finalPrices[key] > 0
                      ))
                }
              >
                {settingFinalPrice
                  ? "Setting Final Price..."
                  : "Set Final Price"}
              </Button>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Drawer>
  );
}
