"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { updateQueueStatus } from "@/services/customerQueue/updateStatus";
import { useShop } from "@/context/shop-context";
import { useSettings } from "@/context/settings-context";

function calculateWaitTime(updatedAt) {
  if (!updatedAt) return 0;
  return Math.floor((Date.now() - new Date(updatedAt).getTime()) / (1000 * 60));
}

function calculateAge(dob) {
  if (!dob || isNaN(Date.parse(dob))) return null;
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age > 0 ? age : null;
}

// Reskin of dashboard/QueueCard for the Front Desk screen. Same
// serve/remove/wait-time-threshold logic, restyled to match the old app's look.
export default function FrontDeskQueueCard({ data, onRemove, onServe, onOpenDetails }) {
  const { shopId } = useShop();
  const { queueYellowTime, queueRedTime } = useSettings();
  const [waitTime, setWaitTime] = useState(calculateWaitTime(data?.updatedAt));
  const [isServing, setIsServing] = useState(Boolean(data?.isGettingServed));
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    setIsServing(Boolean(data?.isGettingServed));
  }, [data?.isGettingServed]);

  useEffect(() => {
    const timer = setInterval(() => setWaitTime(calculateWaitTime(data?.updatedAt)), 60000);
    return () => clearInterval(timer);
  }, [data?.updatedAt]);

  const age = calculateAge(data?.dob);
  const waitColor = waitTime >= queueRedTime ? "#ef4444" : waitTime >= queueYellowTime ? "#f59e0b" : null;
  const statusBg = isServing ? "#059669" : "var(--color-primary)";
  const statusLabel = actionLoading ? (isServing ? "Processing…" : "Moving…") : isServing ? "Return to Queue" : "Available";

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

  async function handleToggleServing() {
    if (actionLoading) return;
    const nextServing = !isServing;
    setIsServing(nextServing);
    setActionLoading(true);
    try {
      await updateQueueStatus({ shopId, id: data?.id, action: nextServing ? "MOVE_TO_SERVING" : "MOVE_TO_WAITING" });
      if (nextServing) onServe?.(data);
    } catch {
      setIsServing(!nextServing);
      toast.error("Failed to update status. Please try again.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRemove() {
    try {
      await updateQueueStatus({ shopId, id: data?.id, action: isServing ? "REMOVE_SERVED" : "REMOVE_UNSERVED" });
      onRemove?.(data);
    } catch {
      toast.error("Failed to remove from queue");
    }
  }

  return (
    <div className="relative flex w-70 shrink-0 flex-col overflow-hidden rounded-xl border border-border bg-muted shadow-sm">
      {waitColor && <div className="absolute inset-x-0 top-0 h-1" style={{ background: waitColor }} />}
      <button
        onClick={handleRemove}
        className="absolute top-2 right-2 z-10 flex size-5 items-center justify-center rounded-full bg-foreground/10 text-muted-foreground hover:bg-red-500 hover:text-white"
      >
        <X className="size-3" />
      </button>

      <div className="flex items-start gap-2.5 px-3.5 pt-3.5 pb-2" onClick={() => onOpenDetails?.(data)}>
        {data?.avatarUrl ? (
          <img src={data.avatarUrl} alt="" className="size-10 shrink-0 cursor-pointer rounded-full object-cover" />
        ) : (
          <div className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
            {(data?.firstName || "?")[0].toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1 cursor-pointer">
          <div className="truncate text-[13px] font-semibold text-foreground">
            {data?.firstName} {data?.lastName || ""}
          </div>
          {age && (
            <span className="mt-1 inline-block rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-medium text-primary">
              {age} yrs{data?.dob ? `, ${new Date(data.dob).getFullYear()}` : ""}
            </span>
          )}
        </div>
      </div>

      {cartData && (
        <div className="mx-3.5 mb-2.5 rounded-lg bg-card px-2.5 py-2 ring-1 ring-foreground/10">
          {cartItems.slice(0, 2).map((item, idx) => (
            <div key={idx} className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
              <span className="truncate">
                {item.purchaseQuantity || 1}× {item.productName || item.name || "Unknown"}
              </span>
              <span className="shrink-0 font-medium text-foreground">${((item.price || 0) * (item.purchaseQuantity || 1)).toFixed(2)}</span>
            </div>
          ))}
          <div className="mt-1.5 flex items-center justify-between border-t border-foreground/10 pt-1.5">
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              {cartItems.length} item{cartItems.length !== 1 ? "s" : ""}
              {hasDeals && <span className="rounded bg-emerald-500/20 px-1 text-emerald-600 dark:text-emerald-300">Deal</span>}
            </div>
            <span className="text-[12px] font-bold text-foreground">${cartSubtotal.toFixed(2)}</span>
          </div>
        </div>
      )}

      <div className="px-3.5 pb-3 text-[10px] font-medium" style={{ color: waitColor || "var(--muted-foreground)" }}>
        {waitTime} min in queue
      </div>

      <button
        onClick={handleToggleServing}
        disabled={actionLoading}
        className="mt-auto py-2.5 text-[13px] font-bold tracking-wide text-white"
        style={{ background: statusBg, opacity: actionLoading ? 0.75 : 1 }}
      >
        {statusLabel}
      </button>
    </div>
  );
}
