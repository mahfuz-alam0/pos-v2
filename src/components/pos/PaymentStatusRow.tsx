"use client";

import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function PaymentStatusRow({
  paymentStatusPaidInFull,
  cartEmpty,
  onOpenPaymentSidebar,
  paymentMethod,
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
}: {
  paymentStatusPaidInFull: boolean;
  cartEmpty: boolean;
  onOpenPaymentSidebar: () => void;
  paymentMethod: string;
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
  onSendToFulfillment: () => void;
}) {
  return (
    <div className="flex gap-2">
      <button
        disabled={paymentStatusPaidInFull || cartEmpty}
        onClick={onOpenPaymentSidebar}
        className="flex-1 min-w-0 rounded-md bg-[#287372] px-3 py-2 font-semibold text-white transition-colors hover:bg-[#2A9D8F] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <div className="flex items-center justify-between gap-1">
          <span className="truncate text-sm">
            {paymentMethod === "CASH"
              ? "Cash"
              : paymentMethod === "VIRTUAL"
              ? "Card/Digital"
              : paymentMethod === "BOTH_CASH_VIRTUAL"
              ? "Cash + Card"
              : "Payment Method"}
          </span>
          <span className="text-xs opacity-80">(${finalPayable.toFixed(2)}) ✏️</span>
        </div>
      </button>

      {(currentAction !== null || hasSale) && (
        <Select
          value={selectedStatus ?? ""}
          onValueChange={onStatusChange}
          disabled={currentAction === "processReturns"}
        >
          <SelectTrigger className="flex-1 min-w-0">
            <SelectValue placeholder="Select Status">
              {(value) =>
                (orderStatus || []).find((s) => s.statusId === value)?.displayName ||
                "Select Status"
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {(orderStatus || [])
              .filter(
                (s) => s?.allowedSources?.includes(saleDetailStatusId) && !s?.isRollBackState
              )
              .map((s) => (
                <SelectItem key={s.statusId} value={s.statusId}>
                  <span className="flex items-center gap-1">
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
        <div className="flex flex-1 min-w-0 gap-1">
          <Select value={selectedStatus ?? ""} onValueChange={onQuickStatusChange}>
            <SelectTrigger className="w-9 shrink-0 justify-center px-0" size="sm">
              <Play
                className="h-3.5 w-3.5 fill-current"
                style={
                  selectedStatusObj?.colorCode
                    ? { color: selectedStatusObj.colorCode }
                    : undefined
                }
              />
            </SelectTrigger>
            <SelectContent>
              {(orderStatus || [])
                .filter((s) => !s.isTerminationState)
                .map((s) => (
                  <SelectItem key={s.statusId} value={s.statusId}>
                    <span className="flex items-center gap-1">
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
          <Button
            variant="default"
            size="sm"
            disabled={cartEmpty || sendToFulfilmentLoading}
            onClick={onSendToFulfillment}
            className="flex-1 min-w-0"
          >
            {sendToFulfilmentLoading
              ? "Sending…"
              : selectedStatusObj?.displayName || "Send to Fulfillment"}
          </Button>
        </div>
      )}
    </div>
  );
}
