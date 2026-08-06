"use client";

import { useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import {
  ShoppingCart,
  Tag,
  X,
  FileText,
  TriangleAlert,
  Pencil,
  UserPlus,
  MapPin,
  ChevronLeft,
} from "lucide-react";

import Drawer from "@/components/ui/Drawer";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import ProductsCart from "@/components/pos/ProductsCart";
import ProductPromoTaxes from "@/components/pos/ProductPromoTaxes";
import TotalCard from "@/components/pos/TotalCard";
import NewAvailableCoupons from "@/components/pos/NewAvailableCoupons";
import { CustomerLimits } from "@/components/pos/CustomerPanelPopovers";
import NotesSection from "@/components/front-desk/NotesSection";

import { addMiscallenousCharges } from "@/store/slices/miscChargesSlice";
import { updateSalesDetail } from "@/store/slices/salesDetailSlice";
import { getQuoteForSale } from "@/store/slices/quoteForSaleSlice";
import { getQuoteForSales } from "@/services/sales/getQuoteforSales";
import { quoteApiManager } from "@/utils/quoteApiManager";

const NAVY = "#00152A";
const NAVY_CARD = "#001D3D";
const BLUE = "#0190DD";

// Every createdLineItem across the quote — non-packaged plus bundle
// parent/child — used to roll the per-line tax + discount breakdowns
// (ProductPromoTaxes/TaxBreakdown.tsx's per-item source of truth) up into a
// cart-level summary.
function flattenLineItems(orderData) {
  return [
    ...(orderData?.nonPackagedLineItems || []),
    ...(orderData?.packagedLineItems || []).flatMap((p) => [
      ...(p.parentLineItems || []),
      ...(p.childLineItems || []),
    ]),
  ]
    .map((item) => item.createdLineItem)
    .filter(Boolean);
}

/**
 * Compact checkout summary for the Tablet Mode POS page — attach/remove
 * customer, an "Item(s) in cart" bar that opens the full cart management
 * table (ProductsCart, unchanged — same deals/discount-toggle/split/print
 * label functionality as the desktop POS), a "Discount(s) applied" bar that
 * opens the same per-item discount breakdown used elsewhere
 * (ProductPromoTaxes), an aggregated tax breakdown, and a "Choose Payment
 * Type" button that opens the real checkout flow (TotalCard, unmodified —
 * payment sidebar, drafts, order creation, share-mode PIN, etc.).
 */
export default function TabletModeCartSummary({
  selectedCustomer,
  fullSelectedCustomer,
  customerLocked,
  hasSale,
  onAttachCustomer,
  onRemoveCustomer,
  onAddNewCustomer,
  onEditCustomer,
  deliverySubType,
  deliveryType,
  customerDeliveryLocations,
  deliverySummary,
  onOpenDeliveryAddress,
  refreshOrders,
  onDraftSaved,
}: any) {
  const dispatch = useDispatch();
  const cart = useSelector((state: any) => state?.cart?.cart) || [];
  const quoteBody = useSelector((state: any) => state?.salesDetail);
  const getOrderSummary = useSelector(
    (state: any) => state?.quoteForSale?.lineItems,
  );
  const currentMiscallenousCharges = useSelector(
    (state: any) => state?.miscCharges?.miscCharges || [],
  );

  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  const [discountsDrawerOpen, setDiscountsDrawerOpen] = useState(false);
  const [notesDrawerOpen, setNotesDrawerOpen] = useState(false);
  // Portal target for TotalCard's PaymentStatusRow (Cash/status/Send-to-
  // Fulfillment row) — rendered here, above Attach Customer, instead of
  // tucked inside the checkout drawer.
  const [statusRowNode, setStatusRowNode] = useState<HTMLDivElement | null>(
    null,
  );
  // Portal target for TotalCard's "Complete Order" button — pinned at the
  // end, below Subtotal/Tax/Total, instead of crammed into the status row
  // above (its label is long — "Complete Order (Total: $X.XX)" — and
  // doesn't fit next to the order-status controls there).
  const [checkoutButtonNode, setCheckoutButtonNode] =
    useState<HTMLDivElement | null>(null);
  // Portal target for TotalCard's Loyalty Points panel — surfaced inside
  // the Discounts & Taxes drawer (alongside Coupons) instead of the hidden
  // TotalCard body, so it's reachable from Tablet Mode at all.
  const [loyaltyPointsNode, setLoyaltyPointsNode] =
    useState<HTMLDivElement | null>(null);

  const orderData = getOrderSummary?.data;
  const lineItems = useMemo(() => flattenLineItems(orderData), [orderData]);

  const subtotal = useMemo(
    () =>
      lineItems.reduce((sum, item) => sum + (item.totalPriceBeforeTax || 0), 0),
    [lineItems],
  );

  const taxBreakdown = useMemo(() => {
    const byName = new Map<string, number>();
    lineItems.forEach((item) => {
      (item.snapShotData?.taxesApplied || []).forEach((tax) => {
        byName.set(tax.name, (byName.get(tax.name) || 0) + (tax.amount || 0));
      });
    });
    return Array.from(byName, ([name, amount]) => ({ name, amount }));
  }, [lineItems]);

  const { discountCount, discountTotal } = useMemo(() => {
    const sources = new Set<string>();
    let total = 0;
    lineItems.forEach((item) => {
      (item.discountBreakDownHierarchy || []).forEach((d) => {
        if (d.isDisabled) return;
        sources.add(d.source);
        total += d.totalDiscountApplied || 0;
      });
    });
    if ((orderData?.packagedLineItems?.length || 0) > 0)
      sources.add("BUNDLE_DEAL");
    return { discountCount: sources.size, discountTotal: total };
  }, [lineItems, orderData?.packagedLineItems]);

  const total = orderData?.finalPayable ?? subtotal;
  const itemCount = cart.length;
  const cartEmpty = itemCount === 0;

  const customerName = selectedCustomer
    ? `${selectedCustomer.firstName || ""} ${selectedCustomer.lastName || ""}`.trim()
    : "";

  // ---- Discount removal handlers (same contract ProductPromoTaxes/TotalCard use) ----
  const reQuote = async (updatedQuoteBody, source) => {
    const res = await quoteApiManager.call(
      getQuoteForSales,
      updatedQuoteBody,
      source,
    );
    if (res?.data) dispatch(getQuoteForSale(res.data));
    return res;
  };

  const deleteMiscCharge = async (id) => {
    const updated = currentMiscallenousCharges.filter(
      (item) => item?.taxProfileId !== id,
    );
    dispatch(addMiscallenousCharges(updated));
    dispatch(updateSalesDetail({ miscCharges: updated }));
    try {
      await reQuote(
        { ...quoteBody, miscCharges: updated },
        "tabletMode-delete-misc-charge",
      );
    } catch (e) {
      console.error("delete misc charge", e);
    }
  };

  const deleteMiscallenousDiscount = async () => {
    dispatch(updateSalesDetail({ miscDiscount: null }));
    try {
      await reQuote(
        { ...quoteBody, miscDiscount: null },
        "tabletMode-delete-misc-discount",
      );
      toast.success("Miscellaneous discount removed");
    } catch (e) {
      toast.error("Error removing miscellaneous discount");
    }
  };

  const deleteLoyaltyPoints = async () => {
    dispatch(updateSalesDetail({ loyaltyPointsClaimed: 0 }));
    try {
      await reQuote(
        { ...quoteBody, loyaltyPointsClaimed: 0 },
        "tabletMode-delete-loyalty",
      );
      toast.success("Loyalty points removed");
    } catch (e) {
      console.error("delete loyalty", e);
    }
  };

  const removeDealFromSelectedProduct = async (data) => {
    if (!data?.packageId || !data?.productId || !data?.dealId) return;
    const updated = (quoteBody?.applicableRegularDeals || []).filter(
      (item) =>
        !(
          item.dealId === data.dealId &&
          item.packageId === data.packageId &&
          item.productId === data.productId
        ),
    );
    dispatch(updateSalesDetail({ applicableRegularDeals: updated }));
    try {
      await reQuote(
        { ...quoteBody, applicableRegularDeals: updated },
        "tabletMode-remove-deal",
      );
      toast.success("Deal removed");
    } catch (e) {
      toast.error("Error removing deal");
    }
  };

  const getMiscDiscountFromOrderData = (data) => {
    if (!data) return 0;
    return flattenLineItems(data)
      .flatMap((item) => item.discountBreakDownHierarchy || [])
      .filter((item) => item.source === "MISCELLANEOUS" && !item.isDisabled)
      .reduce((acc, item) => acc + (item.totalDiscountApplied || 0), 0);
  };

  return (
    <div
      className="flex h-full flex-col overflow-hidden rounded-lg text-white"
      style={{ background: NAVY }}>
      <div className="flex-1 space-y-3.5 overflow-y-auto p-4">
        {/* Cash / order-status row — portaled in from TotalCard, see below.
            data-mode="dark" forces its shadcn Select/Button pieces into this
            app's dark palette (same mechanism ProductSearch.tsx uses for
            CustomerCartSidebar) so they don't render with a stray light
            background against this navy sidebar. */}
        <div
          ref={setStatusRowNode}
          data-mode="dark"
          className="empty:hidden **:data-[slot=select-trigger]:rounded-xl **:data-[slot=select-trigger]:text-base [&_button:not([data-slot=select-trigger])]:h-12 [&_button:not([data-slot=select-trigger])]:rounded-xl [&_button:not([data-slot=select-trigger])]:text-base"
        />

        {/* Attach / attached customer */}
        {selectedCustomer ? (
          <div
            className="flex items-center gap-2 rounded-xl px-4 py-3.5"
            style={
              customerLocked
                ? {
                    background: "rgba(239,68,68,0.12)",
                    border: "1px solid rgba(239,68,68,0.6)",
                  }
                : {
                    background: NAVY_CARD,
                    border: "1px solid rgba(1,144,221,0.3)",
                  }
            }>
            <span
              className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-full text-lg font-bold"
              style={
                customerLocked
                  ? { background: "rgba(239,68,68,0.2)", color: "#f87171" }
                  : { background: "rgba(1,144,221,0.2)", color: BLUE }
              }>
              {(selectedCustomer.firstName || "?")[0].toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-base font-semibold">
                {customerName || "Customer"}
              </div>
              {customerLocked ? (
                <div className="truncate text-sm font-semibold text-red-400">
                  Customer is locked
                </div>
              ) : (
                selectedCustomer.customerType && (
                  <div className="truncate text-sm text-white/60">
                    {selectedCustomer.customerType}
                  </div>
                )
              )}
            </div>

            <div className="flex flex-shrink-0 items-center">
              {fullSelectedCustomer?.shouldWarnUser && (
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <button
                        type="button"
                        onClick={() => setNotesDrawerOpen(true)}
                        className="flex size-9 flex-shrink-0 items-center justify-center rounded-full text-amber-400 hover:bg-white/10"
                        aria-label="Cashier warning">
                        <TriangleAlert className="size-5" />
                      </button>
                    }
                  />
                  <TooltipContent>
                    {fullSelectedCustomer?.warningMessage || "Cashier warning"}
                  </TooltipContent>
                </Tooltip>
              )}

              <Tooltip>
                <TooltipTrigger
                  render={
                    <button
                      type="button"
                      onClick={() => setNotesDrawerOpen(true)}
                      className="flex size-9 flex-shrink-0 items-center justify-center rounded-full opacity-70 hover:bg-white/10 hover:opacity-100"
                      aria-label="Customer notes">
                      <FileText className="size-5" />
                    </button>
                  }
                />
                <TooltipContent>Notes</TooltipContent>
              </Tooltip>

              {onEditCustomer && (
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <button
                        type="button"
                        disabled={hasSale}
                        onClick={onEditCustomer}
                        className="flex size-9 flex-shrink-0 items-center justify-center rounded-full opacity-70 hover:bg-white/10 hover:opacity-100 disabled:opacity-30"
                        aria-label="Edit customer">
                        <Pencil className="size-5" />
                      </button>
                    }
                  />
                  <TooltipContent>Edit Customer</TooltipContent>
                </Tooltip>
              )}

              <button
                type="button"
                disabled={hasSale}
                onClick={onRemoveCustomer}
                className="flex size-9 flex-shrink-0 items-center justify-center rounded-full opacity-70 hover:bg-white/10 hover:opacity-100 disabled:opacity-30"
                aria-label="Remove customer">
                <X className="size-5" />
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-stretch gap-2">
              <button
                type="button"
                disabled={hasSale}
                onClick={onAttachCustomer}
                className="flex flex-1 items-center gap-2.5 rounded-xl px-4 py-3.5 text-base font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                style={{
                  background: NAVY_CARD,
                  border: "1px dashed rgba(1,144,221,0.5)",
                  color: BLUE,
                }}>
                <span
                  className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xl font-bold"
                  style={{ background: "rgba(1,144,221,0.2)" }}>
                  +
                </span>
                Customer
              </button>

              {onAddNewCustomer && (
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <button
                        type="button"
                        disabled={hasSale}
                        onClick={onAddNewCustomer}
                        className="flex w-14 flex-shrink-0 items-center justify-center rounded-xl transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                        style={{
                          background: NAVY_CARD,
                          border: "1px dashed rgba(1,144,221,0.5)",
                          color: BLUE,
                        }}
                        aria-label="New customer">
                        <UserPlus className="size-5" />
                      </button>
                    }
                  />
                  <TooltipContent>New Customer</TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>
        )}

        {/* Delivery address banner */}
        {quoteBody?.deliveryMethod === "DELIVERY" && selectedCustomer?.id && (
          <button
            type="button"
            onClick={onOpenDeliveryAddress}
            className="w-full rounded-xl px-3.5 py-3 text-left transition-colors"
            style={{
              border: deliverySummary
                ? "1.5px solid rgba(1,144,221,0.6)"
                : "1.5px dashed rgba(255,255,255,0.25)",
              background: deliverySummary ? "rgba(1,144,221,0.12)" : NAVY_CARD,
            }}>
            {deliverySummary ? (
              <>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <MapPin
                      className="size-4 flex-shrink-0"
                      style={{ color: BLUE }}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 truncate text-sm font-bold">
                        {deliverySummary.tag && (
                          <span
                            className="rounded px-1.5 py-0.5 text-[11px] font-semibold"
                            style={{
                              background: "rgba(1,144,221,0.25)",
                              color: BLUE,
                            }}>
                            {deliverySummary.tag}
                          </span>
                        )}
                        <span className="truncate">
                          {deliverySummary.address}
                        </span>
                      </div>
                      {(deliverySummary.state || deliverySummary.zipCode) && (
                        <div className="mt-0.5 text-xs text-white/60">
                          {[deliverySummary.state, deliverySummary.zipCode]
                            .filter(Boolean)
                            .join("  ·  ")}
                        </div>
                      )}
                    </div>
                  </div>
                  <span className="flex-shrink-0 rounded-md border border-white/20 bg-white/5 px-2 py-0.5 text-[11px] text-white/70">
                    Edit
                  </span>
                </div>
                {(deliverySummary.tierName || deliverySummary.slotLabel) && (
                  <div className="mt-2 flex flex-wrap gap-1.5 border-t border-white/10 pt-2">
                    {deliverySummary.tierName && (
                      <span className="rounded-md border border-orange-400/40 bg-orange-400/10 px-2 py-0.5 text-xs font-semibold text-orange-300">
                        🚚 {deliverySummary.tierName}
                        {deliverySummary.tierCharge > 0 &&
                          ` · +$${deliverySummary.tierCharge}`}
                      </span>
                    )}
                    {deliverySummary.slotLabel && (
                      <span className="rounded-md border border-purple-400/40 bg-purple-400/10 px-2 py-0.5 text-xs font-semibold text-purple-300">
                        🕐 {deliverySummary.slotLabel}
                      </span>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center gap-2">
                <MapPin className="size-4 flex-shrink-0 text-white/40" />
                <span className="flex-1 truncate text-sm text-white/70">
                  {customerDeliveryLocations?.length > 0
                    ? customerDeliveryLocations[0]?.streetAddress1 ||
                      customerDeliveryLocations[0]?.tag ||
                      "Delivery Address"
                    : "Set Delivery Address"}
                </span>
                <span className="flex-shrink-0 text-xs text-white/40">
                  Edit
                </span>
              </div>
            )}
          </button>
        )}

        {/* Items in cart */}
        <button
          type="button"
          disabled={cartEmpty}
          onClick={() => setCartDrawerOpen(true)}
          className="flex w-full items-center justify-between rounded-xl px-4 py-4 text-left transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
          style={{ background: BLUE }}>
          <span className="flex items-center gap-2.5 text-base font-semibold">
            <ShoppingCart className="size-6" />
            {itemCount} Item{itemCount === 1 ? "" : "s"} in cart
          </span>
          <span className="text-lg font-bold">${subtotal.toFixed(2)}</span>
        </button>

        {/* Discounts applied */}
        <button
          type="button"
          onClick={() => setDiscountsDrawerOpen(true)}
          className="flex w-full items-center justify-between rounded-xl px-4 py-4 text-left"
          style={{ background: "rgba(139,92,246,0.85)" }}>
          <span className="flex items-center gap-2.5 text-base font-semibold">
            <Tag className="size-6" />
            {discountCount} Discount{discountCount === 1 ? "" : "s"} applied
          </span>
          <span className="text-lg font-bold">${discountTotal.toFixed(2)}</span>
        </button>

        {/* Subtotal / taxes / total */}
        <div
          className="rounded-xl p-4"
          style={{ background: "rgba(255,255,255,0.04)" }}>
          <div className="flex items-center justify-between py-1.5 text-base">
            <span className="text-white/70">Subtotal</span>
            <span className="font-semibold">${subtotal.toFixed(2)}</span>
          </div>
          {taxBreakdown.map((tax) => (
            <div
              key={tax.name}
              className="flex items-center justify-between py-1.5 text-base">
              <span className="text-white/70">{tax.name}</span>
              <span className="font-semibold">${tax.amount.toFixed(2)}</span>
            </div>
          ))}
          <div
            className="mt-2.5 flex items-center justify-between border-t pt-2.5 text-xl"
            style={{ borderColor: "rgba(255,255,255,0.12)" }}>
            <span className="font-bold">Total</span>
            <span className="font-bold">${total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Complete Order — portaled in from TotalCard, see checkoutButtonNode */}
      <div
        ref={setCheckoutButtonNode}
        className="empty:hidden flex-shrink-0 p-4 [&_button]:h-14 [&_button]:text-lg"
      />

      {/* Customer notes — same component front-desk's CustomerDetailDrawer uses */}
      <Drawer
        open={notesDrawerOpen}
        onClose={() => setNotesDrawerOpen(false)}
        side="right"
        size={480}>
        <div className="flex h-full flex-col">
          <div className="border-b border-border px-6 py-4 text-base font-semibold">
            Customer Notes
          </div>
          <div className="flex-1 overflow-auto p-4">
            {notesDrawerOpen && selectedCustomer?.id && (
              <NotesSection customerId={selectedCustomer.id} />
            )}
          </div>
        </div>
      </Drawer>

      {/* Manage Cart Items — the exact same cart table used on the desktop POS,
          plus a Purchase Limits side panel (see CustomerPanelPopovers.tsx's
          "Per Visit Limits" popover, which this mirrors for Tablet Mode). */}
      <Drawer
        open={cartDrawerOpen}
        onClose={() => setCartDrawerOpen(false)}
        side="right"
        size="100vw">
        <div className="flex h-full flex-col">
          <div className="flex items-center gap-2 border-b border-border px-4 py-3 text-base font-semibold">
            <button
              type="button"
              onClick={() => setCartDrawerOpen(false)}
              aria-label="Back"
              className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground">
              <ChevronLeft className="size-5" />
            </button>
            Cart Items
          </div>
          <div className="flex min-h-0 flex-1 gap-4 overflow-hidden p-4">
            <div className="w-[25%] xl:w-[20%] max-w-96 flex-shrink-0 overflow-y-auto rounded-xl border border-border bg-muted/20 p-4">
              <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Purchase Limits
              </h3>
              {(fullSelectedCustomer || selectedCustomer)?.customerGroups
                ?.length > 0 ? (
                <CustomerLimits getOrderSummary={getOrderSummary} />
              ) : (
                <div className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                  Attach a customer to view purchase limits.
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1 overflow-auto">
              {cartDrawerOpen && <ProductsCart />}
            </div>
          </div>
        </div>
      </Drawer>

      {/* Discount / tax breakdown per line item */}
      <Drawer
        open={discountsDrawerOpen}
        onClose={() => setDiscountsDrawerOpen(false)}
        side="right"
        size="100vw">
        <div className="flex h-full flex-col">
          <div className="flex items-center gap-2 border-b border-border px-4 py-3 text-base font-semibold">
            <button
              type="button"
              onClick={() => setDiscountsDrawerOpen(false)}
              aria-label="Back"
              className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground">
              <ChevronLeft className="size-5" />
            </button>
            Discounts & Taxes
          </div>
          <div className="flex min-h-0 flex-1 gap-4 overflow-hidden p-4">
            {/* Coupons — same side-panel treatment as Cart Items' Purchase Limits */}
            <div className="w-[25%] xl:w-[20%] max-w-96 flex-shrink-0 overflow-y-auto rounded-xl border border-border bg-muted/20 p-4">
              <div className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                <Tag className="size-4" />
                Coupons
              </div>
              {selectedCustomer?.id || quoteBody?.customerId ? (
                discountsDrawerOpen && <NewAvailableCoupons inline />
              ) : (
                <div className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                  Attach a customer to view coupons.
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1 space-y-4 overflow-auto">
              {discountsDrawerOpen && (
                <>
                  <ProductPromoTaxes
                    currentAction={null}
                    getOrderSummary={getOrderSummary}
                    deleteMiscCharge={deleteMiscCharge}
                    setSubTotalValue={() => {}}
                    getMiscDiscountFromOrderData={getMiscDiscountFromOrderData}
                    deleteMiscallenousDiscount={deleteMiscallenousDiscount}
                    deleteLoyaltyPoints={deleteLoyaltyPoints}
                    removeDealFromSelectedProduct={removeDealFromSelectedProduct}
                  />
                  <div ref={setLoyaltyPointsNode} className="empty:hidden" />
                </>
              )}
            </div>
          </div>
        </div>
      </Drawer>

      {/* TotalCard stays mounted, just with no visible body of its own here —
          its PaymentStatusRow, Complete Order button, and Loyalty Points
          panel portal up into statusRowNode/checkoutButtonNode/
          loyaltyPointsNode above, and its PaymentSidebar portals straight to
          <body> (see PaymentSidebar.tsx), so none of that depends on this
          wrapper being visible. What's hidden along with it: QuickActionsRow
          (Draft/Misc/Notes/Tip) and the discount/tax line-item breakdown —
          the latter is still reachable via the "Discounts applied" bar
          above; Coupons is the full pickable list inline in this drawer
          (NewAvailableCoupons inline). */}
      <div className="hidden">
        <TotalCard
          statusRowContainer={statusRowNode}
          checkoutButtonContainer={checkoutButtonNode}
          loyaltyPointsContainer={loyaltyPointsNode}
          deliverySubType={deliverySubType}
          deliveryType={deliveryType}
          refreshOrders={refreshOrders}
          onDraftSaved={onDraftSaved}
        />
      </div>
    </div>
  );
}
