"use client";

import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function PaymentStatusRow({
  paymentStatusPaidInFull,
  cartEmpty,
  onOpenPaymentSidebar,
  paymentMethod,
  hasPaymentEntered,
  finalPayable,
  currentAction,
  hasSale,
  orderStatus,
  selectedStatus,
  onStatusChange,
  saleDetailStatusId,
  selectedStatusObj,
  onQuickStatusChange,
  sendToFulfilmentLoading,
  onSendToFulfillment,
  selectPortalContainer,
}: {
  paymentStatusPaidInFull: boolean;
  cartEmpty: boolean;
  onOpenPaymentSidebar: () => void;
  paymentMethod: string;
  hasPaymentEntered: boolean;
  finalPayable: number;
  currentAction: string | null;
  hasSale: boolean;
  orderStatus: any[] | null;
  selectedStatus: string | undefined;
  onStatusChange: (value: string) => void;
  saleDetailStatusId: string | undefined;
  selectedStatusObj: any;
  onQuickStatusChange: (value: string) => void;
  sendToFulfilmentLoading: boolean;
  onSendToFulfillment: (statusOverride?: string) => void;
  // When this row is portaled somewhere with its own dark styling (Tablet
  // Mode POS), its Select dropdowns need to portal into that same dark-
  // scoped container too — otherwise they escape straight to <body> and
  // fall back to this app's default light popup styling regardless of
  // where the trigger itself renders.
  selectPortalContainer?: HTMLElement | null;
}) {
  const [moveToOpen, setMoveToOpen] = useState(false);

  const chosenPaymentMethod =
    paymentMethod === "CASH"
      ? "Cash"
      : paymentMethod === "VIRTUAL"
        ? "Card/Digital"
        : paymentMethod === "BOTH_CASH_VIRTUAL"
          ? "Cash + Card"
          : null;
  const paymentLabel =
    hasPaymentEntered && chosenPaymentMethod ? chosenPaymentMethod : "Payment";

  const mainStatusItems = (orderStatus || []).filter(
    (s) =>
      s?.allowedSources?.includes(saleDetailStatusId) && !s?.isRollBackState,
  );
  const quickStatusItems = (orderStatus || []).filter(
    (s) => !s.isTerminationState,
  );

  return (
    <div className="flex gap-1">
      <button
        disabled={paymentStatusPaidInFull || cartEmpty}
        onClick={onOpenPaymentSidebar}
        className="flex-1 min-w-0 rounded-md bg-[#287372] px-3 py-2 font-semibold text-white transition-colors hover:bg-[#2A9D8F] disabled:cursor-not-allowed disabled:opacity-50">
        <div className="flex items-center justify-between gap-1">
          <span className="truncate text-sm">{paymentLabel}</span>
          <span className="text-xs opacity-80">
            (${finalPayable.toFixed(2)}) ✏️
          </span>
        </div>
      </button>

      {(currentAction !== null || hasSale) && (
        <Select
          items={mainStatusItems.map((s) => ({
            value: s.statusId,
            label: s.displayName,
          }))}
          value={selectedStatus ?? ""}
          onValueChange={onStatusChange}
          disabled={currentAction === "processReturns"}>
          <SelectTrigger className="flex-1 min-w-0">
            <SelectValue placeholder="Select Status">
              {(value) =>
                (orderStatus || []).find((s) => s.statusId === value)
                  ?.displayName || "Select Status"
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent container={selectPortalContainer}>
            {(orderStatus || [])
              .filter(
                (s) =>
                  s?.allowedSources?.includes(saleDetailStatusId) &&
                  !s?.isRollBackState,
              )
              .map((s) => (
                <SelectItem key={s.statusId} value={s.statusId}>
                  <span className="flex items-center gap-1.5">
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: s.colorCode }}
                    />
                    {s.displayName}
                  </span>
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      )}

      {!hasSale && currentAction === null && (
        <>
          <button
            type="button"
            disabled={cartEmpty || sendToFulfilmentLoading}
            onClick={() => setMoveToOpen(true)}
            className="flex flex-1 min-w-0 items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50">
            <span
              className="inline-block h-2 w-2 shrink-0 rounded-full"
              style={
                selectedStatusObj?.colorCode
                  ? { backgroundColor: selectedStatusObj.colorCode }
                  : { backgroundColor: "currentColor" }
              }
            />
            <span className="truncate">
              {sendToFulfilmentLoading
                ? "Sending…"
                : selectedStatusObj?.displayName || "Select Status"}
            </span>
          </button>

          <Dialog open={moveToOpen} onOpenChange={setMoveToOpen}>
            <DialogContent className="sm:max-w-xs">
              <DialogHeader>
                <DialogTitle>Move To</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col gap-1">
                {(orderStatus || [])
                  .filter((s) => !s.isTerminationState)
                  .map((s) => (
                    <button
                      key={s.statusId}
                      type="button"
                      onClick={() => {
                        onQuickStatusChange(s.statusId);
                        onSendToFulfillment(s.statusId);
                        setMoveToOpen(false);
                      }}
                      className={`flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-muted ${
                        selectedStatus === s.statusId ? "bg-muted font-semibold" : ""
                      }`}>
                      <span
                        className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: s.colorCode }}
                      />
                      {s.displayName}
                    </button>
                  ))}
              </div>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}
