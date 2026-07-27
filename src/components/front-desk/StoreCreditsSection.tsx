"use client";

import { useEffect, useState } from "react";
import { getOverallStoreCredits } from "@/services/storeCredits/getOverallStoreCredits";

export default function StoreCreditsSection({ customerId }) {
  const [credits, setCredits] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!customerId) return;
    setLoading(true);
    getOverallStoreCredits(customerId)
      .then((res) => setCredits(res?.data?.data?.storeCredits || res?.data?.data || []))
      .finally(() => setLoading(false));
  }, [customerId]);

  if (loading) return <div className="py-8 text-center text-sm text-muted-foreground">Loading store credits…</div>;
  if (!credits?.length) return <div className="py-8 text-center text-sm text-muted-foreground">No store credit balance</div>;

  return (
    <div className="divide-y divide-border overflow-hidden rounded-xl border border-border">
      {credits.map((c, i) => (
        <div key={c.shopId || i} className="flex items-center justify-between p-3 text-sm">
          <div className="text-muted-foreground">{c.shopName || c.shopId}</div>
          <span className="font-semibold">${Number(c.balance ?? c.amount ?? 0).toFixed(2)}</span>
        </div>
      ))}
    </div>
  );
}
