"use client";

import { useCallback, useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { toast } from "sonner";

import { listSaleDrafts } from "@/services/sales/listSaleDrafts";
import { getSingleDraft } from "@/services/sales/getSingleDraft";
import { deleteSaleDraft } from "@/services/sales/deleteSaleDraft";
import { getSingleCustomer } from "@/services/customers/getSingleCustomer";

import { updateSalesDetail } from "@/store/slices/salesDetailSlice";
import { setSelectedCustomer } from "@/store/slices/customerSlice";
import {
  addLineItemsAction,
  resetAddedLineITems,
} from "@/store/slices/lineItemsSlice";
import { addToCart, resetCartForSale } from "@/store/slices/cartSlice";
import { getQuoteForSale } from "@/store/slices/quoteForSaleSlice";

import { Button } from "@/components/ui/button";
import Drawer from "@/components/ui/Drawer";

const DELIVERY_LABELS = {
  IN_STORE: { label: "In Store", cls: "bg-green-100 text-green-700" },
  PICK_UP: { label: "Pickup", cls: "bg-blue-100 text-blue-700" },
  DELIVERY: { label: "Delivery", cls: "bg-purple-100 text-purple-700" },
};

const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleString("en-US", {
        month: "2-digit",
        day: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

export default function PosDrafts({ isActive, switchTab }) {
  const dispatch = useDispatch();
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [viewDrawerOpen, setViewDrawerOpen] = useState(false);
  const [viewDraft, setViewDraft] = useState(null);
  const [viewQuote, setViewQuote] = useState(null);
  const [viewCustomer, setViewCustomer] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [deleteLoadingId, setDeleteLoadingId] = useState(null);

  const shopId =
    typeof window !== "undefined"
      ? JSON.parse(localStorage.getItem("shopId"))
      : null;

  const fetchDrafts = useCallback(async () => {
    if (!shopId) return;
    setLoading(true);
    try {
      const res = await listSaleDrafts(shopId);
      setDrafts(res?.data?.data?.drafts || []);
    } catch (error) {
      toast.error(error?.message || "Failed to load drafts.");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopId]);

  useEffect(() => {
    if (isActive) fetchDrafts();
  }, [isActive, fetchDrafts]);

  // Returns { draft, quote }
  const fetchSingleDraft = async (id) => {
    const res = await getSingleDraft(shopId, id);
    return {
      draft: res?.data?.data?.draft || null,
      quote: res?.data?.data?.quote || null,
    };
  };

  const handleView = async (record) => {
    setViewDrawerOpen(true);
    setViewDraft(null);
    setViewQuote(null);
    setViewCustomer(null);
    setViewLoading(true);
    try {
      const { draft, quote } = await fetchSingleDraft(record.id);
      setViewDraft(draft);
      setViewQuote(quote);
      const customerId = draft?.draftJSON?.customerId;
      if (customerId) {
        try {
          const customerRes = await getSingleCustomer(customerId);
          const customer =
            customerRes?.data?.data?.customer || customerRes?.data?.data;
          if (customer) setViewCustomer(customer);
        } catch (_) {}
      }
    } catch (error) {
      toast.error(error?.message || "Failed to fetch draft.");
      setViewDrawerOpen(false);
    } finally {
      setViewLoading(false);
    }
  };

  const handlePull = async (record) => {
    setActionLoadingId(record.id);
    try {
      const { draft, quote } = await fetchSingleDraft(record.id);
      if (!draft) throw { message: "Draft data not found" };

      const draftJSON = draft.draftJSON || {};

      // 1. Restore localStorage session values from draftJSON
      if (draftJSON.registerId)
        localStorage.setItem("registerId", draftJSON.registerId);
      if (draftJSON.drawerId)
        localStorage.setItem("drawerId", draftJSON.drawerId);
      if (draftJSON.customerInQueueId)
        localStorage.setItem(
          "customerInQueueId",
          JSON.stringify(draftJSON.customerInQueueId)
        );

      // 2. Fetch and restore customer
      if (draftJSON.customerId) {
        try {
          const customerRes = await getSingleCustomer(draftJSON.customerId);
          const customer =
            customerRes?.data?.data?.customer || customerRes?.data?.data;
          if (customer) {
            dispatch(setSelectedCustomer(customer));
            localStorage.setItem(
              "customerGroups",
              JSON.stringify(customer?.customerGroups || [])
            );
          }
        } catch (_) {
          // customer fetch failed — salesDetail still has customerId
        }
      }

      // 3. Clear any stale cart state from previous sessions
      dispatch(resetAddedLineITems());
      dispatch(resetCartForSale());

      // 4. Build cart items — prefer draftJSON.lineItems, fallback to quote's createdLineItem
      let cartItems =
        Array.isArray(draftJSON.lineItems) && draftJSON.lineItems.length > 0
          ? draftJSON.lineItems
          : (quote?.nonPackagedLineItems || [])
              .map((item) => item.createdLineItem)
              .filter(Boolean)
              .map((cli) => ({
                id: cli.packageId,
                key: cli.packageId,
                packageId: cli.packageId,
                inventoryId: cli.inventoryId,
                productId: cli.snapShotData?.productId,
                productName: cli.snapShotData?.productName || "",
                price: cli.initialUnitPrice ?? cli.finalUnitPrice ?? 0,
                purchaseQuantity: cli.purchaseQuantity || 1,
                deals: {
                  name: cli.snapShotData?.productName,
                  price: cli.initialUnitPrice ?? cli.finalUnitPrice,
                  packageId: cli.packageId,
                },
                disabledDiscountSources: [],
                shouldAllowDecimalValue:
                  cli.snapShotData?.displayQtyMeasurementPolicy
                    ?.shouldAllowDecimalValue ?? false,
                displayQtyMeasurementPolicy:
                  cli.snapShotData?.displayQtyMeasurementPolicy || null,
                sellableUomShortForm:
                  cli.snapShotData?.displayQtyShortForm ||
                  cli.snapShotData?.purchaseUoMShortForm,
                projectQtyConversionRate:
                  cli.snapShotData?.displayQtyConversionRateUsed || 1,
                quantityLeft:
                  cli.snapShotData?.currentTotalAvailableQuantity ??
                  cli.purchaseQuantity,
              }));

      // 5. Restore full salesDetail (customer IDs, register, drawer, delivery, etc.)
      dispatch(
        updateSalesDetail({
          ...draftJSON,
          lineItems: cartItems,
        })
      );

      // 6. Restore cart line items
      if (cartItems.length > 0) {
        dispatch(addLineItemsAction(cartItems));
        dispatch(addToCart(cartItems));
      }

      // 7. Restore the pre-calculated quote so right panel renders immediately
      if (quote) {
        dispatch(getQuoteForSale({ success: true, data: quote }));
      }

      // 8. Delete draft after pulling
      await deleteSaleDraft(shopId, record.id);
      setDrafts((prev) => prev.filter((d) => d.id !== record.id));

      toast.success("Draft loaded into cart.");
      switchTab("1");
    } catch (error) {
      toast.error(error?.message || "Failed to pull draft.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDelete = async (record) => {
    setDeleteLoadingId(record.id);
    try {
      await deleteSaleDraft(shopId, record.id);
      setDrafts((prev) => prev.filter((d) => d.id !== record.id));
      toast.success("Draft deleted.");
    } catch (error) {
      toast.error(error?.message || "Failed to delete draft.");
    } finally {
      setDeleteLoadingId(null);
    }
  };

  // Drawer derived data
  const draftJSON = viewDraft?.draftJSON || {};
  const quoteLineItems = viewQuote?.nonPackagedLineItems || [];
  const deliveryInfo = DELIVERY_LABELS[draftJSON.deliveryMethod] || {
    label: draftJSON.deliveryMethod || "—",
    cls: "bg-muted text-muted-foreground",
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Saved Drafts</h2>
          <p className="text-sm text-muted-foreground">
            {drafts.length} draft{drafts.length !== 1 ? "s" : ""} saved
          </p>
        </div>
        <Button variant="outline" onClick={fetchDrafts} disabled={loading}>
          {loading ? "Refreshing…" : "Refresh"}
        </Button>
      </div>

      {!loading && drafts.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground">
          No drafts saved yet
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-4 py-2 font-medium">Draft ID</th>
                <th className="px-4 py-2 font-medium">Customer</th>
                <th className="px-4 py-2 text-center font-medium">
                  Total Price
                </th>
                <th className="px-4 py-2 text-center font-medium">Created At</th>
                <th className="px-4 py-2 text-center font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {drafts.map((record) => (
                <tr key={record.id}>
                  <td className="px-4 py-2">
                    <span className="rounded bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground">
                      {record.id}
                    </span>
                  </td>
                  <td className="px-4 py-2">{record.customerName || "—"}</td>
                  <td className="px-4 py-2 text-center">
                    {record.totalPrice != null ? (
                      <span className="font-semibold text-green-600">
                        ${Number(record.totalPrice).toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-center text-muted-foreground">
                    {fmtDate(record.createdAt)}
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex justify-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleView(record)}
                      >
                        View
                      </Button>
                      <Button
                        size="sm"
                        disabled={actionLoadingId === record.id}
                        onClick={() => handlePull(record)}
                      >
                        {actionLoadingId === record.id ? "Pulling…" : "Pull"}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={deleteLoadingId === record.id}
                        onClick={() => handleDelete(record)}
                      >
                        {deleteLoadingId === record.id ? "…" : "Delete"}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* View Draft Drawer */}
      <Drawer
        open={viewDrawerOpen}
        onClose={() => {
          setViewDrawerOpen(false);
          setViewDraft(null);
          setViewQuote(null);
          setViewCustomer(null);
        }}
        side="right"
        size={520}
        className="overflow-auto"
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="text-lg font-semibold">Draft Details</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewDrawerOpen(false)}
            >
              Close
            </Button>
          </div>

          <div className="flex-1 overflow-auto p-4">
            {viewLoading ? (
              <div className="flex h-48 items-center justify-center text-muted-foreground">
                Loading…
              </div>
            ) : viewDraft ? (
              <div>
                {/* Summary cards */}
                <div className="mb-5 grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-border p-3">
                    <div className="text-xs text-muted-foreground">
                      Final Payable
                    </div>
                    <div className="text-xl font-bold">
                      $
                      {Number(
                        viewQuote?.finalPayable ?? viewDraft.totalPrice ?? 0
                      ).toFixed(2)}
                    </div>
                    {viewQuote?.finalSubTotal !== viewQuote?.finalPayable && (
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        Subtotal: $
                        {Number(viewQuote?.finalSubTotal ?? 0).toFixed(2)}
                      </div>
                    )}
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <div className="text-xs text-muted-foreground">Items</div>
                    <div className="text-xl font-bold">
                      {quoteLineItems.length}
                    </div>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <div className="mb-1 text-xs text-muted-foreground">
                      Order Type
                    </div>
                    <span
                      className={`rounded px-2 py-0.5 text-xs ${deliveryInfo.cls}`}
                    >
                      {deliveryInfo.label}
                    </span>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <div className="text-xs text-muted-foreground">Created</div>
                    <div className="text-sm font-semibold">
                      {fmtDate(viewDraft.createdAt)}
                    </div>
                  </div>
                </div>

                {/* Customer */}
                {viewCustomer && (
                  <div className="mb-5">
                    <div className="mb-2 font-semibold">Customer</div>
                    <div className="flex items-center gap-3 rounded-lg border border-border p-3">
                      {viewCustomer.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={viewCustomer.avatarUrl}
                          alt={viewCustomer.firstName}
                          className="h-11 w-11 shrink-0 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground">
                          {(viewCustomer.firstName?.[0] || "").toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold">
                          {viewCustomer.firstName} {viewCustomer.lastName}
                        </div>
                        {viewCustomer.email && (
                          <div className="text-xs text-muted-foreground">
                            {viewCustomer.email}
                          </div>
                        )}
                        {viewCustomer.phone && (
                          <div className="text-xs text-muted-foreground">
                            {viewCustomer.phone}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Line items */}
                <div className="mb-3 font-semibold">
                  Line Items ({quoteLineItems.length})
                </div>
                {quoteLineItems.length === 0 ? (
                  <div className="py-6 text-center text-muted-foreground">
                    No items in this draft
                  </div>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    {quoteLineItems.map((lineItem, idx) => {
                      const li = lineItem.createdLineItem;
                      const snap = li?.snapShotData || {};
                      const hasDiscount = li?.unitDiscountApplied > 0;
                      const qtyLabel = snap.displayQtyShortForm
                        ? `${
                            snap.displayQtyConversionRateUsed != null
                              ? (
                                  li.purchaseQuantity *
                                  snap.displayQtyConversionRateUsed
                                ).toFixed(2)
                              : li.purchaseQuantity
                          } ${snap.displayQtyShortForm}`
                        : `${li?.purchaseQuantity ?? "—"} ${
                            snap.purchaseUoMShortForm || ""
                          }`.trim();

                      return (
                        <div
                          key={snap.packageId || idx}
                          className="flex gap-3 rounded-lg border border-border p-3"
                        >
                          {snap.productThumbNail ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={snap.productThumbNail}
                              alt={snap.productName}
                              className="h-13 w-13 shrink-0 rounded object-cover"
                              style={{ width: 52, height: 52 }}
                            />
                          ) : (
                            <div
                              className="flex shrink-0 items-center justify-center rounded bg-muted text-muted-foreground"
                              style={{ width: 52, height: 52 }}
                            >
                              ?
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="truncate font-semibold">
                              {snap.productName || "—"}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {snap.brandName && <span>{snap.brandName}</span>}
                              {snap.categoryName && (
                                <span> · {snap.categoryName}</span>
                              )}
                            </div>
                            <div className="text-xs">
                              Qty: <strong>{qtyLabel}</strong>
                            </div>
                            {hasDiscount && (
                              <div className="text-xs text-green-600">
                                Discount: −$
                                {Number(li.totalDiscountApplied).toFixed(2)}
                              </div>
                            )}
                          </div>
                          <div className="shrink-0 text-right">
                            <div className="font-bold">
                              ${Number(li?.finalTotalPrice ?? 0).toFixed(2)}
                            </div>
                            {hasDiscount && (
                              <div className="text-xs text-muted-foreground line-through">
                                ${Number(li?.initialTotalPrice ?? 0).toFixed(2)}
                              </div>
                            )}
                            <div className="text-xs text-muted-foreground">
                              ${Number(li?.finalUnitPrice ?? 0).toFixed(2)}/unit
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {(draftJSON.internalNote || viewQuote?.tipGiven > 0) && (
                  <div className="mt-4 flex flex-col gap-1.5">
                    {viewQuote?.tipGiven > 0 && (
                      <div className="flex justify-between rounded border border-border px-3 py-2 text-sm">
                        <span>Tip Given</span>
                        <span className="font-semibold">
                          ${Number(viewQuote.tipGiven).toFixed(2)}
                        </span>
                      </div>
                    )}
                    {draftJSON.internalNote && (
                      <div className="rounded border border-border px-3 py-2 text-sm">
                        <strong>Note:</strong> {draftJSON.internalNote}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="py-10 text-center text-muted-foreground">
                No data available
              </div>
            )}
          </div>

          {viewDraft && (
            <div className="flex justify-end gap-2 border-t border-border px-4 py-3">
              <Button
                variant="outline"
                onClick={() => setViewDrawerOpen(false)}
              >
                Close
              </Button>
              <Button
                disabled={actionLoadingId === viewDraft?.id}
                onClick={() => {
                  setViewDrawerOpen(false);
                  handlePull(viewDraft);
                }}
              >
                Pull to Cart
              </Button>
            </div>
          )}
        </div>
      </Drawer>
    </div>
  );
}
