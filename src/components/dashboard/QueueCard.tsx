"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { X, QrCode } from "lucide-react";
import { toast } from "sonner";
import { useSettings } from "@/context/settings-context";
import { useShop } from "@/context/shop-context";
import { updateQueueStatus } from "@/services/customerQueue/updateStatus";

function calculateWaitTime(updatedAt) {
  if (!updatedAt) return "N/A";
  const diffInMs = Date.now() - new Date(updatedAt).getTime();
  return Math.floor(diffInMs / (1000 * 60));
}

function calculateAge(dob) {
  if (!dob || isNaN(Date.parse(dob))) return null;
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
  return age > 0 ? age : null;
}

function isDobBefore(dateStr) {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date();
}

export default function QueueCard({ data, onRemove, onServe, sidepanel = false }) {
  const { shopId } = useShop();
  const { queueBorder15, queueBorder20, queueYellowTime, queueRedTime } = useSettings();
  const [waitTime, setWaitTime] = useState(calculateWaitTime(data?.updatedAt));
  const [isServing, setIsServing] = useState(Boolean(data?.isGettingServed));
  const [isNewCustomer, setIsNewCustomer] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [cartExpanded, setCartExpanded] = useState(false);

  useEffect(() => {
    setIsServing(Boolean(data?.isGettingServed));
  }, [data?.isGettingServed]);

  useEffect(() => {
    const timer = setInterval(() => setWaitTime(calculateWaitTime(data?.updatedAt)), 60000);
    return () => clearInterval(timer);
  }, [data?.updatedAt]);

  useEffect(() => {
    if (data?.createdAt) {
      const created = new Date(data.onboardedDateString || data.createdAt);
      const hoursSince = (Date.now() - created.getTime()) / (1000 * 60 * 60);
      setIsNewCustomer(hoursSince <= 24);
    }
  }, [data?.createdAt, data?.onboardedDateString]);

  const age = calculateAge(data?.dob);
  const statusBg = isServing ? "#059669" : "#d97706";
  const statusLabel = actionLoading ? (isServing ? "Processing…" : "Moving…") : isServing ? "Return to Queue" : "Available";

  const mjMedicalLicenseExpiresAt = data?.mjMedicalLicenseExpiresAt ?? null;
  const isExpired = mjMedicalLicenseExpiresAt && data?.mjMedicalLicense ? isDobBefore(mjMedicalLicenseExpiresAt) : false;

  const borderColorClass =
    waitTime >= queueRedTime && queueBorder20
      ? "border-[#E76F51]"
      : waitTime >= queueYellowTime && queueBorder15
      ? "border-[#E9C46A]"
      : "border-border";

  // ── Cart data ──────────────────────────────────────────────────────
  let cartData = null;
  try {
    if (data?.cartMetaDataJsonString) {
      cartData = JSON.parse(data.cartMetaDataJsonString);
      if (!cartData?.lineItems?.length) cartData = null;
    }
  } catch {}

  const cartItems = cartData?.lineItems || [];
  const cartSubtotal = cartItems.reduce((sum, item) => sum + (item.price || 0) * (item.purchaseQuantity || 1), 0);
  const hasDeals = cartData?.applicableRegularDeals?.length > 0 || !!cartData?.couponId;
  const hasMiscDiscount = !!cartData?.miscDiscount;
  const hasLoyalty = (cartData?.loyaltyPointsClaimed || 0) > 0;

  async function handleToggleServing() {
    if (actionLoading) return;
    const nextServing = !isServing;
    const action = nextServing ? "MOVE_TO_SERVING" : "MOVE_TO_WAITING";
    setIsServing(nextServing);
    setActionLoading(true);
    try {
      await updateQueueStatus({ shopId, id: data?.id, action });
      if (nextServing) {
        toast.success("Customer's order now being processed");
        onServe?.(data);
      } else {
        toast.success("Customer moved to waiting list.");
      }
    } catch {
      setIsServing(!nextServing);
      toast.error("Failed to update status. Please try again.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRemove() {
    const action = isServing ? "REMOVE_SERVED" : "REMOVE_UNSERVED";
    try {
      await updateQueueStatus({ shopId, id: data?.id, action });
      toast.success("Queue status updated successfully");
      onRemove?.(data);
    } catch {
      toast.error("Failed to remove from queue");
    }
  }

  return (
    <div
      className={`relative flex ${
        sidepanel ? "w-full" : "w-[calc((100%-16px)/3)] min-w-55"
      } flex-col overflow-hidden rounded-xl border-2 bg-component-bg shadow-sm ${borderColorClass}`}
    >
      <button
        onClick={handleRemove}
        className="absolute top-2 right-2 z-10 flex size-5 items-center justify-center rounded-full border-0 bg-surface-alt text-[10px] text-muted-foreground hover:bg-red-500 hover:text-white"
      >
        <X className="size-3" />
      </button>

      <div className="flex items-center gap-2.5 px-3 pt-3 pb-2">
        <div className="relative shrink-0">
          {data?.avatarUrl ? (
            <img
              src={data.avatarUrl}
              alt=""
              onClick={handleToggleServing}
              className="size-11 cursor-pointer rounded-full object-cover ring-2 ring-offset-1"
              style={{ "--tw-ring-color": statusBg } as CSSProperties}
            />
          ) : (
            <div
              onClick={handleToggleServing}
              className="flex size-11 cursor-pointer items-center justify-center rounded-full bg-gray-100 text-sm font-bold text-gray-400 ring-2 ring-offset-1"
              style={{ "--tw-ring-color": statusBg } as CSSProperties}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="size-6">
                <path d="M12 12c2.7 0 4.9-2.2 4.9-4.9S14.7 2.2 12 2.2 7.1 4.4 7.1 7.1 9.3 12 12 12Zm0 2.4c-3.3 0-9.8 1.6-9.8 4.9v2.4h19.6v-2.4c0-3.3-6.5-4.9-9.8-4.9Z" />
              </svg>
            </div>
          )}
          {isNewCustomer && (
            <span className="absolute -right-1 -bottom-1 rounded-full bg-[#87d068] px-1 text-[8px] leading-[14px] font-bold text-white">
              New
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="truncate pr-5 text-[13px] font-semibold text-text">
            {data?.firstName} {data?.lastName || ""}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-1">
            {age && <span className="text-[10px] text-muted-foreground">{age} y/o</span>}
            {isExpired ? (
              <span className="rounded bg-red-100 px-1 text-[9px] leading-[14px] text-red-600">MED Exp</span>
            ) : (
              <span className="rounded bg-cyan-100 px-1 text-[9px] leading-[14px] text-cyan-700">Active</span>
            )}
            {data?.isAddedByQrScan && (
              <span
                title="Checked in via QR code"
                className="flex items-center justify-center rounded bg-purple-100 px-1 text-purple-700"
              >
                <QrCode className="size-2.5" />
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between px-3 pb-2 text-[10px] text-muted-foreground">
        <span>
          <span className="font-semibold text-text">{waitTime}</span> min in queue
        </span>
        {data?.customerTypeName && <span className="max-w-22.5 truncate text-right">{data.customerTypeName}</span>}
      </div>

      {data?.groupNamesToBeZipped?.length > 0 && (
        <div className="px-3 pb-2" title={data.groupNamesToBeZipped.join(", ")}>
          <div className="truncate text-[9px] text-muted-foreground">{data.groupNamesToBeZipped.join(", ")}</div>
        </div>
      )}

      {cartData && (
        <div className="mx-3 mb-2 overflow-hidden rounded-lg border border-border">
          <button
            className="flex w-full items-center justify-between border-0 bg-surface-alt px-2.5 py-1.5 transition-colors hover:bg-muted"
            onClick={() => setCartExpanded((v) => !v)}
          >
            <div className="flex items-center gap-1.5">
              <span className="text-[13px]">🛒</span>
              <span className="text-[11px] font-medium text-text">
                {cartItems.length} item{cartItems.length !== 1 ? "s" : ""} in cart
              </span>
              {hasDeals && <span className="rounded bg-green-100 px-1 text-[8px] leading-[14px] text-green-700">Deal</span>}
              {hasMiscDiscount && <span className="rounded bg-cyan-100 px-1 text-[8px] leading-[14px] text-cyan-700">Disc</span>}
              {hasLoyalty && <span className="rounded bg-amber-100 px-1 text-[8px] leading-[14px] text-amber-700">Pts</span>}
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[12px] font-bold text-text">${cartSubtotal.toFixed(2)}</span>
              <span
                className="text-[10px] text-muted-foreground transition-transform duration-200"
                style={{ transform: cartExpanded ? "rotate(180deg)" : "rotate(0deg)" }}
              >
                ▼
              </span>
            </div>
          </button>

          {cartExpanded && (
            <div className="border-t border-border bg-component-bg px-2.5 py-2">
              <div className="mb-2 space-y-1">
                {cartItems.map((item, idx) => {
                  const name = item.productName || item.name || "Unknown";
                  const qty = item.purchaseQuantity || 1;
                  const lineTotal = (item.price || 0) * qty;
                  return (
                    <div key={idx} className="flex items-start justify-between gap-1">
                      <div className="min-w-0 flex-1">
                        <span className="block truncate text-[10px] leading-tight font-medium text-muted-foreground">
                          {qty}× {name}
                        </span>
                        {item.sellableUomShortForm && (
                          <span className="text-[9px] text-muted-foreground/70">{item.sellableUomShortForm}</span>
                        )}
                      </div>
                      <span className="shrink-0 text-[10px] font-semibold text-muted-foreground">${lineTotal.toFixed(2)}</span>
                    </div>
                  );
                })}
              </div>

              <div className="border-t border-dashed border-border pt-1.5">
                {(hasDeals || hasMiscDiscount || hasLoyalty || cartData.couponId) && (
                  <div className="mb-1 flex flex-wrap gap-1">
                    {hasDeals && <span className="rounded bg-green-100 px-1.5 text-[9px] leading-4 text-green-700">Deal applied</span>}
                    {hasMiscDiscount && <span className="rounded bg-cyan-100 px-1.5 text-[9px] leading-4 text-cyan-700">Discount</span>}
                    {cartData.couponId && <span className="rounded bg-orange-100 px-1.5 text-[9px] leading-4 text-orange-700">Coupon</span>}
                    {hasLoyalty && (
                      <span className="rounded bg-amber-100 px-1.5 text-[9px] leading-4 text-amber-700">
                        {cartData.loyaltyPointsClaimed} pts
                      </span>
                    )}
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">Subtotal</span>
                  <span className="text-[12px] font-bold text-text">${cartSubtotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div
        onClick={() => !actionLoading && handleToggleServing()}
        className="mt-auto flex cursor-pointer items-center justify-center gap-1.5 py-2.5 text-[13px] font-bold tracking-wide text-white select-none"
        style={{ background: statusBg, opacity: actionLoading ? 0.75 : 1 }}
      >
        {statusLabel}
      </div>
    </div>
  );
}
