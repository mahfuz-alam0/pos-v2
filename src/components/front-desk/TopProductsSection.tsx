"use client";

import { useEffect, useState } from "react";
import { getCustomerProductStats } from "@/services/stats/getCustomerProductStats";

export default function TopProductsSection({ customerId }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!customerId) return;
    setLoading(true);
    getCustomerProductStats(customerId)
      .then((res) => setProducts(res?.data?.data?.products || res?.data?.data || []))
      .finally(() => setLoading(false));
  }, [customerId]);

  if (loading) return <div className="py-8 text-center text-sm text-muted-foreground">Loading top products…</div>;
  if (!products?.length) return <div className="py-8 text-center text-sm text-muted-foreground">No purchase history yet</div>;

  return (
    <div className="divide-y divide-border overflow-hidden rounded-xl border border-border">
      {products.map((p, i) => (
        <div key={p.productId || i} className="flex items-center justify-between p-3 text-sm">
          <div className="min-w-0 flex-1">
            <div className="truncate font-medium">{p.productName || p.name || "Unknown product"}</div>
            {p.brandName && <div className="text-xs text-muted-foreground">{p.brandName}</div>}
          </div>
          <span className="shrink-0 text-muted-foreground">
            {p.totalQuantityPurchased ?? p.quantity ?? p.count ?? 0}× purchased
          </span>
        </div>
      ))}
    </div>
  );
}
