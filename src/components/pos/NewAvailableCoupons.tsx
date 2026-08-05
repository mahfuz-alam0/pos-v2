"use client";

import { useEffect, useState } from "react";
import { Tag } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import { getQuoteForSales } from "@/services/sales/getQuoteforSales";
import { findApplicableCoupons } from "@/services/sales/applicableCoupons";
import { quoteApiManager } from "@/utils/quoteApiManager";
import { updateSalesDetail } from "@/store/slices/salesDetailSlice";
import { getQuoteForSale } from "@/store/slices/quoteForSaleSlice";
import useDiscountTypes from "@/hooks/useDiscountTypes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import Drawer from "@/components/ui/Drawer";

/**
 * Order-level coupon picker. Lists applicable coupons for the current sale,
 * supports one-tap apply and manual code entry, and surfaces quote-side
 * errorMessages (loyalty/coupon/deals) after applying.
 *
 * Props:
 *   compact — render a small toolbar trigger button instead of a full row.
 *   inline  — render just the coupon list + manual-code entry directly
 *             (no trigger button, no own Drawer) — for dropping straight
 *             into a host drawer/page, e.g. Tablet Mode's Discounts & Taxes.
 *
 * Self-contained: reads salesDetail + quoteForSale.lineItems + customer from
 * Redux, applies via updateSalesDetail(couponId) + re-quote.
 */
export default function NewAvailableCoupons({
  compact = false,
  inline = false,
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [couponData, setCouponData] = useState([]);
  const [couponsLoading, setCouponsLoading] = useState(false);
  const [couponsLoaded, setCouponsLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [couponRecord, setCouponRecord] = useState(null);
  const [prevCustomerId, setPrevCustomerId] = useState(null);

  const quoteBody = useSelector((state: any) => state?.salesDetail);
  const selectedCustomer = useSelector(
    (state: any) => state.customer?.selectedCustomer
  );
  const getOrderSummary = useSelector((state: any) => state?.quoteForSale?.lineItems);
  const dispatch = useDispatch();
  const { discountTypes } = useDiscountTypes();

  const couponApplied = getOrderSummary?.data?.couponDiscountApplied > 0;
  const couponDisabled = !discountTypes.includes("COUPON");

  useEffect(() => {
    if (!couponApplied) setCouponCode("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getOrderSummary]);

  const fetchApplicableCoupons = async () => {
    setCouponsLoading(true);
    const customerId = selectedCustomer?.id || quoteBody.customerId;
    try {
      const res = await findApplicableCoupons({
        shopId: JSON.parse(localStorage.getItem("shopId")),
        saleSource: "INTERNAL",
        deliveryMethod: quoteBody.deliveryMethod,
        customerId,
        customerTypeId: quoteBody.customerTypeId,
        customerGroupId: quoteBody.customerGroupId,
      });
      setCouponData(res.data?.data?.coupons || []);
      setCouponsLoaded(true);
    } catch (error) {
      if (error?.message === "Not allowed while in share mode") {
        toast.error("Cannot apply coupons while share mode is on");
      } else {
        toast.error(error?.message || "Something went wrong");
      }
    } finally {
      setCouponsLoading(false);
    }
  };

  useEffect(() => {
    fetchApplicableCoupons();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const customerId = selectedCustomer?.id || quoteBody.customerId;
    if (customerId && customerId !== prevCustomerId) {
      fetchApplicableCoupons();
      setPrevCustomerId(customerId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCustomer?.id, quoteBody.customerId]);

  useEffect(() => {
    const customerId = selectedCustomer?.id || quoteBody?.customerId;
    if (customerId && !couponsLoaded && !couponsLoading) {
      fetchApplicableCoupons();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCustomer, quoteBody, couponsLoaded, couponsLoading]);

  // Backfill couponCode when a coupon is applied (e.g. restored from queue)
  // but the human-readable code wasn't saved alongside the couponId.
  useEffect(() => {
    if (!quoteBody?.couponId || quoteBody?.couponCode || !couponsLoaded) return;
    const matchedCoupon = couponData.find(
      (c) => c.couponId === quoteBody.couponId
    );
    if (matchedCoupon?.couponCode) {
      dispatch(updateSalesDetail({ couponCode: matchedCoupon.couponCode }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quoteBody?.couponId, quoteBody?.couponCode, couponData, couponsLoaded]);

  const applyCoupon = (record, closeAfter = false) => {
    if (!record) return;
    const updatedQuoteBody = { ...quoteBody, couponId: record.couponId };
    setLoading(true);
    quoteApiManager
      .call(getQuoteForSales, updatedQuoteBody, "available-coupons-apply")
      .then((res) => {
        dispatch(
          updateSalesDetail({
            couponId: record.couponId,
            couponCode: record.couponCode,
          })
        );
        dispatch(getQuoteForSale(res.data));
        if (closeAfter) setDrawerOpen(false);

        const errorMessages = res.data.data.errorMessages || {};
        const hasErrors =
          errorMessages.loyaltyPoints?.length > 0 ||
          errorMessages.coupon?.length > 0 ||
          Object.keys(errorMessages.regularDeals || {}).length > 0 ||
          Object.keys(errorMessages.bogoDeals || {}).length > 0;

        if (hasErrors) {
          [
            ...(errorMessages.loyaltyPoints || []).map(
              (m) => `Loyalty Points: ${m}`
            ),
            ...(errorMessages.coupon || []).map((m) => `Coupons: ${m}`),
            ...Object.values(errorMessages.regularDeals || {})
              .flat()
              .map((m) => `Deals: ${m}`),
            ...Object.values(errorMessages.bogoDeals || {})
              .flat()
              .map((m) => `BOGO Deals: ${m}`),
          ].forEach((err, i) =>
            setTimeout(() => toast.error(err), i * 500)
          );
        } else {
          toast.success("Coupon applied successfully");
        }
      })
      .catch(() => toast.error("Failed to apply coupon"))
      .finally(() => setLoading(false));
  };

  const removeCoupon = () => {
    quoteApiManager
      .call(
        getQuoteForSales,
        { ...quoteBody, couponId: null },
        "available-coupons-remove"
      )
      .then((res) => {
        dispatch(getQuoteForSale(res.data));
        dispatch(updateSalesDetail({ couponId: null }));
        toast.success("Coupon removed successfully");
      });
  };

  const appliedCoupon = couponData.find((c) => c.couponId === quoteBody.couponId);
  const appliedRateLabel = appliedCoupon
    ? appliedCoupon.discountType === "PERCENTAGE"
      ? `${appliedCoupon.discountRate}% off`
      : `$${Number(appliedCoupon.discountRate).toFixed(2)} off`
    : null;

  // Shared between the "inline" render (dropped straight into a host page —
  // e.g. Tablet Mode's Discounts & Taxes drawer) and the component's own
  // Available Coupons drawer (compact/default trigger modes).
  const couponListContent = (
    <>
      <div className="mb-6">
        <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-gray-400">
          Available Coupons
        </p>
        {couponsLoading ? (
          <div className="flex justify-center py-10 text-sm text-muted-foreground">
            Loading...
          </div>
        ) : couponData.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {couponData.map((coupon) => {
              const disabled = couponDisabled || couponApplied;
              const notApplicable = coupon.usageRule?.isApplicable === false;
              const isCouponDisabled = disabled || notApplicable;

              const discountLabel =
                coupon.discountType === "PERCENTAGE"
                  ? `${coupon.discountRate}% off`
                  : `$${Number(coupon.discountRate).toFixed(2)} off`;

              const maxDiscount = coupon.usageRule?.maximumApplicableDiscount;
              const minOrder = coupon.usageRule?.minimumOrderAmount;
              const totalLimit = coupon.usageRule?.totalUsageLimit;
              const perUserLimit = coupon.usageRule?.totalUsageLimitPerUser;

              return (
                <div
                  key={coupon.couponCode}
                  className={`flex flex-col overflow-hidden rounded-xl border-[1.5px] ${
                    isCouponDisabled
                      ? "border-neutral-200 bg-neutral-50 opacity-60"
                      : "border-[#52c41a] bg-[#f6ffed]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 px-3.5 py-3">
                    <div className="flex flex-col gap-1">
                      <span
                        className={`w-fit rounded-md border border-dashed px-2.5 py-0.5 font-mono text-sm font-bold tracking-wider ${
                          isCouponDisabled
                            ? "border-neutral-300 bg-neutral-100 text-neutral-400"
                            : "border-green-300 bg-green-100 text-green-700"
                        }`}
                      >
                        {coupon.couponCode}
                      </span>
                      <span
                        className={`text-sm font-bold ${
                          isCouponDisabled
                            ? "text-neutral-500"
                            : "text-green-600"
                        }`}
                      >
                        {discountLabel}
                      </span>
                    </div>
                    {notApplicable && (
                      <Badge className="shrink-0 bg-orange-100 text-orange-700">
                        Not Applicable
                      </Badge>
                    )}
                  </div>

                  {(minOrder?.isEnabled ||
                    maxDiscount?.isEnabled ||
                    perUserLimit?.isEnabled ||
                    totalLimit?.isEnabled ||
                    coupon.allowedStacks?.length > 0 ||
                    coupon.description) && (
                    <div
                      className={`flex flex-1 flex-col gap-1 border-t px-3.5 py-2 text-[11px] text-gray-500 ${
                        isCouponDisabled
                          ? "border-neutral-200 bg-neutral-50"
                          : "border-green-200 bg-green-50"
                      }`}
                    >
                      {minOrder?.isEnabled && (
                        <span>
                          <span className="font-semibold text-gray-600">
                            Min order:
                          </span>{" "}
                          ${Number(minOrder.value).toFixed(2)}
                        </span>
                      )}
                      {maxDiscount?.isEnabled && (
                        <span>
                          <span className="font-semibold text-gray-600">
                            Max discount:
                          </span>{" "}
                          ${Number(maxDiscount.value).toFixed(2)}
                        </span>
                      )}
                      {perUserLimit?.isEnabled && (
                        <span>
                          <span className="font-semibold text-gray-600">
                            Per user:
                          </span>{" "}
                          {perUserLimit.value}x
                        </span>
                      )}
                      {totalLimit?.isEnabled && (
                        <span>
                          <span className="font-semibold text-gray-600">
                            Usage:
                          </span>{" "}
                          {coupon.onGoingTotalUsage ?? 0} / {totalLimit.value}
                        </span>
                      )}
                      {coupon.allowedStacks?.length > 0 && (
                        <span className="flex flex-wrap items-center gap-1">
                          <span className="font-semibold text-gray-600">
                            Stacks with:
                          </span>
                          {coupon.allowedStacks.map((s) => (
                            <Badge
                              key={s}
                              className="bg-blue-100 px-1.5 py-0 text-[10px] text-blue-700"
                            >
                              {s.replace(/_/g, " ")}
                            </Badge>
                          ))}
                        </span>
                      )}
                      {coupon.description && (
                        <span className="italic text-gray-400">
                          {coupon.description}
                        </span>
                      )}
                    </div>
                  )}

                  <div
                    className={`border-t px-3.5 py-2.5 ${
                      isCouponDisabled
                        ? "border-neutral-200"
                        : "border-green-200"
                    }`}
                  >
                    <Button
                      disabled={isCouponDisabled}
                      className="w-full bg-green-600 hover:bg-green-700"
                      onClick={() => {
                        if (!isCouponDisabled) {
                          setCouponCode(coupon.couponCode);
                          setCouponRecord(coupon);
                          applyCoupon(coupon, true);
                        }
                      }}
                    >
                      Apply
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
            No coupons available for this order
          </div>
        )}
      </div>

      <div className="border-t border-border pt-4">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
          Or enter a code manually
        </p>
        <div className="flex items-start gap-2">
          <Input
            placeholder="Coupon code"
            value={couponCode}
            disabled={couponApplied}
            onChange={(e) => {
              setCouponCode(e.target.value);
              setCouponRecord(
                couponData.find((c) => c.couponCode === e.target.value) ||
                  null
              );
            }}
            onKeyDown={(e) => {
              if (
                e.key === "Enter" &&
                couponRecord &&
                !couponDisabled &&
                !couponApplied
              ) {
                applyCoupon(couponRecord, true);
              }
            }}
          />
          <span
            title={
              couponDisabled
                ? "Coupon discount source is disabled in settings"
                : couponApplied
                  ? "A coupon is already applied"
                  : ""
            }
          >
            <Button
              disabled={couponDisabled || couponApplied || !couponCode}
              onClick={() => applyCoupon(couponRecord, true)}
            >
              {loading ? "..." : "Apply"}
            </Button>
          </span>
        </div>

        {couponApplied && (
          <div className="mt-3 flex items-center justify-between rounded-lg border border-green-200 bg-green-50 px-3 py-2">
            <span className="text-sm font-medium text-green-700">
              Coupon applied — -$
              {Number(getOrderSummary?.data?.couponDiscountApplied).toFixed(
                2
              )}
            </span>
            <button
              onClick={removeCoupon}
              className="rounded border border-red-300 px-2 py-0.5 text-xs font-medium text-red-500 transition-colors hover:bg-red-50 hover:text-red-700"
            >
              Remove
            </button>
          </div>
        )}
      </div>
    </>
  );

  if (inline) {
    return couponListContent;
  }

  return (
    <>
      {compact ? (
        <button
          onClick={() => setDrawerOpen(true)}
          className={`h-full w-full rounded-md px-2 py-1 text-xs font-medium shadow-sm transition-all ${
            couponApplied
              ? "bg-green-600 text-white"
              : "bg-gradient-to-br from-[#f59e0b] to-[#d97706] text-white"
          }`}
        >
          {couponApplied ? "Coupon ✓" : "Coupons"}
        </button>
      ) : (
        <div className="flex items-center justify-between py-2">
          <Button onClick={() => setDrawerOpen(true)}>Coupons</Button>

          {couponApplied && (
            <div className="flex items-center gap-2 text-[#E86F51]">
              <div className="flex items-center gap-1">
                {appliedCoupon && (
                  <span className="rounded border border-green-200 bg-green-50 px-1.5 py-0.5 text-xs font-semibold text-green-600">
                    {appliedCoupon.couponCode}
                  </span>
                )}
                {appliedRateLabel && (
                  <span className="text-xs font-medium text-gray-500">
                    {appliedRateLabel}
                  </span>
                )}
                <span className="text-sm font-medium">
                  - $
                  {Number(
                    getOrderSummary?.data?.couponDiscountApplied
                  ).toFixed(2)}
                </span>
              </div>
              <button
                onClick={removeCoupon}
                className="rounded border border-[#E86F51] px-2 py-0.5 text-xs font-medium text-[#E86F51] transition-colors hover:bg-red-50 hover:text-red-700"
              >
                Remove
              </button>
            </div>
          )}
        </div>
      )}

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} side="right" size={700}>
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h3 className="flex items-center gap-2 text-base font-semibold">
              <Tag className="size-4" />
              Available Coupons
            </h3>
            <button
              onClick={() => setDrawerOpen(false)}
              className="text-muted-foreground"
            >
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-auto p-6">{couponListContent}</div>
        </div>
      </Drawer>
    </>
  );
}
