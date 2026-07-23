"use client";

import { useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { updateSalesDetail } from "@/store/slices/salesDetailSlice";
import { getQuoteForSale } from "@/store/slices/quoteForSaleSlice";
import { getQuoteForSales } from "@/services/sales/getQuoteforSales";
import { quoteApiManager } from "@/utils/quoteApiManager";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const PRESET_PERCENTAGES = ["5", "10", "15", "20"];

/**
 * Tip entry. Preset % buttons compute a dollar tip off the current bill
 * (finalPayable); "Custom" takes a raw dollar amount; "No Tip" is 0.
 *
 * Props:
 *   setVisibleTip(bool) — close callback (called with false after save).
 */
export default function AddTip({ setVisibleTip }) {
  const [isOtherActive, setIsOtherActive] = useState(false);
  const [activeTip, setActiveTip] = useState(null);
  const [loading, setLoading] = useState(false);
  const [customTip, setCustomTip] = useState(0);

  const dispatch = useDispatch();
  const quoteBody = useSelector((state) => state?.salesDetail);
  const getOrderSummary = useSelector((state) => state?.quoteForSale?.lineItems);
  const finalPayable = getOrderSummary?.data?.finalPayable || 0;

  // Percentage -> dollar tip off the current bill.
  const calculateTip = useMemo(() => {
    return (percentage) => ((finalPayable * percentage) / 100).toFixed(2);
  }, [finalPayable]);

  const customTipValue = useMemo(() => {
    if (isOtherActive) return customTip;
    return calculateTip(activeTip || 0);
  }, [isOtherActive, customTip, activeTip, calculateTip]);

  const handleSave = async () => {
    setLoading(true);
    const tipValue = customTipValue;
    dispatch(updateSalesDetail({ tipGiven: tipValue }));
    const updatedQuoteBody = { ...quoteBody, tipGiven: tipValue };
    try {
      const res = await quoteApiManager.call(
        getQuoteForSales,
        updatedQuoteBody,
        "add-tip"
      );
      if (res?.data) dispatch(getQuoteForSale(res.data));
    } finally {
      setLoading(false);
      setVisibleTip(false);
    }
  };

  const presetCard =
    "cursor-pointer rounded-md border border-border px-10 py-2 text-center mb-3";

  return (
    <div>
      <div className="flex w-full justify-center">
        <div>
          <p className="text-center text-lg">Add a Tip</p>
          <p>YOUR BILL: ${finalPayable}</p>
        </div>
      </div>

      <div className="mt-3 mb-4 grid grid-cols-2 gap-3">
        {PRESET_PERCENTAGES.map((item) => (
          <div
            key={item}
            className={`${presetCard} ${
              activeTip === item ? "bg-primary text-primary-foreground" : ""
            }`}
            onClick={() => {
              setIsOtherActive(false);
              setCustomTip(calculateTip(item));
              setActiveTip(item);
            }}
          >
            <div className="mb-0 w-full text-[23px] font-semibold">
              {item}%
            </div>
            <div className="-mb-[6px]">${calculateTip(item)}</div>
          </div>
        ))}

        <div
          className={`${presetCard} flex items-center justify-center ${
            activeTip === "no-tip" ? "bg-primary text-primary-foreground" : ""
          }`}
          onClick={() => {
            setIsOtherActive(false);
            setCustomTip(0);
            setActiveTip("no-tip");
          }}
        >
          <div className="text-[23px] font-semibold">No Tip</div>
        </div>

        <div
          className={`${presetCard} flex items-center justify-center ${
            isOtherActive ? "bg-primary text-primary-foreground" : ""
          }`}
          onClick={() => {
            setActiveTip("custom");
            setIsOtherActive(!isOtherActive);
          }}
        >
          <div className="text-[23px] font-semibold">Custom</div>
        </div>
      </div>

      {isOtherActive && (
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold">$</span>
          <Input
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            defaultValue="0.00"
            className="h-12"
            onChange={(e) => setCustomTip(e.target.value)}
          />
        </div>
      )}

      <div className="mt-4 flex justify-end">
        <Button disabled={loading} onClick={handleSave}>
          {loading ? "Saving..." : "Save"}
        </Button>
      </div>
    </div>
  );
}
