"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { getDiscountTypes } from "@/services/sales/discountTypes";

// Which discount sources the shop has enabled (COUPON, DEAL, BOGO_DEAL, ...).
// Coupon/deal cards gate their apply buttons on this.
export default function useDiscountTypes() {
  const [discountTypes, setDiscountTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await getDiscountTypes();
        setDiscountTypes(res?.data?.data?.methods || []);
      } catch (err) {
        setError(err);
        toast.error("Something went wrong loading discount settings");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return { discountTypes, loading, error };
}
