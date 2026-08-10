"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { CheckCircle2, Loader2, Play, QrCode, UserPlus, Users, X } from "lucide-react";
import { toast } from "sonner";
import { useShop } from "@/context/shop-context";
import { useSettings } from "@/context/settings-context";
import { fetchCustomerQueueList, clearCustomerQueue } from "@/services/customerQueue/list";
import { updateQueueStatus } from "@/services/customerQueue/updateStatus";
import { connectToSocket } from "@/lib/socket";
import { Button } from "@/components/ui/button";
import QuickCheckIn from "./QuickCheckIn";
import QrCheckIn from "@/components/settings/QrCheckIn";
import AddCustomerForm from "@/components/customers/AddCustomerForm";
import CustomerDetailDrawer from "@/components/front-desk/CustomerDetailDrawer";

function calculateWaitTime(updatedAt) {
  if (!updatedAt) return "0";
  return Math.floor((Date.now() - new Date(updatedAt).getTime()) / (1000 * 60));
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

// Slim, compact queue for the home dashboard — lives beside the registers panel,
// so it uses a single-column row list instead of the wide card grid. Clicking a
// row opens the full customer details drawer.
export default function HomeCustomerQueue({ onCustomerServed = null }) {
  const { shopId } = useShop();
  const { queueBorder15, queueBorder20, queueYellowTime, queueRedTime } = useSettings();
  const [queueData, setQueueData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [addCustomerOpen, setAddCustomerOpen] = useState(false);
  const [detailsRecord, setDetailsRecord] = useState(null);
  const socketRef = useRef(null);

  const fetchQueue = async () => {
    if (!shopId) return;
    setLoading(true);
    try {
      const res = await fetchCustomerQueueList(shopId);
      setQueueData(res?.data || []);
    } catch (err) {
      console.error("Error fetching customer queue:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopId]);

  useEffect(() => {
    if (!shopId) return;

    socketRef.current = connectToSocket({
      url: `${process.env.NEXT_PUBLIC_BASE_URL}/customer-queue`,
      shopId,
    });
    if (!socketRef.current) return;

    const handleUpdateQueue = () => fetchQueue();
    socketRef.current.on("updateQueue", handleUpdateQueue);
    socketRef.current.on("customerUpdated", handleUpdateQueue);
    socketRef.current.on("customersCleared", async () => {
      await fetchQueue();
      toast.success("Customer queue cleared successfully!");
    });

    return () => socketRef.current?.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopId]);

  const handleClearQueue = async () => {
    if (!confirm("Do you want to clear the queue?")) return;
    setClearing(true);
    try {
      await clearCustomerQueue(shopId);
      await fetchQueue();
    } catch (err) {
      console.error("Failed to clear customer queue:", err);
      toast.error("Failed to clear customer queue.");
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="flex h-full flex-col rounded-2xl bg-component-bg shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <Users className="size-4.5 text-primary" />
          <h2 className="m-0 text-[15px] font-semibold text-heading">Customer Queue</h2>
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-primary-foreground">
            {queueData.length}
          </span>
        </div>
        <div className="flex gap-2">
          <Button className="h-8 px-3 text-xs" onClick={() => setQrOpen(true)}>
            Scan QR
          </Button>
          <Button className="h-8 px-3 text-xs" variant="outline" onClick={() => setAddCustomerOpen(true)}>
            <UserPlus className="size-3.5" /> Add
          </Button>
          <Button className="h-8 px-3 text-xs" variant="ghost" onClick={handleClearQueue} disabled={clearing}>
            {clearing ? <Loader2 className="size-3.5 animate-spin" /> : "Clear"}
          </Button>
        </div>
      </div>

      <div className="px-5 pt-1 pb-2">
        <QuickCheckIn
          shopId={shopId}
          queueData={queueData}
          onCheckedIn={(record) => {
            fetchQueue();
            if (record) onCustomerServed?.(record);
          }}
        />
      </div>

      <div
        className="mx-4 mt-1 mb-2 overflow-y-auto"
        style={{ maxHeight: "calc(5 * 64px + 4 * 8px)" }}
      >
        {loading ? (
          <div className="flex w-full items-center justify-center py-8 text-sm text-muted-foreground">Loading…</div>
        ) : queueData.length === 0 ? (
          <div className="flex w-full items-center justify-center py-8 text-sm text-muted-foreground">No Data Found</div>
        ) : (
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
            {queueData.map((ticket, index) => (
              <QueueRow
                key={ticket.id || index}
                data={ticket}
                queueBorder15={queueBorder15}
                queueBorder20={queueBorder20}
                queueYellowTime={queueYellowTime}
                queueRedTime={queueRedTime}
                onRemove={fetchQueue}
                onServe={(record) => {
                  fetchQueue();
                  onCustomerServed?.(record);
                }}
                onOpenDetails={setDetailsRecord}
              />
            ))}
          </div>
        )}
      </div>

      <QrCheckIn open={qrOpen} onOpenChange={setQrOpen} shopId={shopId} onSuccess={fetchQueue} />
      <AddCustomerForm
        open={addCustomerOpen}
        onClose={() => setAddCustomerOpen(false)}
        onCreated={(record, mode) => {
          fetchQueue();
          if (mode === "queue" && record) onCustomerServed?.(record);
        }}
      />
      <CustomerDetailDrawer
        open={!!detailsRecord}
        onClose={() => setDetailsRecord(null)}
        customerId={detailsRecord?.customerId}
      />
    </div>
  );
}

function QueueRow({
  data,
  queueBorder15,
  queueBorder20,
  queueYellowTime,
  queueRedTime,
  onRemove,
  onServe,
  onOpenDetails,
}) {
  const { shopId } = useShop();
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
  const mjMedicalLicenseExpiresAt = data?.mjMedicalLicenseExpiresAt ?? null;
  const isExpired = mjMedicalLicenseExpiresAt && data?.mjMedicalLicense ? isDobBefore(mjMedicalLicenseExpiresAt) : false;
  const isNewCustomer = (() => {
    if (!data?.createdAt) return false;
    const created = new Date(data.onboardedDateString || data.createdAt);
    return (Date.now() - created.getTime()) / (1000 * 60 * 60) <= 24;
  })();

  const statusBg = isServing ? "#059669" : "#d97706";
  const statusLabel = actionLoading ? (isServing ? "Processing…" : "Moving…") : isServing ? "Return to Queue" : "Available";

  const accentBorder =
    waitTime >= queueRedTime && queueBorder20
      ? "border-l-2 border-l-[#E76F51]"
      : waitTime >= queueYellowTime && queueBorder15
      ? "border-l-2 border-l-[#E9C46A]"
      : "";

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
      toast.success("Queue status updated successfully");
      onRemove?.(data);
    } catch {
      toast.error("Failed to remove from queue");
    }
  }

  return (
    <div
      className={`group flex min-w-0 items-center gap-1.5 rounded-lg border border-border bg-component-bg px-2 py-1.5 transition-colors hover:bg-surface-alt/60 ${accentBorder}`}
    >
      <div onClick={() => onOpenDetails?.(data)} className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-left">
        <div className="relative shrink-0">
          {data?.avatarUrl ? (
            <img src={data.avatarUrl} alt="" className="size-7 cursor-pointer rounded-full object-cover" />
          ) : (
            <div className="flex size-7 items-center justify-center rounded-full bg-primary-soft text-xs font-bold text-primary">
              {(data?.firstName || "?")[0].toUpperCase()}
            </div>
          )}
          {isNewCustomer && (
            <span className="absolute -right-1 -bottom-1 rounded-full bg-[#87d068] px-1 text-[7px] leading-3 font-bold text-white">
              New
            </span>
          )}
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-[12px] font-semibold text-text">
              {data?.firstName} {data?.lastName || ""}
            </span>
            {age && <span className="shrink-0 text-[10px] text-muted-foreground">{age}y</span>}
          </div>
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            {isExpired ? (
              <span className="rounded bg-red-100 px-1 text-[9px] leading-3.5 text-red-600 dark:bg-red-500/20 dark:text-red-300">MED Exp</span>
            ) : (
              <span className="rounded bg-cyan-100 px-1 text-[9px] leading-3.5 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-300">Active</span>
            )}
            <span>{waitTime} min</span>
            {data?.isAddedByQrScan && <QrCode className="size-2.5" />}
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <div
          onClick={() => !actionLoading && handleToggleServing()}
          title={statusLabel}
          className={`flex size-5.5 items-center justify-center rounded-md text-white transition-colors hover:brightness-110 ${actionLoading ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
          style={{ backgroundColor: statusBg }}
        >
          {actionLoading ? (
            <Loader2 className="size-3 animate-spin" />
          ) : isServing ? (
            <CheckCircle2 className="size-3" />
          ) : (
            <Play className="size-3" />
          )}
        </div>
        <div
          onClick={handleRemove}
          title="Remove from queue"
          className="flex size-5.5 shrink-0 cursor-pointer items-center justify-center rounded-md bg-surface-alt text-muted-foreground transition-colors hover:bg-red-500 hover:text-white"
        >
          <X className="size-3.5" />
        </div>
      </div>
    </div>
  );
}
