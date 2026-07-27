"use client";

import { useState, useMemo, useEffect } from "react";
import {
  DollarSign,
  Percent,
  LayoutGrid,
  CheckCircle2,
  ChevronRight,
  Trophy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Drawer from "@/components/ui/Drawer";

// Discount presentation per off-type. formatValue mirrors the old OFF_TYPE_META.
const OFF_TYPE_META = {
  NEW_UNIT_PRICE: {
    label: "New Unit Price",
    className: "text-[#fa541c] bg-[#fff2e8] border-[#ffbb96]",
    Icon: DollarSign,
    formatValue: (v) => `$${v}`,
    suffix: "/ unit",
  },
  UNIT_AMOUNT_OFF: {
    label: "Amount Off per Unit",
    className: "text-[#389e0d] bg-[#f6ffed] border-[#b7eb8f]",
    Icon: DollarSign,
    formatValue: (v) => `-$${v}`,
    suffix: "/ unit",
  },
  PERCENTAGE_OFF: {
    label: "Percentage Off",
    className: "text-[#096dd9] bg-[#e6f4ff] border-[#91caff]",
    Icon: Percent,
    formatValue: (v) => `${v}%`,
    suffix: "off",
  },
};

function TierCard({ tier, index, isSelected, isRecommended, measurementType, onClick }) {
  const meta = OFF_TYPE_META[tier.offType] || OFF_TYPE_META.UNIT_AMOUNT_OFF;
  return (
    <div
      onClick={onClick}
      className={`relative cursor-pointer rounded-xl border-2 p-4 transition-all ${
        isSelected
          ? "border-[#1677ff] bg-[#e6f4ff] shadow-[0_0_0_3px_rgba(22,119,255,0.12)]"
          : "border-neutral-200 bg-white shadow-sm"
      }`}
    >
      {isRecommended && (
        <span className="absolute -top-2.5 right-3 flex items-center gap-1 rounded-full bg-[#fa8c16] px-2 py-0.5 text-[10px] font-bold text-white">
          <Trophy className="size-2.5" /> BEST DEAL
        </span>
      )}

      <div className="flex items-center justify-between">
        <div className="flex flex-1 flex-col gap-0.5">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Tier {index + 1}
          </span>
          <div className="mt-0.5 flex items-center gap-1.5">
            <span
              className={`rounded-full px-3 py-1 text-[13px] font-bold transition-all ${
                isSelected ? "bg-[#1677ff] text-white" : "bg-neutral-100 text-neutral-600"
              }`}
            >
              Buy {tier.buyMinimum}+
            </span>
            <span className="text-[11px] text-muted-foreground">
              {measurementType === "QUANTITY"
                ? "units"
                : measurementType?.toLowerCase() || "units"}
            </span>
          </div>
        </div>

        <ChevronRight className="mx-2 size-3 text-neutral-300" />

        <div className={`flex min-w-[90px] flex-col items-center gap-0.5 rounded-xl border px-3.5 py-2 ${meta.className}`}>
          <span className="text-[22px] font-extrabold leading-none">
            {meta.formatValue(tier.offAmount)}
          </span>
          <span className="text-[10px] font-semibold">{meta.suffix}</span>
          <span className="mt-0.5 text-[10px] text-neutral-500">{meta.label}</span>
        </div>
      </div>

      {isSelected && (
        <div className="mt-2.5 flex items-center gap-1.5 text-[#1677ff]">
          <CheckCircle2 className="size-3" />
          <span className="text-xs font-semibold">Selected</span>
        </div>
      )}
    </div>
  );
}

/**
 * Tiered-deal picker. Buy-more-get-more: each tier has a buyMinimum threshold
 * and an offType/offAmount. Highest tier is recommended; first tier auto-selects.
 *
 * Props:
 *   visible     — open state.
 *   onClose     — close handler.
 *   dealData    — { dealId, dealName, description, tieredDealInfo{tiers[],
 *                 targetEntity, measurementType, shouldAllowMixAndMatch,
 *                 shouldAllowAutoApply}, usageRule, allowedStacks, onGoingTotalUsage }
 *   onApplyDeal — called with { dealId, dealName, selectedTier, selectedTierIndex,
 *                 tieredDealInfo }.
 */
export default function TieredDealDrawer({ visible, onClose, dealData, onApplyDeal }) {
  const [selectedTierIndex, setSelectedTierIndex] = useState(null);

  const tiers = useMemo(() => dealData?.tieredDealInfo?.tiers || [], [dealData]);

  useEffect(() => {
    if (visible) {
      setSelectedTierIndex(tiers.length > 0 ? 0 : null);
    } else {
      setSelectedTierIndex(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, dealData]);

  const targetEntity = dealData?.tieredDealInfo?.targetEntity;
  const measurementType = dealData?.tieredDealInfo?.measurementType || "QUANTITY";
  const mixAndMatch = dealData?.tieredDealInfo?.shouldAllowMixAndMatch;
  const autoApply = dealData?.tieredDealInfo?.shouldAllowAutoApply;

  // Highest-tier (most buying) is the recommended best deal.
  const recommendedIndex = useMemo(() => {
    if (tiers.length <= 1) return 0;
    return tiers.length - 1;
  }, [tiers]);

  const selectedTier = selectedTierIndex !== null ? tiers[selectedTierIndex] : null;
  const selectedMeta = selectedTier
    ? OFF_TYPE_META[selectedTier.offType] || OFF_TYPE_META.UNIT_AMOUNT_OFF
    : null;

  const handleApply = () => {
    if (!selectedTier || !dealData) return;
    onApplyDeal?.({
      dealId: dealData.dealId,
      dealName: dealData.dealName,
      selectedTier,
      selectedTierIndex,
      tieredDealInfo: dealData.tieredDealInfo,
    });
  };

  const InfoChip = ({ label, value, positive = undefined }: any) => (
    <div className="flex flex-col gap-1 rounded-lg border border-neutral-100 bg-neutral-50 px-3.5 py-2.5">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span
        className={`flex items-center gap-1.5 text-[13px] font-semibold ${
          positive === true
            ? "text-[#389e0d]"
            : positive === false
              ? "text-neutral-400"
              : "text-neutral-800"
        }`}
      >
        {positive === true && <CheckCircle2 className="size-3.5 text-green-500" />}
        {value}
      </span>
    </div>
  );

  return (
    <Drawer open={visible} onClose={onClose} side="right" size={480}>
      <div className="flex h-full flex-col bg-[#f5f5f5]">
        <div className="flex-1 overflow-auto">
          {dealData ? (
            <>
              {/* Header banner */}
              <div className="bg-gradient-to-br from-[#1677ff] to-[#0050b3] px-6 pb-5 pt-6 text-white">
                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center rounded-lg bg-white/20 px-2.5 py-2 text-xl">
                    <LayoutGrid className="size-5" />
                  </div>
                  <div className="flex-1">
                    <span className="block text-[11px] font-semibold uppercase tracking-wider text-white/70">
                      Tiered Deal
                    </span>
                    <h4 className="my-1 text-lg font-semibold leading-tight">
                      {dealData.dealName || "Tiered Deal"}
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-semibold">
                        {targetEntity || "ALL"}
                      </span>
                      {mixAndMatch && (
                        <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-semibold">
                          Mix &amp; Match
                        </span>
                      )}
                      {autoApply && (
                        <span className="rounded-full bg-[#52c41a]/30 px-2.5 py-0.5 text-[11px] font-semibold text-[#d9f7be]">
                          Auto Apply
                        </span>
                      )}
                      <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-semibold">
                        {measurementType}
                      </span>
                    </div>
                  </div>
                </div>
                {dealData.description && (
                  <p className="mt-3 text-xs text-white/75">{dealData.description}</p>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 px-5 pt-5">
                <div className="mb-5">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm font-semibold text-neutral-800">
                      Select a Tier
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {tiers.length} tier{tiers.length !== 1 ? "s" : ""} available
                    </span>
                  </div>

                  <div className="flex flex-col gap-2.5">
                    {tiers.map((tier, idx) => (
                      <TierCard
                        key={idx}
                        tier={tier}
                        index={idx}
                        isSelected={selectedTierIndex === idx}
                        isRecommended={tiers.length > 1 && idx === recommendedIndex}
                        measurementType={measurementType}
                        onClick={() => setSelectedTierIndex(idx)}
                      />
                    ))}
                  </div>
                </div>

                {selectedTier && selectedMeta && (
                  <div className={`mb-5 flex items-center gap-3 rounded-xl border px-4 py-3.5 ${selectedMeta.className}`}>
                    <selectedMeta.Icon className="size-6" />
                    <div>
                      <span className="block text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                        Selected Tier Summary
                      </span>
                      <span className="mt-0.5 block text-[13px] font-semibold text-neutral-800">
                        Buy <strong className="text-[#1677ff]">{selectedTier.buyMinimum}+</strong>{" "}
                        {measurementType === "QUANTITY" ? "units" : ""} →{" "}
                        <strong>
                          {selectedTier.offType === "NEW_UNIT_PRICE"
                            ? `$${selectedTier.offAmount} new unit price`
                            : selectedTier.offType === "PERCENTAGE_OFF"
                              ? `${selectedTier.offAmount}% off`
                              : `$${selectedTier.offAmount} off per unit`}
                        </strong>
                      </span>
                    </div>
                  </div>
                )}

                {/* Deal info */}
                <div className="mb-5">
                  <span className="mb-2.5 block text-[13px] font-semibold text-neutral-800">
                    Deal Details
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <InfoChip label="Mix & Match" value={mixAndMatch ? "Allowed" : "Not Allowed"} positive={mixAndMatch} />
                    <InfoChip label="Auto Apply" value={autoApply ? "Yes" : "No"} positive={autoApply} />
                    {dealData.usageRule?.totalUsageLimit?.isEnabled && (
                      <InfoChip label="Total Usage Limit" value={dealData.usageRule.totalUsageLimit.value} />
                    )}
                    {dealData.usageRule?.totalUsageLimitPerUser?.isEnabled && (
                      <InfoChip label="Per User Limit" value={dealData.usageRule.totalUsageLimitPerUser.value} />
                    )}
                    {dealData.usageRule?.maximumApplicableDiscount?.isEnabled && (
                      <InfoChip label="Max Discount" value={`$${dealData.usageRule.maximumApplicableDiscount.value}`} />
                    )}
                    {dealData.onGoingTotalUsage !== undefined && (
                      <InfoChip label="Times Used" value={dealData.onGoingTotalUsage} />
                    )}
                  </div>
                </div>

                {dealData.allowedStacks?.length > 0 && (
                  <div className="mb-5">
                    <span className="mb-2 block text-[13px] font-semibold text-neutral-800">
                      Stackable With
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {dealData.allowedStacks.map((stack) => (
                        <Badge key={stack} className="rounded-full bg-cyan-100 font-semibold text-cyan-700">
                          {stack}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
              No deal data available.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border bg-white px-4 py-3">
          <Button variant="outline" onClick={onClose} className="min-w-[90px]">
            Cancel
          </Button>
          <Button
            disabled={selectedTierIndex === null}
            onClick={handleApply}
            className="min-w-[160px] font-semibold"
          >
            Apply Tier {selectedTierIndex !== null ? selectedTierIndex + 1 : ""}
          </Button>
        </div>
      </div>
    </Drawer>
  );
}
