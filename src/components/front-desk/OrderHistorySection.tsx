"use client";

import { useEffect, useState } from "react";
import { listSales } from "@/services/sales/listSales";
import { Badge } from "@/components/ui/badge";

export default function OrderHistorySection({ customerId }) {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!customerId) return;
    setLoading(true);
    listSales([
      { name: "customerId", value: customerId },
      { name: "limit", value: 30 },
      { name: "page", value: 1 },
    ])
      .then((res) => setSales(res?.data?.data?.sales || []))
      .finally(() => setLoading(false));
  }, [customerId]);

  if (loading) return <div className="py-8 text-center text-sm text-muted-foreground">Loading orders…</div>;
  if (sales.length === 0) return <div className="py-8 text-center text-sm text-muted-foreground">No past orders</div>;

  return (
    <div className="divide-y divide-border overflow-hidden rounded-xl border border-border">
      {sales.map((sale) => (
        <div key={sale.id} className="flex items-center justify-between p-3 text-sm">
          <div>
            <div className="font-medium">#{sale.advertisedId}</div>
            <div className="text-xs text-muted-foreground">
              {sale.createdAt ? new Date(sale.createdAt).toLocaleDateString() : ""} · {sale.deliveryMethod}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{sale?.status?.displayName || sale?.status?.statusId}</Badge>
            <span className="font-semibold">${Number(sale.finalPayable ?? 0).toFixed(2)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
