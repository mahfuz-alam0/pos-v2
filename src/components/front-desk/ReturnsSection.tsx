"use client";

import { useEffect, useState } from "react";
import { getReturnsList } from "@/services/sales/getReturnsList";

export default function ReturnsSection({ customerId }) {
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!customerId) return;
    setLoading(true);
    getReturnsList([{ name: "customerId", value: customerId }])
      .then((res) => setReturns(res?.data?.data?.returns || res?.data?.data?.saleReturns || []))
      .finally(() => setLoading(false));
  }, [customerId]);

  if (loading) return <div className="py-8 text-center text-sm text-muted-foreground">Loading returns…</div>;
  if (returns.length === 0) return <div className="py-8 text-center text-sm text-muted-foreground">No returns on record</div>;

  return (
    <div className="divide-y divide-border overflow-hidden rounded-xl border border-border">
      {returns.map((ret) => (
        <div key={ret.id} className="flex items-center justify-between p-3 text-sm">
          <div>
            <div className="font-medium">#{ret.advertisedId || ret.id}</div>
            <div className="text-xs text-muted-foreground">
              {ret.createdAt ? new Date(ret.createdAt).toLocaleDateString() : ""}
            </div>
          </div>
          <span className="font-semibold">${Number(ret.totalRefundAmount ?? ret.finalPayable ?? 0).toFixed(2)}</span>
        </div>
      ))}
    </div>
  );
}
