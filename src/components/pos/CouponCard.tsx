"use client";

import { useState, useEffect } from "react";
import { Info, ChevronLeft, ChevronRight } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import { getQuoteForSales } from "@/services/sales/getQuoteforSales";
import { quoteApiManager } from "@/utils/quoteApiManager";
import { updateSalesDetail } from "@/store/slices/salesDetailSlice";
import { getQuoteForSale } from "@/store/slices/quoteForSaleSlice";
import Drawer from "@/components/ui/Drawer";
import CouponDetails from "./CouponDetails";

/**
 * Per-product coupon carousel (2 tiles at a time). Applies/removes a single
 * order-level coupon (salesDetail.couponId) and re-quotes.
 *
 * Props:
 *   coupons — array of applicable coupon objects for the product.
 *
 * Reads salesDetail (quote body) + quoteForSale.lineItems from Redux; emits no
 * callbacks (self-contained, mirrors the old couponCard.js).
 */
export default function CouponCard({ coupons = [] }) {
  const [couponStates, setCouponStates] = useState({});
  const [visible, setVisible] = useState(false);
  const [coupon, setCouponDetails] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const quoteBody = useSelector((state: any) => state?.salesDetail);
  const dispatch = useDispatch();
  const getOrderSummary = useSelector((state: any) => state?.quoteForSale?.lineItems);

  // Reflect the currently-applied coupon (from the latest quote) into tile state.
  useEffect(() => {
    const couponId = getOrderSummary?.data?.couponId;
    if (couponId) {
      setCouponStates((prev) => ({ ...prev, [couponId]: { applied: true } }));
    } else {
      setCouponStates((prev) => {
        const updated = { ...prev };
        Object.keys(updated).forEach((id) => {
          updated[id].applied = false;
        });
        return updated;
      });
    }
  }, [getOrderSummary]);

  const handleCancel = () => setVisible(false);

  const handleShowCouponDetails = (item) => {
    setCouponDetails(item);
    setVisible(true);
  };

  const applyCouponToSelectedProduct = (item) => {
    const couponId = item.couponId;
    setCouponStates((prev) => ({ ...prev, [couponId]: { loading: true } }));

    dispatch(updateSalesDetail({ couponId: item.couponId }));
    quoteApiManager
      .call(
        getQuoteForSales,
        { ...quoteBody, couponId: item.couponId },
        "coupon-card-apply"
      )
      .then((res) => {
        dispatch(getQuoteForSale(res.data));
        setCouponStates((prev) => ({
          ...prev,
          [couponId]: { loading: false, applied: true },
        }));
        toast.success("Coupon applied successfully");
      })
      .catch(() => {
        setCouponStates((prev) => ({
          ...prev,
          [couponId]: { loading: false, applied: false },
        }));
        toast.error("Error applying coupon");
      });
  };

  const removeCouponFromSelectedProduct = (item) => {
    const couponId = item.couponId;
    setCouponStates((prev) => ({ ...prev, [couponId]: { removing: true } }));

    dispatch(updateSalesDetail({ couponId: null }));
    quoteApiManager
      .call(
        getQuoteForSales,
        { ...quoteBody, couponId: null },
        "coupon-card-remove"
      )
      .then((res) => {
        dispatch(getQuoteForSale(res.data));
        setCouponStates((prev) => ({
          ...prev,
          [couponId]: { removing: false, applied: false },
        }));
        toast.success("Coupon code removed successfully");
      })
      .catch(() => {
        setCouponStates((prev) => ({
          ...prev,
          [couponId]: { removing: false, applied: true },
        }));
        toast.error("Error removing coupon code");
      });
  };

  const visibleCoupons = coupons.slice(currentIndex, currentIndex + 2);

  const handleNext = () => {
    if (currentIndex + 2 < coupons.length) setCurrentIndex(currentIndex + 2);
  };
  const handlePrev = () => {
    if (currentIndex - 2 >= 0) setCurrentIndex(currentIndex - 2);
  };

  return (
    <>
      {coupons.length > 0 ? (
        <div className="flex items-center justify-start">
          <button
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="flex items-center text-[#ffc107] hover:text-[#4caf50] disabled:cursor-not-allowed disabled:text-neutral-300"
            aria-label="Previous coupons"
          >
            <ChevronLeft className="size-5" />
          </button>

          <div className="flex gap-4">
            {visibleCoupons.map((item, index) => {
              const { loading, applied, removing } =
                couponStates[item.couponId] || {};
              return (
                <div
                  key={index}
                  className="relative flex min-w-45 max-w-55 flex-col overflow-hidden rounded-lg bg-[#ffc10738] p-3 shadow-md"
                >
                  <span
                    className={`absolute right-2 top-2 rounded-full px-1.5 py-[3px] text-[9px] font-semibold ${
                      applied
                        ? "bg-[#4CAF50] text-white"
                        : "bg-[#ffc107] text-black"
                    }`}
                  >
                    {applied ? "Applied" : "Not Applied"}
                  </span>

                  <div className="flex items-center">
                    <h4
                      className="ml-1 text-sm font-medium text-[#ffc107]"
                      title={item?.couponCode}
                    >
                      {item?.couponCode?.substring(0, 10) +
                        (item?.couponCode?.length > 10 ? "..." : "")}
                    </h4>
                  </div>

                  <h5 className="text-[11px] font-normal text-[#555]">
                    Get{" "}
                    {item?.discountRate +
                      (item?.discountType === "PERCENTAGE" ? "%" : "$")}{" "}
                    off on this product! Limited time offer.
                    <span
                      className="ml-2 cursor-pointer"
                      title="Click here to get more info about this coupon"
                      onClick={() => handleShowCouponDetails(item)}
                    >
                      <Info className="inline size-3 text-[#ffc107]" />
                    </span>
                  </h5>

                  <div className="flex gap-2">
                    <button
                      disabled={loading || applied}
                      onClick={() => applyCouponToSelectedProduct(item)}
                      className="mt-2.5 flex w-[52%] items-center justify-center rounded bg-[#ffc107] px-1 py-1 text-[10px] font-semibold text-black hover:bg-[#ffb700] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {loading
                        ? "Applying..."
                        : applied
                          ? "Applied"
                          : "Apply Coupon"}
                    </button>
                    {applied && (
                      <button
                        onClick={() => removeCouponFromSelectedProduct(item)}
                        className="mt-2.5 flex w-[52%] items-center justify-center rounded bg-[#ffc107] px-1 py-1 text-[10px] font-semibold text-black hover:bg-[#ffb700]"
                      >
                        {removing ? "Removing..." : "Remove"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <button
            onClick={handleNext}
            disabled={currentIndex + 2 >= coupons.length}
            className="flex items-center text-[#ffc107] hover:text-[#4caf50] disabled:cursor-not-allowed disabled:text-neutral-300"
            aria-label="Next coupons"
          >
            <ChevronRight className="size-5" />
          </button>
        </div>
      ) : (
        <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
          No available coupons for this product
        </div>
      )}

      <Drawer open={visible} onClose={handleCancel} side="right" size={500}>
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h3 className="text-base font-semibold">Coupon Details</h3>
            <button onClick={handleCancel} className="text-muted-foreground">
              ✕
            </button>
          </div>
          <div className="flex-1 overflow-auto">
            {coupon && <CouponDetails coupon={coupon} />}
          </div>
        </div>
      </Drawer>
    </>
  );
}
