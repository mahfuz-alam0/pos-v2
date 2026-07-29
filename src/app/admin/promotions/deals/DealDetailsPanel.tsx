"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { X } from "lucide-react";

import { fetchSingleRegularDeal } from "@/services/deals/regular/getSingle";
import { fetchSingleBogoDeal } from "@/services/deals/bogo/getSingle";
import { fetchSingleTieredDeal } from "@/services/deals/tiered/getSingle";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { UsageHistoryPanel } from "@/components/promotions/UsageHistoryPanel";
import { DEAL_TYPE_BADGE_VARIANT } from "@/services/promotions/enums";
import type { DealType } from "./types";

export default function DealDetailsPanel({
  dealId,
  dealType,
  onClose,
  onEdit,
}: {
  dealId: string | number;
  dealType: DealType;
  onClose: () => void;
  onEdit: () => void;
}) {
  const [deal, setDeal] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [usageOpen, setUsageOpen] = useState(false);

  useEffect(() => {
    if (!dealId) return;
    setLoading(true);
    const fetcher = dealType === "REGULAR" ? fetchSingleRegularDeal : dealType === "BOGO" ? fetchSingleBogoDeal : fetchSingleTieredDeal;
    fetcher(dealId)
      .then((res) => setDeal(res?.data ?? null))
      .catch(() => toast.error("Failed to load deal details"))
      .finally(() => setLoading(false));
  }, [dealId, dealType]);

  const typeInfo =
    dealType === "REGULAR" ? deal?.regularDealInfo : dealType === "BOGO" ? deal?.bogoDealinfo ?? deal?.bogoDealInfo : deal?.tieredDealInfo;

  return (
    <div className="flex w-1/3 shrink-0 flex-col gap-4 overflow-hidden">
      <div className="flex flex-col overflow-hidden rounded-xl ring-1 ring-foreground/10">
        <div className="flex items-center justify-between px-4 py-3">
          <h2 className="text-sm font-semibold">Deal Details</h2>
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
          ) : !deal ? (
            <p className="py-4 text-sm text-muted-foreground">Deal not found.</p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {deal.imageUrl && <img src={deal.imageUrl} alt={deal.name} className="size-16 rounded-lg object-cover ring-1 ring-foreground/10" />}
              <Row label="Name" value={deal.name} />
              <div className="flex items-center gap-2">
                <span className="w-32 shrink-0 text-sm text-muted-foreground">Type:</span>
                <Badge variant={DEAL_TYPE_BADGE_VARIANT[dealType]}>{dealType}</Badge>
              </div>
              <Row label="Description" value={deal.description || "-"} />
              <Row label="Total Uses" value={String(deal.onGoingTotalUsage ?? 0)} />

              {dealType === "REGULAR" && (
                <>
                  <Row label="Discount" value={typeInfo?.discountType === "PERCENTAGE" ? `${typeInfo?.discountRate}%` : `$${typeInfo?.discountRate}`} />
                  <Row label="Target" value={typeInfo?.targetEntity ?? "-"} />
                </>
              )}
              {dealType === "BOGO" && (
                <>
                  <Row label="Buy" value={`${typeInfo?.buyMinimumExactQuantity ?? "-"} (${typeInfo?.buyProductScope ?? "-"})`} />
                  <Row label="Get" value={`${typeInfo?.getProductQuantity ?? "-"} (${typeInfo?.getProductType ?? "-"})`} />
                  <Row label="Discount" value={typeInfo?.discountType === "PERCENTAGE" ? `${typeInfo?.discountRate}%` : `$${typeInfo?.discountRate}`} />
                </>
              )}
              {dealType === "TIERED" && (
                <>
                  <Row label="Measurement" value={typeInfo?.measurementType ?? "-"} />
                  <Row label="Tiers" value={String(typeInfo?.tiers?.length ?? 0)} />
                </>
              )}

              <div className="flex items-start gap-2">
                <span className="w-32 shrink-0 text-sm text-muted-foreground">Stacks With:</span>
                <div className="flex flex-1 flex-wrap gap-1">
                  {(deal.allowedStacks ?? []).length === 0 ? (
                    <span className="text-sm">-</span>
                  ) : (
                    deal.allowedStacks.map((s: string) => (
                      <Badge key={s} variant="outline">
                        {s}
                      </Badge>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <UsageHistoryPanel open={usageOpen} onClose={() => setUsageOpen(false)} promoType="DEAL" id={dealId} title="Deal Usage History" />
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
