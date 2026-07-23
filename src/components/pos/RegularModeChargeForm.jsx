"use client";

import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
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
import { getTaxProfiles } from "@/services/tax/getTaxProfiles";
import { getQuoteForSales } from "@/services/sales/getQuoteforSales";
import { getQuoteForSale } from "@/store/slices/quoteForSaleSlice";
import { updateSalesDetail } from "@/store/slices/salesDetailSlice";
import { addMiscallenousCharges } from "@/store/slices/miscChargesSlice";

/**
 * Miscellaneous charge form — adds a manual charge line (quantity/unit
 * price/unit cost/tax profile/notes), refreshes the quote, and mirrors the
 * charge into salesDetail. Dedup rule preserved: one charge per tax profile.
 *
 * Props:
 *   onDone() — called after the charge is applied (old `setMiscallenousCharge(false)`).
 */
export default function RegularModeChargeForm({ onDone }) {
  const dispatch = useDispatch();
  const [values, setValues] = useState({
    quantity: "",
    unitPrice: "",
    unitCost: "",
    taxProfileId: "",
    notes: "",
  });
  const [taxProfiles, setTaxProfiles] = useState([]);
  const [chargeLoading, setChargeLoading] = useState(false);

  const quoteBody = useSelector((state) => state?.salesDetail);
  const currentMiscallenousCharges = useSelector(
    (state) => state.miscCharges.miscCharges
  );

  useEffect(() => {
    getTaxProfiles(1, 50)
      .then((res) => setTaxProfiles(res?.data?.taxProfiles || []))
      .catch(() => {});
  }, []);

  const setField = (key, val) => setValues((v) => ({ ...v, [key]: val }));

  const onFinishCharge = () => {
    if (
      !values.quantity?.trim() ||
      !values.unitPrice?.trim() ||
      !values.unitCost?.trim() ||
      !values.taxProfileId ||
      !values.notes?.trim()
    ) {
      toast.error("Please fill in all fields.");
      return;
    }

    const existingCharge = currentMiscallenousCharges.find(
      (charge) => charge.taxProfileId === values.taxProfileId
    );

    if (existingCharge) {
      toast.error("This charge has already been added.");
      return;
    }
    setChargeLoading(true);
    const updatedMiscallenousArr = [...currentMiscallenousCharges, values];
    dispatch(addMiscallenousCharges(updatedMiscallenousArr));

    const updatedQuoteBody = {
      ...quoteBody,
      miscCharges: updatedMiscallenousArr,
    };

    getQuoteForSales(updatedQuoteBody).then((res) => {
      dispatch(getQuoteForSale(res.data));
      setValues({
        quantity: "",
        unitPrice: "",
        unitCost: "",
        taxProfileId: "",
        notes: "",
      });
    });
    dispatch(
      updateSalesDetail({
        miscCharges: updatedMiscallenousArr,
      })
    );
    setTimeout(() => {
      setChargeLoading(false);
      onDone?.();
    }, 1000);
    toast.success("Charge added successfully");
  };

  return (
    <div className="space-y-4 p-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="misc-quantity">Quantity</Label>
          <Input
            id="misc-quantity"
            placeholder="Quantity"
            value={values.quantity}
            onChange={(e) => setField("quantity", e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="misc-unit-price">Unit Price</Label>
          <Input
            id="misc-unit-price"
            placeholder="Unit Price"
            value={values.unitPrice}
            onChange={(e) => setField("unitPrice", e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="misc-unit-cost">Unit Cost</Label>
          <Input
            id="misc-unit-cost"
            placeholder="Unit Cost"
            value={values.unitCost}
            onChange={(e) => setField("unitCost", e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label>Tax Profile</Label>
          <Select
            value={values.taxProfileId}
            onValueChange={(val) => setField("taxProfileId", val)}
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

        <div className="space-y-1.5 md:col-span-2">
          <Label htmlFor="misc-notes">Notes</Label>
          <textarea
            id="misc-notes"
            placeholder="Notes"
            rows={3}
            value={values.notes}
            onChange={(e) => setField("notes", e.target.value)}
            className="w-full resize-none rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={onFinishCharge} disabled={chargeLoading}>
          {chargeLoading ? "Saving..." : "Apply Charge"}
        </Button>
      </div>
    </div>
  );
}
