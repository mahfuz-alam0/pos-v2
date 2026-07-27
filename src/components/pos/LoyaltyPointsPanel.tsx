"use client";

import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";


export default function LoyaltyPointsPanel({
  customerLoyaltyInfo,
  appliedLoyaltyPoints,
  onAppliedLoyaltyPointsChange,
  loyaltyLoading,
  isDisabledLoyalty,
  loyaltyPointsUsed,
  loyaltyDiscountGiven,
  hasLoyaltyErrors,
  finalPayable,
  onApply,
  onRemove,
}: {
  customerLoyaltyInfo: any;
  appliedLoyaltyPoints: number;
  onAppliedLoyaltyPointsChange: (points: number) => void;
  loyaltyLoading: boolean;
  isDisabledLoyalty: boolean;
  loyaltyPointsUsed: number;
  loyaltyDiscountGiven: number;
  hasLoyaltyErrors: boolean;
  finalPayable: number;
  onApply: (points: number) => void;
  onRemove: () => void;
}) {
  if (customerLoyaltyInfo?.userLoyaltyStatus?.isBlocked) {
    return (
      <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
        This customer&apos;s loyalty status is blocked.
      </div>
    );
  }

  return (
    <div className="mt-2 rounded-lg border border-border p-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold">Loyalty Points</div>
          <span className="text-xs text-muted-foreground">
            {customerLoyaltyInfo?.userLoyaltyStatus?.currentLoyaltyPoints ?? 0}
            {" = $"}
            {customerLoyaltyInfo?.amountRepresentation ?? 0}
          </span>
        </div>

        {loyaltyPointsUsed > 0 && !hasLoyaltyErrors ? (
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-green-600">
              {loyaltyPointsUsed} {loyaltyPointsUsed > 1 ? "pts" : "pt"} = $
              {loyaltyDiscountGiven}
            </span>
            <button
              type="button"
              aria-label="Remove loyalty points"
              className="text-[#E86F51] transition-opacity hover:opacity-70"
              onClick={onRemove}
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={0}
              placeholder="Points"
              disabled={isDisabledLoyalty || loyaltyLoading}
              value={appliedLoyaltyPoints || ""}
              onChange={(e) =>
                onAppliedLoyaltyPointsChange(Number(e.target.value) || 0)
              }
              className="w-24"
            />
            <Button
              size="sm"
              disabled={isDisabledLoyalty || loyaltyLoading}
              title={isDisabledLoyalty ? "This discount source is disabled." : undefined}
              onClick={() => onApply(appliedLoyaltyPoints)}
            >
              {loyaltyLoading ? <Loader2 className="size-4 animate-spin" /> : "Apply"}
            </Button>
          </div>
        )}
      </div>

      {appliedLoyaltyPoints > 0 &&
        (appliedLoyaltyPoints > (customerLoyaltyInfo?.amountRepresentation || 0) ? (
          <div className="mt-1 text-xs text-destructive">
            Loyalty points applied exceed available balance.
          </div>
        ) : appliedLoyaltyPoints > finalPayable ? (
          <div className="mt-1 text-xs text-destructive">
            Loyalty points cannot exceed the order total.
          </div>
        ) : null)}
    </div>
  );
}
