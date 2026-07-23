"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Drawer from "@/components/ui/Drawer";
import MiscellaneousChargeDrawer from "./MiscellaneousChargeDrawer";

/**
 * Applied miscellaneous charges list + entry point to add a charge/discount.
 * Reads the live quote (`getOrderSummary.data.miscCharges`); deletion is
 * delegated to the parent via `deleteMiscCharge(taxProfileId)`.
 *
 * Props:
 *   getOrderSummary  — the quote object ({ data: { miscCharges: [...] } })
 *   deleteMiscCharge(taxProfileId) — remove a charge (parent re-quotes)
 */
export default function MiscellaneousCharge({ getOrderSummary, deleteMiscCharge }) {
  const [drawerType, setDrawerType] = useState(null); // "charge" | "discount" | null
  const charges = getOrderSummary?.data?.miscCharges || [];

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <div className="font-semibold">Miscellaneous Charges</div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setDrawerType("charge")}>
            Add Charge
          </Button>
          <Button size="sm" variant="outline" onClick={() => setDrawerType("discount")}>
            Add Discount
          </Button>
        </div>
      </div>

      {charges.length === 0 ? (
        <p className="text-sm text-muted-foreground">No miscellaneous charges.</p>
      ) : (
        <ul className="divide-y divide-border rounded-md border border-border">
          {charges.map((charge, index) => (
            <li
              key={charge.taxProfileId || `misc-${index}`}
              className="flex items-start justify-between px-3 py-2 text-sm"
            >
              <div className="min-w-0 flex-1">
                <div className="font-medium">
                  {charge.notes} (${charge.initialUnitPrice} x {charge.quantity})
                </div>
                {charge.snapShotData?.taxesApplied?.length > 0 && (
                  <div className="mt-1 text-xs text-muted-foreground">
                    Taxes:{" "}
                    {charge.snapShotData.taxesApplied
                      .map((tax) => `${tax.name} (${tax.taxRate}%)`)
                      .join(", ")}
                  </div>
                )}
              </div>
              <div className="ml-2 flex items-center gap-2">
                <span className="font-medium text-green-600">
                  +${Number(charge.finalTotalPrice || 0).toFixed(2)}
                </span>
                <button
                  type="button"
                  aria-label="Delete miscellaneous charge"
                  className="text-[#E86F51] transition-opacity hover:opacity-70"
                  onClick={() => deleteMiscCharge?.(charge.taxProfileId)}
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Drawer open={drawerType !== null} onClose={() => setDrawerType(null)} side="right" size={420}>
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h3 className="text-base font-semibold">
              Add Miscellaneous {drawerType === "discount" ? "Discount" : "Charge"}
            </h3>
            <Button size="sm" variant="ghost" onClick={() => setDrawerType(null)}>
              Close
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {drawerType && (
              <MiscellaneousChargeDrawer
                type={drawerType}
                onDone={() => setDrawerType(null)}
              />
            )}
          </div>
        </div>
      </Drawer>
    </div>
  );
}
