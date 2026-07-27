"use client";

import { StickyNote, Percent } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import NewAvailableCoupons from "@/components/pos/NewAvailableCoupons";

/**
 * Draft / Misc. / Notes / Tip / Coupons row from TotalCard's live-sale
 * panel. Pulled out verbatim — same markup/conditions, just given its own
 * file so this row (where the Coupons placement bug lived) is easy to find
 * and change without scrolling past checkout/payment logic.
 */
export default function QuickActionsRow({
  hasSale,
  cartEmpty,
  currentAction,
  saveDraftLoading,
  onSaveDraft,
  onAddMiscCharge,
  onAddMiscDiscount,
  onOpenNotes,
  onOpenTip,
  showCoupons,
}: {
  hasSale: boolean;
  cartEmpty: boolean;
  currentAction: string | null;
  saveDraftLoading: boolean;
  onSaveDraft: () => void;
  onAddMiscCharge: () => void;
  onAddMiscDiscount: () => void;
  onOpenNotes: () => void;
  onOpenTip: () => void;
  showCoupons: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {!hasSale && (
        <Button
          variant="outline"
          size="sm"
          disabled={currentAction === "processReturns" || saveDraftLoading}
          onClick={onSaveDraft}
          className="flex-1"
        >
          {saveDraftLoading ? "Saving…" : "Draft"}
        </Button>
      )}
      <Popover>
        <PopoverTrigger
          render={
            <Button
              variant="outline"
              size="sm"
              disabled={cartEmpty || currentAction !== null}
              className="flex-1"
            >
              <Percent className="mr-1 h-4 w-4" /> Misc.
            </Button>
          }
        />
        <PopoverContent className="w-44 p-1">
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
            onClick={onAddMiscCharge}
          >
            <Percent className="h-4 w-4" /> Add Charge
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
            onClick={onAddMiscDiscount}
          >
            Add Discount
          </button>
        </PopoverContent>
      </Popover>
      <Button
        variant="outline"
        size="sm"
        disabled={cartEmpty || currentAction !== null}
        onClick={onOpenNotes}
        className="flex-1"
      >
        <StickyNote className="mr-1 h-4 w-4" /> Notes
      </Button>
      {!cartEmpty && (
        <Button
          variant="outline"
          size="sm"
          disabled={currentAction !== null}
          onClick={onOpenTip}
          className="flex-1"
        >
          Tip
        </Button>
      )}
      {showCoupons && (
        <div className="h-7 flex-1">
          <NewAvailableCoupons compact />
        </div>
      )}
    </div>
  );
}
