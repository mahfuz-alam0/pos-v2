"use client";

import { Fragment, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Trash2,
  Minus,
  Plus,
  Info,
  ChevronDown,
  ChevronRight,
  SplitSquareHorizontal,
  FileText,
  Package,
  Tag,
  Percent,
} from "lucide-react";
import { toast } from "sonner";
import { useShop } from "@/context/shop-context";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import Drawer from "@/components/ui/Drawer";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import DiscountFinalPriceDrawer from "@/components/pos/DiscountFinalPriceDrawer";
import DealCard from "@/components/pos/DealCard";
import BogoDealCard from "@/components/pos/BogoDealCard";
import TieredDealCard from "@/components/pos/TieredDealCard";
import PrintLabelModal from "@/components/pos/PrintLabelModal";

// Discount breakdown "source" -> the enum the quote API accepts in a line
// item's disabledDiscountSources. Sources with no entry here (e.g. tiered
// pricing) can't be individually toggled off.
const DISCOUNT_SOURCE_TO_API_ENUM = {
  DEAL: "DEAL",
  COUPON: "COUPON",
  LOYALTY_POINTS: "LOYALTY_POINTS",
  CUSTOMER_TYPE: "CUSTOMER_TYPE",
  CUSTOMER_TYPE_PRICING: "CUSTOMER_TYPE",
  MISCELLANEOUS: "MISCELLANEOUS",
  MANUAL_LINE_ITEM_DISCOUNT: "MISCELLANEOUS",
};

import { addToCart } from "@/store/slices/cartSlice";
import { addLineItemsAction } from "@/store/slices/lineItemsSlice";
import { updateSalesDetail } from "@/store/slices/salesDetailSlice";
import { getQuoteForSale } from "@/store/slices/quoteForSaleSlice";
import { getQuoteForSales } from "@/services/sales/getQuoteforSales";
import { getBulkDeals } from "@/services/sales/getBulkDeals";
import { findApplicableDeals } from "@/services/sales/applicableDeals";
import { quoteApiManager } from "@/utils/quoteApiManager";
import { buildLineItemAssignment } from "@/utils/lineItemMatching";

// Ported from components/products-cart.js — the in-progress cart table.
//
// Scope: this is the product/cart slice only. The old 3200-line file also
// carried deal drawers and the tablet product browser; those are separate
// concerns and are intentionally NOT ported here (see report). Split, per-line
// print label, and the discount-breakdown toggle are ported (see below) —
// label *content* is a fixed layout, not legacy's admin-configurable template
// engine (see PackageLabel.tsx). Preserved exactly: the display<->backend quantity math
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
  const { shopId } = useShop();
  const cart = useSelector((state: any) => state?.cart?.cart) || [];
  const quoteBody = useSelector((state: any) => state?.salesDetail);
  const saleDetail = useSelector((state: any) => state?.saleData) || {};
  const getOrderSummary = useSelector(
    (state: any) => state?.quoteForSale?.lineItems,
  );
  const [counters, setCounters] = useState({});

  // Two cart lines can share the same package (added separately at
  // different quantities) — this assigns each cart line its own quote
  // response entry instead of every same-package line resolving to the
  // first match. See lineItemMatching.ts.
  const lineItemAssignment = useMemo(
    () =>
      buildLineItemAssignment(
        cart,
        getOrderSummary?.data?.nonPackagedLineItems,
      ),
    [cart, getOrderSummary?.data?.nonPackagedLineItems],
  );

  // Bulk selection -> Apply Deal / Apply Discount / Set Final Price toolbar,
  // ported from products-cart.js's selectedItemsForDiscount + the
  // Apply Deal/Discount/Final Price buttons.
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [discountTab, setDiscountTab] = useState<
    "discount" | "finalPrice" | null
  >(null);
  const [dealDrawerOpen, setDealDrawerOpen] = useState(false);
  const [bulkDeals, setBulkDeals] = useState([]);
  const [bulkDealsLoading, setBulkDealsLoading] = useState(false);

  // Per-row expand -> single-item "Available Deals", ported from
  // posTableDeals.js's expandedRowRender (antd Table's built-in expand, here
  // a plain toggle since we're not using antd).
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [rowDeals, setRowDeals] = useState([]);
  const [rowBogoDeals, setRowBogoDeals] = useState([]);
  const [rowTieredDeals, setRowTieredDeals] = useState([]);
  const [rowDealsLoading, setRowDealsLoading] = useState(false);

  // Split one cart line into two (e.g. 5 units -> 3 kept + 2 split off),
  // ported from products-cart.js's Split modal.
  const [splitRecord, setSplitRecord] = useState<any>(null);
  const [splitCount, setSplitCount] = useState("");

  // Print Label modal — Exit Label / Package Label for a single cart line.
  const [printLabelRecord, setPrintLabelRecord] = useState<any>(null);

  // Editing is locked once an existing sale is loaded, same as the old file.
  const isLocked = Object.keys(saleDetail).length > 0;

  const toggleExpand = (record) => {
    if (expandedKey === record.key) {
      setExpandedKey(null);
      return;
    }
    setExpandedKey(record.key);
    setRowDeals([]);
    setRowBogoDeals([]);
    setRowTieredDeals([]);
    setRowDealsLoading(true);
    const unitPriceToTarget =
      lineItemAssignment.get(record.key)?.createdLineItem?.initialUnitPrice ??
      record.price;
    findApplicableDeals({
      shopId: JSON.parse(localStorage.getItem("shopId") || "null"),
      saleSource: "INTERNAL",
      deliveryMethod: quoteBody?.deliveryMethod || "IN_STORE",
      customerId: quoteBody?.customerId,
      customerTypeId: quoteBody?.customerTypeId,
      customerGroupId: quoteBody?.customerGroupId,
      lineItems: [
        {
          productId: record.productId,
          packageId: record.id,
          unitPriceToTarget,
        },
      ],
    })
      .then((res) => {
        const applicableDeals = res?.data?.data?.deals?.applicableDeals;
        setRowDeals(applicableDeals?.regularDeals || []);
        setRowBogoDeals(applicableDeals?.bogoDeals || []);
        setRowTieredDeals(applicableDeals?.tieredDeals || []);
      })
      .catch(() => toast.error("Failed to load available deals"))
      .finally(() => setRowDealsLoading(false));
  };

  const allSelected = cart.length > 0 && selectedKeys.length === cart.length;
  const toggleSelectAll = () =>
    setSelectedKeys(allSelected ? [] : cart.map((r) => r.key));

  const toggleSelected = (key) =>
    setSelectedKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );

  const openBulkDeals = () => {
    const selectedItems = cart.filter((item) =>
      selectedKeys.includes(item.key),
    );
    setDealDrawerOpen(true);
    setBulkDealsLoading(true);
    getBulkDeals({
      shopId: JSON.parse(localStorage.getItem("shopId") || "null"),
      saleSource: "EXTERNAL",
      deliveryMethod: quoteBody?.deliveryMethod || "IN_STORE",
      customerId: quoteBody?.customerId,
      customerTypeId: quoteBody?.customerTypeId,
      customerGroupId: quoteBody?.customerGroupId,
      lineItems: selectedItems.map((item) => ({
        productId: item.productId,
        packageId: item.id,
        unitPriceToTarget: item.price,
      })),
    })
      .then((res) => setBulkDeals(res?.data?.data?.regularDeals || []))
      .catch(() => toast.error("Failed to load available deals"))
      .finally(() => setBulkDealsLoading(false));
  };

  // shouldAllowDecimal comes from the order-summary line item's
  // displayQtyMeasurementPolicy, falling back to the cart record's flag.
  const getShouldAllowDecimal = (record) => {
    const lineItem = lineItemAssignment.get(record.key);
    const policyFlag =
      lineItem?.createdLineItem?.snapShotData?.displayQtyMeasurementPolicy
        ?.shouldAllowDecimalValue;
    if (policyFlag !== undefined) return policyFlag === true;
    return record.shouldAllowDecimalValue === true;
  };

  const refreshQuote = (updatedLineItems, overrides = {}) => {
    const updatedQuoteBody = {
      ...quoteBody,
      lineItems: updatedLineItems,
      ...overrides,
    };
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
        : item,
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
    // Deals are matched by productId/packageId, not by line-item key, so a
    // stale entry would otherwise show as still "Applied" if this same
    // product gets added back to the cart later.
    const stillInCart = updatedLineItems.some(
      (item) => item.productId === record.productId,
    );
    const updatedApplicableDeals = stillInCart
      ? quoteBody?.applicableRegularDeals
      : quoteBody?.applicableRegularDeals?.filter(
          (d) => d.productId !== record.productId,
        );
    dispatch(addLineItemsAction(updatedLineItems));
    dispatch(addToCart(updatedLineItems));
    dispatch(
      updateSalesDetail({
        lineItems: updatedLineItems,
        applicableRegularDeals: updatedApplicableDeals,
      }),
    );
    setCounters((c) => {
      const next = { ...c };
      delete next[record.key];
      return next;
    });
    refreshQuote(updatedLineItems, {
      applicableRegularDeals: updatedApplicableDeals,
    });
  };

  const openSplit = (record) => {
    setSplitRecord(record);
    setSplitCount("");
  };

  const handleSplit = () => {
    const count = parseFloat(splitCount);
    if (!splitRecord || !count || count <= 0) return;

    const conversionRate = splitRecord.projectQtyConversionRate || 1;
    const totalBackendQty = splitRecord.purchaseQuantity || 1;
    const splitOffBackendQty = count * conversionRate;
    const remainingBackendQty = totalBackendQty - splitOffBackendQty;
    if (remainingBackendQty <= 0 || splitOffBackendQty <= 0) return;

    const splitOffId = crypto.randomUUID();
    const splitOffItem = {
      ...splitRecord,
      key: splitOffId,
      appMaintainedId: splitOffId,
      purchaseQuantity: splitOffBackendQty,
    };

    const updatedLineItems = cart.flatMap((item) =>
      item.key === splitRecord.key
        ? [{ ...item, purchaseQuantity: remainingBackendQty }, splitOffItem]
        : [item],
    );

    dispatch(addLineItemsAction(updatedLineItems));
    dispatch(addToCart(updatedLineItems));
    dispatch(updateSalesDetail({ lineItems: updatedLineItems }));
    refreshQuote(updatedLineItems);

    setSplitRecord(null);
    setSplitCount("");
  };

  // Toggle a single discount source (deal/coupon/loyalty/etc.) off or back on
  // for one cart line, ported from posTableDeals.js's DiscountBreakdownTable.
  const toggleDiscountSource = (record, source, enabled) => {
    const apiEnum = DISCOUNT_SOURCE_TO_API_ENUM[source];
    if (!apiEnum) return;

    const updatedLineItems = cart.map((item) => {
      if (item.key !== record.key) return item;
      const existing = item.disabledDiscountSources || [];
      const nextSources = enabled
        ? existing.filter((s) => s !== apiEnum)
        : [...new Set([...existing, apiEnum])];
      return { ...item, disabledDiscountSources: nextSources };
    });

    dispatch(addLineItemsAction(updatedLineItems));
    dispatch(addToCart(updatedLineItems));
    dispatch(updateSalesDetail({ lineItems: updatedLineItems }));
    refreshQuote(updatedLineItems);
  };

  // A deal/coupon/loyalty applied anywhere on this sale that targets this
  // product — same "Promo" indicator rule as legacy's Product column.
  const hasPromo = (record) =>
    quoteBody?.couponId != null ||
    quoteBody?.loyaltyPointsClaimed !== 0 ||
    quoteBody?.applicableRegularDeals?.some(
      (d) => d.productId === record?.productId,
    );

  const orderSummaryItemFor = (record) => lineItemAssignment.get(record.key);

  const unitPriceOf = (record) =>
    orderSummaryItemFor(record)?.createdLineItem?.initialUnitPrice ??
    record.price;

  // Total reflects any applied deal/discount — finalUnitPrice falls back to
  // the (pre-discount) unit price when nothing has been applied.
  const effectiveUnitPriceOf = (record) =>
    orderSummaryItemFor(record)?.createdLineItem?.finalUnitPrice ??
    unitPriceOf(record);

  const discountBreakdownFor = (record) =>
    orderSummaryItemFor(record)?.createdLineItem?.discountBreakDownHierarchy ||
    [];

  const advertisedPackageIdOf = (record) =>
    orderSummaryItemFor(record)?.createdLineItem?.snapShotData
      ?.advertisedPackageId ?? record.id;

  const displayQty = (record) => {
    if (counters[record.key] !== undefined) return counters[record.key];
    const conversionRate = record?.projectQtyConversionRate || 1;
    return record.purchaseQuantity
      ? record.purchaseQuantity / conversionRate
      : 1;
  };

  if (cart.length === 0) {
    return (
      <div className="flex items-center gap-2.5 rounded-xl bg-sky-50 px-4 py-3.5 text-base font-medium text-sky-900 ring-1 ring-sky-200 dark:bg-sky-950/60 dark:text-sky-200 dark:ring-sky-900">
        <Info className="size-5 flex-shrink-0" />
        No items in cart
      </div>
    );
  }

  return (
    <div className="w-full">
      {!isLocked && selectedKeys.length > 0 && (
        <div className="mb-3 flex items-center gap-3 rounded-xl bg-primary px-4 py-3">
          <span className="flex size-8 flex-shrink-0 items-center justify-center rounded-full bg-primary-foreground text-sm font-bold text-primary">
            {selectedKeys.length}
          </span>
          <span className="text-base font-medium text-primary-foreground">
            selected
          </span>
          <div className="ml-auto flex gap-2">
            <Button
              variant="secondary"
              className="h-11 rounded-lg text-base"
              onClick={openBulkDeals}>
              Apply Deal
            </Button>
            <Button
              variant="secondary"
              className="h-11 rounded-lg text-base"
              onClick={() => setDiscountTab("discount")}>
              Apply Discount
            </Button>
            <Button
              variant="secondary"
              className="h-11 rounded-lg text-base"
              onClick={() => setDiscountTab("finalPrice")}>
              Set Final Price
            </Button>
          </div>
        </div>
      )}

      <div className="w-full overflow-x-auto rounded-xl ring-1 ring-foreground/10">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 text-left">
              {!isLocked && <th className="w-11 px-2 py-3.5" />}
              {!isLocked && (
                <th className="w-11 px-2 py-3.5">
                  <Checkbox
                    className="size-5"
                    checked={allSelected}
                    indeterminate={!allSelected && selectedKeys.length > 0}
                    onCheckedChange={toggleSelectAll}
                    aria-label="Select all items"
                  />
                </th>
              )}
              <th className="px-3 py-3.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Product
              </th>
              <th className="px-3 py-3.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Price
              </th>
              <th className="px-3 py-3.5 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Qty
              </th>
              <th className="px-3 py-3.5 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {cart.map((record, i) => {
              const isExpandedRow = expandedKey === record.key;
              const zebra =
                i % 2 === 1
                  ? "bg-stone-50 dark:bg-stone-900/40"
                  : "bg-background";
              return (
                <Fragment key={record.key ?? record.id}>
                  <tr
                    className={`${zebra} shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] transition-colors hover:bg-primary/3`}>
                    {!isLocked && (
                      <td className="px-2 py-3">
                        <button
                          type="button"
                          aria-label={
                            isExpandedRow ? "Collapse" : "Show available deals"
                          }
                          onClick={() => toggleExpand(record)}
                          className={`flex size-10 items-center justify-center rounded-full transition-colors ${
                            isExpandedRow
                              ? "bg-primary/15 text-primary"
                              : "text-muted-foreground hover:bg-muted"
                          }`}>
                          {isExpandedRow ? (
                            <ChevronDown className="size-5" />
                          ) : (
                            <ChevronRight className="size-5" />
                          )}
                        </button>
                      </td>
                    )}
                    {!isLocked && (
                      <td className="px-2 py-3">
                        <Checkbox
                          className="size-5"
                          checked={selectedKeys.includes(record.key)}
                          onCheckedChange={() => toggleSelected(record.key)}
                        />
                      </td>
                    )}
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-base font-semibold text-foreground">
                          {record?.productName}
                        </span>
                        {hasPromo(record) && (
                          <Badge className="h-6 border-transparent px-2.5 text-sm bg-green-600/10 text-green-700 dark:bg-green-500/15 dark:text-green-400">
                            Promo
                          </Badge>
                        )}
                      </div>
                      {advertisedPackageIdOf(record) && (
                        <div className="mt-1 flex items-center gap-1 font-mono text-xs text-muted-foreground">
                          <Package className="size-3.5" />
                          {advertisedPackageIdOf(record)}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <div className="text-xs text-muted-foreground">
                        Unit ${unitPriceOf(record).toFixed(2)}
                      </div>
                      <div className="text-lg font-bold text-foreground">
                        $
                        {(
                          effectiveUnitPriceOf(record) *
                          (record.purchaseQuantity ?? 1)
                        ).toFixed(2)}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-center gap-1.5 rounded-full bg-muted/60 p-1.5">
                        <Button
                          size="icon"
                          variant="secondary"
                          className="size-10 rounded-full"
                          disabled={isLocked}
                          onClick={() => handleDecrement(record)}>
                          <Minus className="size-5" />
                        </Button>
                        <Input
                          value={displayQty(record)}
                          onChange={(e) =>
                            handleQuantityChange(record, e.target.value)
                          }
                          disabled={isLocked}
                          inputMode={
                            getShouldAllowDecimal(record)
                              ? "decimal"
                              : "numeric"
                          }
                          className="h-10 w-16 rounded-full border-0 bg-transparent text-center text-base font-semibold shadow-none"
                        />
                        <Button
                          size="icon"
                          variant="secondary"
                          className="size-10 rounded-full"
                          disabled={isLocked}
                          onClick={() => handleIncrement(record)}>
                          <Plus className="size-5" />
                        </Button>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right">
                      {!isLocked && (
                        <div className="flex items-center justify-end gap-2">
                          <Tooltip>
                            <TooltipTrigger
                              render={
                                <button
                                  type="button"
                                  aria-label="Print Label"
                                  className="inline-flex size-11 items-center justify-center rounded-full bg-sky-500/10 text-sky-600 transition-all hover:scale-105 hover:bg-sky-500/20 dark:bg-sky-500/15 dark:text-sky-400"
                                  onClick={() => setPrintLabelRecord(record)}>
                                  <FileText className="size-5" />
                                </button>
                              }
                            />
                            <TooltipContent>Print Label</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger
                              render={
                                <button
                                  type="button"
                                  aria-label="Split"
                                  className="inline-flex size-11 items-center justify-center rounded-full bg-violet-500/10 text-violet-600 transition-all hover:scale-105 hover:bg-violet-500/20 dark:bg-violet-500/15 dark:text-violet-400"
                                  onClick={() => openSplit(record)}>
                                  <SplitSquareHorizontal className="size-5" />
                                </button>
                              }
                            />
                            <TooltipContent>Split</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger
                              render={
                                <button
                                  type="button"
                                  aria-label="Remove"
                                  className="inline-flex size-11 items-center justify-center rounded-full bg-destructive/10 text-destructive transition-all hover:scale-105 hover:bg-destructive/20"
                                  onClick={() => handleRemove(record)}>
                                  <Trash2 className="size-5" />
                                </button>
                              }
                            />
                            <TooltipContent>Remove</TooltipContent>
                          </Tooltip>
                        </div>
                      )}
                    </td>
                  </tr>
                  {isExpandedRow && (
                    <tr className={zebra}>
                      <td
                        colSpan={6}
                        className="px-4 pb-4 pt-1 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)]">
                        <div className="rounded-xl bg-muted/40 p-4">
                          <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            <Tag className="size-4" />
                            Available Deals
                          </div>
                          {rowDealsLoading ? (
                            <div className="text-sm text-muted-foreground">
                              Loading deals…
                            </div>
                          ) : (
                            <DealCard
                              deals={rowDeals}
                              productRecord={null}
                              onDealApplied={() => setExpandedKey(null)}
                            />
                          )}

                          {!rowDealsLoading && rowBogoDeals.length > 0 && (
                            <div className="mt-4">
                              <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                <Tag className="size-4" />
                                Available BOGO Deals
                              </div>
                              <BogoDealCard
                                bogoDeals={rowBogoDeals}
                                productRecord={record}
                                onDealApplied={() => setExpandedKey(null)}
                              />
                            </div>
                          )}

                          {!rowDealsLoading && rowTieredDeals.length > 0 && (
                            <div className="mt-4">
                              <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                <Tag className="size-4" />
                                Available Tiered Deals
                              </div>
                              <TieredDealCard
                                tieredDeals={rowTieredDeals}
                                productRecord={record}
                                onDealApplied={() => setExpandedKey(null)}
                              />
                            </div>
                          )}

                          {discountBreakdownFor(record).length > 0 && (
                            <div className="mt-4">
                              <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                <Percent className="size-4" />
                                Available Discounts
                              </div>
                              <div className="space-y-2">
                                {discountBreakdownFor(record).map((d, di) => {
                                  const isTiered =
                                    d.source === "TIERED_PRICING";
                                  const isManual =
                                    d.source === "MANUAL_LINE_ITEM_DISCOUNT";
                                  const hasApiMapping = Boolean(
                                    DISCOUNT_SOURCE_TO_API_ENUM[d.source],
                                  );
                                  const locked = isTiered || !hasApiMapping;
                                  return (
                                    <div
                                      key={d.source ?? di}
                                      className="flex flex-wrap items-center gap-3 rounded-lg bg-background px-4 py-3.5 ring-1 ring-foreground/6">
                                      <div className="text-lg font-bold text-foreground">
                                        {d.totalDiscountApplied != null
                                          ? `$${Number(d.totalDiscountApplied).toFixed(2)}`
                                          : "-"}
                                      </div>
                                      <Badge
                                        variant="outline"
                                        className="h-6 px-2.5 text-sm font-semibold">
                                        {isTiered
                                          ? "N/A"
                                          : d.discountRateType === "PERCENTAGE"
                                            ? `${d.discountRate}%`
                                            : `$${d.discountRate}`}
                                      </Badge>
                                      <div className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
                                        {d.notes || "-"}
                                      </div>
                                      {isManual ? (
                                        <span className="rounded-full bg-muted px-3 py-1.5 text-xs font-semibold text-muted-foreground">
                                          Manual
                                        </span>
                                      ) : (
                                        <Switch
                                          disabled={locked}
                                          checked={
                                            locked ? true : !d.isDisabled
                                          }
                                          onCheckedChange={(checked) =>
                                            toggleDiscountSource(
                                              record,
                                              d.source,
                                              checked,
                                            )
                                          }
                                        />
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <DiscountFinalPriceDrawer
        visible={discountTab !== null}
        defaultTab={discountTab || "discount"}
        onClose={() => setDiscountTab(null)}
        selectedItems={selectedKeys}
        filteredLineItems={cart}
        getOrderSummary={getOrderSummary}
        onSuccess={() => setSelectedKeys([])}
      />

      <Drawer
        open={dealDrawerOpen}
        onClose={() => setDealDrawerOpen(false)}
        side="right"
        size={600}>
        <div className="flex h-full flex-col">
          <div className="border-b border-border px-4 py-3 text-base font-semibold">
            Available Deals
          </div>
          <div className="flex-1 overflow-auto p-4">
            {bulkDealsLoading ? (
              <div className="text-sm text-muted-foreground">
                Loading deals…
              </div>
            ) : (
              <DealCard
                deals={bulkDeals}
                productRecord={null}
                onDealApplied={() => {
                  setDealDrawerOpen(false);
                  setSelectedKeys([]);
                }}
              />
            )}
          </div>
        </div>
      </Drawer>

      <Dialog
        open={splitRecord != null}
        onOpenChange={(open) => !open && setSplitRecord(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Split &quot;{splitRecord?.productName}&quot;
            </DialogTitle>
          </DialogHeader>
          {splitRecord &&
            (() => {
              const conversionRate = splitRecord.projectQtyConversionRate || 1;
              const uom =
                splitRecord.projectQtyUomShortForm ||
                splitRecord.sellableUomShortForm ||
                "";
              const displayQtyTotal =
                (splitRecord.purchaseQuantity || 1) / conversionRate;
              const shouldAllowDecimal = getShouldAllowDecimal(splitRecord);
              return (
                <div className="space-y-4">
                  <div className="flex items-center justify-between rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
                    <span className="text-muted-foreground">
                      Current Quantity
                    </span>
                    <span className="font-semibold">
                      {displayQtyTotal} {uom}
                    </span>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      Split Quantity
                    </label>
                    <Input
                      value={splitCount}
                      onChange={(e) => setSplitCount(e.target.value)}
                      inputMode={shouldAllowDecimal ? "decimal" : "numeric"}
                      placeholder="Enter qty"
                    />
                  </div>
                </div>
              );
            })()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSplitRecord(null)}>
              Cancel
            </Button>
            <Button
              disabled={
                !splitRecord ||
                !(parseFloat(splitCount) > 0) ||
                parseFloat(splitCount) >=
                  (splitRecord.purchaseQuantity || 1) /
                    (splitRecord.projectQtyConversionRate || 1)
              }
              onClick={handleSplit}>
              Confirm Split
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PrintLabelModal
        open={printLabelRecord != null}
        onClose={() => setPrintLabelRecord(null)}
        packageId={printLabelRecord?.id}
        shopId={shopId}
      />
    </div>
  );
}
