"use client";

import { useMemo, useState } from "react";
import { Info, Search } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import { getQuoteForSales } from "@/services/sales/getQuoteforSales";
import { quoteApiManager } from "@/utils/quoteApiManager";
import { updateSalesDetail } from "@/store/slices/salesDetailSlice";
import { getQuoteForSale } from "@/store/slices/quoteForSaleSlice";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import Drawer from "@/components/ui/Drawer";
import DealDetails from "./DealDetails";
import TieredDealDrawer from "./TieredDealDrawer";

const OFF_TYPE_LABEL: Record<string, (v: number) => string> = {
  NEW_UNIT_PRICE: (v) => `$${v}/unit`,
  UNIT_AMOUNT_OFF: (v) => `-$${v}/unit`,
  PERCENTAGE_OFF: (v) => `${v}% off`,
  UNIT_PERCENTAGE_OFF: (v) => `${v}% off/unit`,
};

const describeTier = (tier) => {
  if (!tier) return "";
  const label = OFF_TYPE_LABEL[tier.offType] || OFF_TYPE_LABEL.UNIT_AMOUNT_OFF;
  return `Buy ${tier.buyMinimum || 1}+, ${label(tier.offAmount || 0)}`;
};

/**
 * Tiered-deal table with per-deal Apply/Remove. Maintains
 * salesDetail.applicableTieredDeals (matched on dealId+productId, plus
 * appMaintainedId when the product carries one) and re-quotes on every
 * change. Only one tiered deal can be applied per product at a time
 * (no discountTypes gating — the old posTableDeals.js never gated tiered
 * deals behind a "TIERED_DEAL" discount source toggle).
 *
 * Props:
 *   tieredDeals   — array of applicable tiered-deal objects.
 *   productRecord — the cart product these deals apply to.
 *   onDealApplied — optional callback fired after a successful apply.
 */
export default function TieredDealCard({
  tieredDeals = [],
  productRecord,
  onDealApplied,
}) {
  const [dealStates, setDealStates] = useState({});
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [deal, setDealDetails] = useState(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const dispatch = useDispatch();
  const quoteBody = useSelector((state: any) => state?.salesDetail);
  const appliedTieredDeals = useSelector(
    (state: any) => state?.salesDetail?.applicableTieredDeals || [],
  );

  const matches = (d, dealId) =>
    d.dealId === dealId &&
    d.productId === productRecord?.productId &&
    (productRecord?.appMaintainedId
      ? d.appMaintainedId === productRecord.appMaintainedId
      : true);

  const isApplied = (dealId) =>
    appliedTieredDeals.some((d) => matches(d, dealId));

  const hasAnyApplied = appliedTieredDeals.some(
    (d) =>
      d.productId === productRecord?.productId &&
      (productRecord?.appMaintainedId
        ? d.appMaintainedId === productRecord.appMaintainedId
        : true),
  );

  const filteredTieredDeals = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return tieredDeals;
    return tieredDeals.filter((d) =>
      (d.dealName || "").toLowerCase().includes(term),
    );
  }, [tieredDeals, searchTerm]);

  const handleShowDealDetails = (item) => {
    setDealDetails(item);
    setDetailsVisible(true);
  };

  const handleApplyTier = ({ dealId, selectedTier, selectedTierIndex }) => {
    setDealStates((prev) => ({ ...prev, [dealId]: { loading: true } }));

    const newEntry = {
      productId: productRecord?.productId,
      dealId,
      preferredTieredOrderIndexStartingFromOne: selectedTierIndex + 1,
      ...(productRecord?.appMaintainedId
        ? { appMaintainedId: productRecord.appMaintainedId }
        : {}),
    };
    const filtered = (quoteBody?.applicableTieredDeals || []).filter(
      (d) => !matches(d, dealId),
    );
    const updatedApplicableTieredDeals = [...filtered, newEntry];

    dispatch(
      updateSalesDetail({
        applicableTieredDeals: updatedApplicableTieredDeals,
      }),
    );
    quoteApiManager
      .call(
        getQuoteForSales,
        { ...quoteBody, applicableTieredDeals: updatedApplicableTieredDeals },
        "tiered-card-apply",
      )
      .then((res) => {
        dispatch(getQuoteForSale(res.data));
        setDealStates((prev) => ({
          ...prev,
          [dealId]: { loading: false, applied: true },
        }));
        toast.success(
          `Tier applied: Buy ${selectedTier.buyMinimum}+ units — ${describeTier(
            selectedTier,
          ).split(", ")[1]}`,
        );
        setDrawerVisible(false);
        setSelectedDeal(null);
        onDealApplied?.();
      })
      .catch(() => {
        setDealStates((prev) => ({
          ...prev,
          [dealId]: { loading: false, applied: false },
        }));
        toast.error("Failed to apply tiered deal");
      });
  };

  const handleRemoveTier = (item) => {
    const dealId = item.dealId;
    setDealStates((prev) => ({ ...prev, [dealId]: { removing: true } }));

    const filtered = (quoteBody?.applicableTieredDeals || []).filter(
      (d) => !matches(d, dealId),
    );

    dispatch(updateSalesDetail({ applicableTieredDeals: filtered }));
    quoteApiManager
      .call(
        getQuoteForSales,
        { ...quoteBody, applicableTieredDeals: filtered },
        "tiered-card-remove",
      )
      .then((res) => {
        dispatch(getQuoteForSale(res.data));
        setDealStates((prev) => ({
          ...prev,
          [dealId]: { removing: false, applied: false },
        }));
        toast.success(`Tiered deal "${item.dealName}" removed`);
      })
      .catch(() => {
        setDealStates((prev) => ({
          ...prev,
          [dealId]: { removing: false, applied: true },
        }));
        toast.error("Failed to remove tiered deal");
      });
  };

  if (!tieredDeals || tieredDeals.length === 0) {
    return (
      <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
        No tiered deals available
      </div>
    );
  }

  return (
    <>
      <div className="relative mb-3 max-w-xs">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search tiered deals..."
          className="pl-8"
        />
      </div>

      {filteredTieredDeals.length === 0 ? (
        <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
          No tiered deals match &quot;{searchTerm}&quot;
        </div>
      ) : (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="py-2 pr-2 font-medium">Deal Name</th>
              <th className="px-2 py-2 font-medium">Tiers</th>
              <th className="px-2 py-2 text-center font-medium">Action</th>
              <th className="px-2 py-2 text-center font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredTieredDeals.map((item) => {
              const applied = isApplied(item.dealId);
              const state: any = dealStates[item.dealId] || {};
              const isProcessing = state.loading || state.removing;
              const blockedByOther = hasAnyApplied && !applied;
              const tiers = item.tieredDealInfo?.tiers || [];

              return (
                <tr key={item.dealId} className="border-b border-border/50">
                  <td className="py-2 pr-2 align-top">
                    <span
                      className="cursor-pointer font-semibold"
                      title={item.dealName}
                      onClick={() => handleShowDealDetails(item)}>
                      {item.dealName || "Tiered Deal"}
                    </span>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {describeTier(tiers[0])}
                    </div>
                  </td>
                  <td className="px-2 py-2 align-top">
                    <div className="flex flex-wrap gap-1">
                      {tiers.map((tier, idx) => (
                        <Badge
                          key={idx}
                          variant="outline"
                          className="whitespace-nowrap">
                          {describeTier(tier)}
                        </Badge>
                      ))}
                    </div>
                  </td>
                  <td className="px-2 py-2 text-center align-top">
                    <span
                      title={
                        blockedByOther
                          ? "Another tiered deal is already applied to this product."
                          : ""
                      }>
                      <Button
                        size="sm"
                        variant={applied ? "destructive" : "default"}
                        disabled={isProcessing || blockedByOther}
                        onClick={() => {
                          if (applied) {
                            handleRemoveTier(item);
                          } else {
                            setSelectedDeal(item);
                            setDrawerVisible(true);
                          }
                        }}>
                        {isProcessing ? "..." : applied ? "Remove" : "Apply"}
                        {blockedByOther && (
                          <Info className="ml-1 size-3 text-orange-500" />
                        )}
                      </Button>
                    </span>
                  </td>
                  <td className="px-2 py-2 text-center align-top">
                    <Badge
                      variant={applied ? "default" : "secondary"}
                      className={
                        applied ? "bg-green-100 text-green-700" : undefined
                      }>
                      {applied ? "Applied" : "Not Applied"}
                    </Badge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      )}

      <Drawer
        open={detailsVisible}
        onClose={() => setDetailsVisible(false)}
        side="right"
        size={500}>
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h3 className="text-base font-semibold">
              {deal?.dealName || "Tiered Deal Details"}
            </h3>
            <button
              onClick={() => setDetailsVisible(false)}
              className="text-muted-foreground">
              ✕
            </button>
          </div>
          <div className="flex-1 overflow-auto">
            {deal && <DealDetails deal={deal} />}
          </div>
        </div>
      </Drawer>

      <TieredDealDrawer
        visible={drawerVisible}
        onClose={() => {
          setDrawerVisible(false);
          setSelectedDeal(null);
        }}
        dealData={selectedDeal}
        onApplyDeal={handleApplyTier}
      />
    </>
  );
}
