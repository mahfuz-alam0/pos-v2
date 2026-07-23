"use client";

import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import { updateSalesDetail } from "@/store/slices/salesDetailSlice";
import { getQuoteForSale } from "@/store/slices/quoteForSaleSlice";
import { getQuoteForSales } from "@/services/sales/getQuoteforSales";
import { quoteApiManager } from "@/utils/quoteApiManager";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

/**
 * Internal + receipt notes on the sale. Both map onto `salesDetail`
 * (`internalNote`, `receiptNote`). Receipt note is required (whitespace-only
 * is rejected), internal note is optional.
 *
 * Props:
 *   setNotes(bool) — close callback (called with false after save).
 */
export default function Notes({ setNotes }) {
  const [loading, setLoading] = useState(false);
  const [receiptNote, setReceiptNote] = useState("");
  const [internalNote, setInternalNote] = useState("");

  const dispatch = useDispatch();
  const quoteBody = useSelector((state) => state?.salesDetail);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!receiptNote.trim()) {
      toast.warning("Please enter receipt note");
      return;
    }
    setLoading(true);
    dispatch(updateSalesDetail({ internalNote, receiptNote }));
    const updatedQuoteBody = { ...quoteBody, internalNote, receiptNote };
    try {
      const res = await quoteApiManager.call(
        getQuoteForSales,
        updatedQuoteBody,
        "notes"
      );
      if (res?.data) dispatch(getQuoteForSale(res.data));
      toast.success("Note added successfully");
      setNotes(false);
    } finally {
      setLoading(false);
    }
  };

  const textareaCls =
    "w-full min-h-24 rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

  return (
    <form onSubmit={handleSubmit} className="px-4">
      <div className="mb-4">
        <Label className="mb-1.5">Receipt Note</Label>
        <textarea
          className={textareaCls}
          rows={4}
          placeholder="Enter Receipt Note"
          value={receiptNote}
          onChange={(e) => setReceiptNote(e.target.value)}
        />
      </div>

      <div className="mb-4">
        <Label className="mb-1.5">Internal Note</Label>
        <textarea
          className={textareaCls}
          rows={2}
          placeholder="Internal Note"
          value={internalNote}
          onChange={(e) => setInternalNote(e.target.value)}
        />
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : "Save Notes"}
        </Button>
      </div>
    </form>
  );
}
