"use client";

import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import { updateSalesDetail } from "@/store/slices/salesDetailSlice";
import { addMiscallenousCharges } from "@/store/slices/miscChargesSlice";
import { getQuoteForSale } from "@/store/slices/quoteForSaleSlice";
import { getQuoteForSales } from "@/services/sales/getQuoteforSales";
import { getTaxProfiles } from "@/services/tax/getTaxProfiles";
import { quoteApiManager } from "@/utils/quoteApiManager";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * Add-form for a miscellaneous charge or discount. Two modes:
 *   type="charge"   — quantity / unitPrice / unitCost / taxProfile / notes.
 *                     Appends to `miscCharges` (redux + salesDetail) and refreshes quote.
 *   type="discount" — name / rate-type (PERCENTAGE|AMOUNT) / discountRate.
 *                     Sets `miscDiscount` on salesDetail and refreshes quote.
 *
 * Props:
 *   type   — "charge" | "discount" (default "charge")
 *   onDone — called after a successful save (e.g. to close the parent drawer)
 */
export default function MiscellaneousChargeDrawer({ type = "charge", onDone }) {
  const dispatch = useDispatch();
  const quoteBody = useSelector((state: any) => state?.salesDetail);
  const quoteData = useSelector((state: any) => state?.quoteForSale?.lineItems);
  const currentMiscCharges = useSelector(
    (state: any) => state?.miscCharges?.miscCharges || []
  );

  const [loading, setLoading] = useState(false);

  const refreshQuote = async (updatedQuoteBody, source) => {
    const res = await quoteApiManager.call(
      getQuoteForSales,
      updatedQuoteBody,
      source
    );
    if (res?.data) dispatch(getQuoteForSale(res.data));
  };

  // ---- Charge mode ----
  const [charge, setCharge] = useState({
    quantity: "",
    unitPrice: "",
    unitCost: "",
    taxProfileId: "",
    notes: "",
  });
  const [taxProfiles, setTaxProfiles] = useState([]);

  useEffect(() => {
    if (type !== "charge") return;
    let active = true;
    getTaxProfiles(1, 50)
      .then((res) => {
        if (active) setTaxProfiles(res?.data?.taxProfiles || []);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [type]);

  const submitCharge = async (e) => {
    e.preventDefault();
    const { quantity, unitPrice, unitCost, taxProfileId, notes } = charge;
    if (
      !String(quantity).trim() ||
      !String(unitPrice).trim() ||
      !String(unitCost).trim() ||
      !taxProfileId ||
      !notes.trim()
    ) {
      toast.warning("Please fill all charge fields");
      return;
    }

    const exists = currentMiscCharges.find(
      (c) => c.taxProfileId === taxProfileId
    );
    if (exists) {
      toast.error("This charge has already been added.");
      return;
    }

    setLoading(true);
    const values = { quantity, unitPrice, unitCost, taxProfileId, notes };
    const updatedMiscCharges = [...currentMiscCharges, values];
    dispatch(addMiscallenousCharges(updatedMiscCharges));
    dispatch(updateSalesDetail({ miscCharges: updatedMiscCharges }));
    try {
      await refreshQuote(
        { ...quoteBody, miscCharges: updatedMiscCharges },
        "misc-charge"
      );
      toast.success("Charge added successfully");
      onDone?.();
    } finally {
      setLoading(false);
    }
  };

  // ---- Discount mode ----
  const [discountRateType, setDiscountRateType] = useState("PERCENTAGE");
  const [discount, setDiscount] = useState({ name: "", discountRate: "" });

  const discountValue = parseFloat(discount.discountRate) || 0;
  const currentTotal = quoteData?.data?.total ?? quoteData?.total ?? 0;
  const newTotal = !discountValue
    ? currentTotal
    : discountRateType === "PERCENTAGE"
    ? currentTotal - (currentTotal * discountValue) / 100
    : currentTotal - discountValue;
  const discountAmount = currentTotal - newTotal;

  const submitDiscount = async (e) => {
    e.preventDefault();
    if (!discount.name.trim()) {
      toast.warning("Please enter discount name");
      return;
    }
    if (!/^[0-9]+(\.[0-9]{1,2})?$/.test(String(discount.discountRate))) {
      toast.warning("Please enter a valid discount amount");
      return;
    }

    setLoading(true);
    const values = {
      name: discount.name,
      discountRate: discount.discountRate,
      discountRateType,
    };
    dispatch(updateSalesDetail({ miscDiscount: values }));
    try {
      await refreshQuote({ ...quoteBody, miscDiscount: values }, "misc-discount");
      toast.success("Discount added successfully");
      onDone?.();
    } finally {
      setLoading(false);
    }
  };

  if (type === "discount") {
    return (
      <form onSubmit={submitDiscount} className="flex flex-col gap-4 p-4">
        <div>
          <Label className="mb-1.5">Discount Name</Label>
          <Input
            placeholder="Enter discount name"
            value={discount.name}
            onChange={(e) =>
              setDiscount((d) => ({ ...d, name: e.target.value }))
            }
          />
        </div>

        <div>
          <Label className="mb-1.5">Discount Type</Label>
          <div className="flex gap-2 rounded-lg bg-muted p-1">
            {[
              ["PERCENTAGE", "Percentage (%)"],
              ["AMOUNT", "Cash ($)"],
            ].map(([val, label]) => (
              <Button
                key={val}
                type="button"
                variant={discountRateType === val ? "default" : "ghost"}
                className="flex-1"
                onClick={() => setDiscountRateType(val)}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>

        <div>
          <Label className="mb-1.5">Discount Amount</Label>
          <Input
            type="number"
            step={discountRateType === "PERCENTAGE" ? "1" : "0.01"}
            min="0"
            max={discountRateType === "PERCENTAGE" ? "100" : undefined}
            placeholder={discountRateType === "PERCENTAGE" ? "e.g. 10" : "e.g. 5.00"}
            value={discount.discountRate}
            onChange={(e) =>
              setDiscount((d) => ({ ...d, discountRate: e.target.value }))
            }
          />
        </div>

        <div className="rounded-lg bg-muted p-4 text-sm">
          <div className="flex justify-between py-1">
            <span className="text-muted-foreground">Current Total</span>
            <span className="font-semibold">${currentTotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-muted-foreground">Discount</span>
            <span className="font-semibold text-[#E86F51]">
              -${discountAmount.toFixed(2)}
            </span>
          </div>
          <div className="mt-2 flex justify-between border-t pt-2">
            <span className="font-semibold">New Total</span>
            <span className="text-lg font-bold">${newTotal.toFixed(2)}</span>
          </div>
        </div>

        <Button type="submit" disabled={loading} className="h-11">
          {loading ? "Applying..." : "Apply Discount"}
        </Button>
      </form>
    );
  }

  // Charge form
  return (
    <form onSubmit={submitCharge} className="flex flex-col gap-4 p-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="mb-1.5">Quantity</Label>
          <Input
            placeholder="Quantity"
            value={charge.quantity}
            onChange={(e) =>
              setCharge((c) => ({ ...c, quantity: e.target.value }))
            }
          />
        </div>
        <div>
          <Label className="mb-1.5">Unit Price</Label>
          <Input
            placeholder="Unit Price"
            value={charge.unitPrice}
            onChange={(e) =>
              setCharge((c) => ({ ...c, unitPrice: e.target.value }))
            }
          />
        </div>
        <div>
          <Label className="mb-1.5">Unit Cost</Label>
          <Input
            placeholder="Unit Cost"
            value={charge.unitCost}
            onChange={(e) =>
              setCharge((c) => ({ ...c, unitCost: e.target.value }))
            }
          />
        </div>
        <div>
          <Label className="mb-1.5">Tax Profile</Label>
          <Select
            value={charge.taxProfileId}
            onValueChange={(val) =>
              setCharge((c) => ({ ...c, taxProfileId: val }))
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select Tax Profile">
                {(value) =>
                  taxProfiles.find((tp) => tp.id === value)?.name ||
                  "Select Tax Profile"
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {taxProfiles.map((tp) => (
                <SelectItem key={tp.id} value={tp.id}>
                  {tp.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label className="mb-1.5">Notes</Label>
        <textarea
          className="min-h-20 w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          placeholder="Notes"
          value={charge.notes}
          onChange={(e) => setCharge((c) => ({ ...c, notes: e.target.value }))}
        />
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : "Apply Charge"}
        </Button>
      </div>
    </form>
  );
}
