"use client";

import { Pencil } from "lucide-react";
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
  const paymentLabel =
    paymentMethod === "CASH"
      ? "Cash"
      : paymentMethod === "VIRTUAL"
      ? "Card/Digital"
      : paymentMethod === "BOTH_CASH_VIRTUAL"
      ? "Cash + Card"
      : "Payment Method";

  const mainStatusItems = (orderStatus || []).filter(
    (s) => s?.allowedSources?.includes(saleDetailStatusId) && !s?.isRollBackState
  );
  const quickStatusItems = (orderStatus || []).filter((s) => !s.isTerminationState);

  return (
    <div className="flex gap-2">
      <button
        disabled={paymentStatusPaidInFull || cartEmpty}
        onClick={onOpenPaymentSidebar}
        className="group flex-1 min-w-0 rounded-lg bg-[#287372] px-3 py-2 text-left text-white shadow-sm transition-colors hover:bg-[#2A9D8F] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-semibold">{paymentLabel}</span>
          <span className="flex items-center gap-1 text-xs font-medium text-white/80">
            ${finalPayable.toFixed(2)}
            <Pencil className="h-3 w-3 shrink-0 opacity-70 transition-opacity group-hover:opacity-100" />
          </span>
        </div>
      </button>

      {(currentAction !== null || hasSale) && (
        <Select
          items={mainStatusItems.map((s) => ({ value: s.statusId, label: s.displayName }))}
          value={selectedStatus ?? ""}
          onValueChange={onStatusChange}
          disabled={currentAction === "processReturns"}
        >
          <SelectTrigger className="flex-1 min-w-0 rounded-lg shadow-sm">
            <span
              className="inline-block h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: selectedStatusObj?.colorCode || "var(--muted-foreground)" }}
            />
            <SelectValue placeholder="Select Status">
              {(value) =>
                mainStatusItems.find((s) => s.statusId === value)?.displayName ||
                "Select Status"
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {mainStatusItems.map((s) => (
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
        <div className="flex flex-1 min-w-0 gap-1.5">
          <Select
            items={quickStatusItems.map((s) => ({ value: s.statusId, label: s.displayName }))}
            value={selectedStatus ?? ""}
            onValueChange={onQuickStatusChange}
          >
            <SelectTrigger className="flex-1 min-w-0 rounded-lg shadow-sm">
              <span
                className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                style={{
                  backgroundColor: selectedStatusObj?.colorCode || "var(--muted-foreground)",
                }}
              />
              <SelectValue placeholder="Select Status">
                {(value) =>
                  quickStatusItems.find((s) => s.statusId === value)?.displayName ||
                  "Select Status"
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {quickStatusItems.map((s) => (
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
          <Button
            variant="default"
            size="sm"
            disabled={cartEmpty || sendToFulfilmentLoading}
            onClick={onSendToFulfillment}
            className="shrink-0 rounded-lg shadow-sm"
          >
            {sendToFulfilmentLoading ? "Sending…" : "Send"}
          </Button>
        </div>
      )}
    </div>
  );
}
