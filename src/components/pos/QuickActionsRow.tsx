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
          className="flex-1 h-[46px] border-amber-400 text-amber-600 hover:bg-amber-50"
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
              className="flex-1 h-[46px] border-transparent bg-violet-500 text-white hover:bg-violet-500/90 disabled:opacity-100"
            >
              <Percent className="mr-1 h-4 w-4" /> Misc.
            </Button>
          }
        />
        <PopoverContent className="w-60 p-1">
          <button
            type="button"
            className="flex w-full items-center gap-2.5 rounded-md p-1.5 text-left hover:bg-muted"
            onClick={onAddMiscCharge}
          >
            <span className="text-base leading-none">💳</span>
            <div>
              <div className="text-[13px] font-semibold text-foreground">
                Misc. Charge
              </div>
              <div className="mt-0.5 text-[11px] text-muted-foreground">
                Add a custom charge
              </div>
            </div>
          </button>
          <div className="my-1 h-px bg-border" />
          <button
            type="button"
            className="flex w-full items-center gap-2.5 rounded-md p-1.5 text-left hover:bg-muted"
            onClick={onAddMiscDiscount}
          >
            <span className="text-base leading-none">🏷️</span>
            <div>
              <div className="text-[13px] font-semibold text-foreground">
                Misc. Discount
              </div>
              <div className="mt-0.5 text-[11px] text-muted-foreground">
                Apply a custom discount
              </div>
            </div>
          </button>
        </PopoverContent>
      </Popover>
      <Button
        variant="outline"
        size="sm"
        disabled={cartEmpty || currentAction !== null}
        onClick={onOpenNotes}
        className="flex-1 h-[46px] border-transparent bg-[#23404B] text-white hover:bg-[#23404B]/90 disabled:opacity-100"
      >
        <StickyNote className="mr-1 h-4 w-4" /> Notes
      </Button>
      {!cartEmpty && (
        <Button
          variant="outline"
          size="sm"
          disabled={currentAction !== null}
          onClick={onOpenTip}
          className="flex-1 h-[46px]"
        >
          Tip
        </Button>
      )}
      {showCoupons && (
        <div className="h-[46px] flex-1">
          <NewAvailableCoupons compact />
        </div>
      )}
    </div>
  );
}
