"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { X } from "lucide-react";

import { fetchSingleCoupon } from "@/services/coupons/getSingle";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { UsageHistoryPanel } from "@/components/promotions/UsageHistoryPanel";

export default function CouponDetailsPanel({
  couponId,
  onClose,
  onEdit,
}: {
  couponId: string | number;
  onClose: () => void;
  onEdit: () => void;
}) {
  const [coupon, setCoupon] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [usageOpen, setUsageOpen] = useState(false);

  useEffect(() => {
    if (!couponId) return;
    setLoading(true);
    fetchSingleCoupon(couponId)
      .then((res) => setCoupon(res?.data ?? null))
      .catch(() => toast.error("Failed to load coupon details"))
      .finally(() => setLoading(false));
  }, [couponId]);

  return (
    <div className="flex w-1/3 shrink-0 flex-col gap-4 overflow-hidden">
      <div className="flex flex-col overflow-hidden rounded-xl ring-1 ring-foreground/10">
        <div className="flex items-center justify-between px-4 py-3">
          <h2 className="text-sm font-semibold">Coupon Details</h2>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setUsageOpen(true)}>
              Usage
            </Button>
            <Button size="sm" onClick={onEdit}>
              Edit
            </Button>
            <Button variant="outline" size="icon" onClick={onClose} className="size-7 shrink-0">
              <X className="size-4" />
            </Button>
          </div>
        </div>
        <div className="h-px bg-border" />

        <div className="flex-1 overflow-y-auto px-4 py-3">
          {loading ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-5 w-full" />
              ))}
            </div>
          ) : !coupon ? (
            <p className="py-4 text-sm text-muted-foreground">Coupon not found.</p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {coupon.imageUrl && (
                <img src={coupon.imageUrl} alt={coupon.name} className="size-16 rounded-lg object-cover ring-1 ring-foreground/10" />
              )}
              <Row label="Name" value={coupon.name} />
              <Row label="Code" value={coupon.couponCode} />
              <Row label="Discount" value={coupon.discountType === "PERCENTAGE" ? `${coupon.discountRate}%` : `$${coupon.discountRate}`} />
              <Row label="Description" value={coupon.description || "-"} />
              <Row label="Total Uses" value={String(coupon.onGoingTotalUsage ?? 0)} />
              <div className="flex items-start gap-2">
                <span className="w-32 shrink-0 text-sm text-muted-foreground">Stacks With:</span>
                <div className="flex flex-1 flex-wrap gap-1">
                  {(coupon.allowedStacks ?? []).length === 0 ? (
                    <span className="text-sm">-</span>
                  ) : (
                    coupon.allowedStacks.map((s: string) => (
                      <Badge key={s} variant="outline">
                        {s}
                      </Badge>
                    ))
                  )}
                </div>
              </div>
              <Row
                label="Customer Types"
                value={coupon.shouldConsiderCustomerTypes ? `${coupon.allowedCustomerTypeIds?.length ?? 0} selected` : "All"}
              />
              <Row
                label="Customer Groups"
                value={coupon.shouldConsiderCustomerGroups ? `${coupon.allowedCustomerGroupIds?.length ?? 0} selected` : "All"}
              />
              <Row label="Sale Sources" value={coupon.allowAllSaleSources ? "All" : (coupon.allowedSaleSources ?? []).join(", ") || "-"} />
              <Row
                label="Delivery Methods"
                value={coupon.allowAllDeliveryMethods ? "All" : (coupon.allowedDeliveryMethods ?? []).join(", ") || "-"}
              />
            </div>
          )}
        </div>
      </div>

      <UsageHistoryPanel open={usageOpen} onClose={() => setUsageOpen(false)} promoType="COUPON" id={couponId} title="Coupon Usage History" />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-32 shrink-0 text-sm text-muted-foreground">{label}:</span>
      <span className="flex-1 text-sm font-medium">{value}</span>
    </div>
  );
}
