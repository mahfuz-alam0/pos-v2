"use client";

import { useState, useEffect, useMemo } from "react";
import { Info, Search } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import { getQuoteForSales } from "@/services/sales/getQuoteforSales";
import { quoteApiManager } from "@/utils/quoteApiManager";
import { updateSalesDetail } from "@/store/slices/salesDetailSlice";
import { getQuoteForSale } from "@/store/slices/quoteForSaleSlice";
import useDiscountTypes from "@/hooks/useDiscountTypes";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import Drawer from "@/components/ui/Drawer";
import DealDetails from "./DealDetails";

/**
 * Regular-deal table with per-deal Apply/Remove. Maintains
 * salesDetail.applicableRegularDeals (matched on dealId+packageId+productId,
 * plus appMaintainedId when productRecord carries one — two cart lines for
 * the same product/package are otherwise indistinguishable, so applying a
 * deal from one row would show as "Applied" on both).
 *
 * Props:
 *   deals          — array of applicable regular-deal objects.
 *   productRecord  — the cart line this card is scoped to (per-row usage);
 *                     null for the bulk "apply to selected items" drawer,
 *                     which intentionally matches by product only.
 *   onDealApplied  — optional callback fired after a successful apply.
 */
export default function DealCard({ deals = [], productRecord, onDealApplied }) {
  const [dealStates, setDealStates] = useState({});
  const [visible, setVisible] = useState(false);
  const [deal, setDealDetails] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredDeals = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return deals;
    return deals.filter((d) => (d.dealName || "").toLowerCase().includes(term));
  }, [deals, searchTerm]);

  const quoteBody = useSelector((state: any) => state?.salesDetail);
  const dispatch = useDispatch();
  const { discountTypes } = useDiscountTypes();
  const isDisabled = !discountTypes.includes("DEAL");

  const appliedDeals = useSelector(
    (state: any) => state?.salesDetail?.applicableRegularDeals || []
  );

  // Scoped to this specific cart line (via appMaintainedId) when
  // productRecord is provided; otherwise falls back to matching by
  // product/package only, for the bulk drawer's "any matching item" semantics.
  const matchesRecord = (ad, dealId, packageId, productId) =>
    ad.dealId === dealId &&
    ad.packageId === packageId &&
    ad.productId === productId &&
    (productRecord?.appMaintainedId
      ? ad.appMaintainedId === productRecord.appMaintainedId
      : true);

  useEffect(() => {
    const dealStatesMap = {};
    deals.forEach((d) => {
      const { dealId, packageId, productId } = d;
      const isApplied = appliedDeals.some((ad) =>
        matchesRecord(ad, dealId, packageId, productId)
      );
      dealStatesMap[dealId] = { applied: isApplied, dealInfo: d };
    });
    setDealStates(dealStatesMap);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quoteBody, productRecord?.appMaintainedId]);

  const handleCancel = () => setVisible(false);
  const handleShowDealDetails = (item) => {
    setDealDetails(item);
    setVisible(true);
  };

  const applyDealToSelectedProduct = (item) => {
    const dealId = item.dealId;
    setDealStates((prev) => ({ ...prev, [dealId]: { loading: true } }));

    const applyDeal = {
      packageId: item.packageId,
      productId: item.productId,
      dealId: item.dealId,
      ...(productRecord?.appMaintainedId
        ? { appMaintainedId: productRecord.appMaintainedId }
        : {}),
    };
    const updatedApplicableDeals = [
      ...(quoteBody?.applicableRegularDeals || []),
      applyDeal,
    ];

    dispatch(
      updateSalesDetail({ applicableRegularDeals: updatedApplicableDeals })
    );
    quoteApiManager
      .call(
        getQuoteForSales,
        { ...quoteBody, applicableRegularDeals: updatedApplicableDeals },
        "deal-card-apply"
      )
      .then((res) => {
        dispatch(getQuoteForSale(res.data));
        setDealStates((prev) => ({
          ...prev,
          [dealId]: { loading: false, applied: true },
        }));
        toast.success("Deal applied successfully");
        onDealApplied?.();
      })
      .catch(() => {
        setDealStates((prev) => ({
          ...prev,
          [dealId]: { loading: false, applied: false },
        }));
        toast.error("Error applying deal");
      });
  };

  const removeDealFromSelectedProduct = (item) => {
    const dealId = item.dealId;
    setDealStates((prev) => ({ ...prev, [dealId]: { removing: true } }));

    const removeDeal = {
      packageId: item.packageId,
      productId: item.productId,
      dealId: item.dealId,
    };
    // Matches the old logic exactly: filter on dealId + productId (not
    // packageId) — plus appMaintainedId when this card is scoped to one
    // specific cart line, so removing from one row doesn't also drop the
    // deal from a duplicate line for the same product.
    const updatedApplicableDeals = quoteBody?.applicableRegularDeals?.filter(
      (d) =>
        !(
          d.dealId === removeDeal.dealId &&
          d.productId === removeDeal.productId &&
          (productRecord?.appMaintainedId
            ? d.appMaintainedId === productRecord.appMaintainedId
            : true)
        )
    );

    dispatch(
      updateSalesDetail({ applicableRegularDeals: updatedApplicableDeals })
    );
    quoteApiManager
      .call(
        getQuoteForSales,
        { ...quoteBody, applicableRegularDeals: updatedApplicableDeals },
        "deal-card-remove"
      )
      .then((res) => {
        dispatch(getQuoteForSale(res.data));
        setDealStates((prev) => ({
          ...prev,
          [dealId]: { removing: false, applied: false },
        }));
        toast.success("Deal removed successfully");
      })
      .catch(() => {
        setDealStates((prev) => ({
          ...prev,
          [dealId]: { removing: false, applied: true },
        }));
        toast.error("Error removing deal");
      });
  };

  return (
    <>
      {deals.length > 0 && (
        <div className="relative mb-3 max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search deals..."
            className="pl-8"
          />
        </div>
      )}

      {deals.length === 0 ? (
        <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
          No deals available
        </div>
      ) : filteredDeals.length === 0 ? (
        <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
          No deals match &quot;{searchTerm}&quot;
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="py-2 pr-2 font-medium">Deal Name</th>
                <th className="px-2 py-2 text-center font-medium">Action</th>
                <th className="px-2 py-2 text-center font-medium">Discount</th>
                <th className="px-2 py-2 text-center font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredDeals.map((item) => {
                const { loading, applied, removing } =
                  dealStates[item.dealId] || {};
                return (
                  <tr key={item.dealId} className="border-b border-border/50">
                    <td className="py-2 pr-2">
                      <span
                        className="cursor-pointer font-semibold"
                        title={item.dealName}
                        onClick={() => handleShowDealDetails(item)}
                      >
                        {item.dealName}
                      </span>
                    </td>
                    <td className="px-2 py-2 text-center">
                      <span
                        title={
                          isDisabled
                            ? "This discount source is disabled. Enable it from settings."
                            : ""
                        }
                      >
                        <Button
                          size="sm"
                          variant={applied ? "destructive" : "default"}
                          disabled={loading || removing || isDisabled}
                          onClick={() =>
                            applied
                              ? removeDealFromSelectedProduct(item)
                              : applyDealToSelectedProduct(item)
                          }
                        >
                          {loading || removing
                            ? "..."
                            : applied
                              ? "Remove Deal"
                              : "Apply Deal"}
                          {isDisabled && (
                            <Info className="ml-1 size-3 text-red-500" />
                          )}
                        </Button>
                      </span>
                    </td>
                    <td className="px-2 py-2 text-center">
                      <Badge className="bg-green-100 text-green-700">
                        {item.regularDealInfo?.discountRate}
                        {item.regularDealInfo?.discountType === "PERCENTAGE"
                          ? "% OFF"
                          : "$ OFF"}
                      </Badge>
                    </td>
                    <td className="px-2 py-2 text-center">
                      <Badge
                        variant={applied ? "default" : "secondary"}
                        className={
                          applied ? "bg-green-100 text-green-700" : undefined
                        }
                      >
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

      <Drawer open={visible} onClose={handleCancel} side="right" size={500}>
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h3 className="text-base font-semibold">{deal?.dealName}</h3>
            <button onClick={handleCancel} className="text-muted-foreground">
              ✕
            </button>
          </div>
          <div className="flex-1 overflow-auto">
            {deal && <DealDetails deal={deal} />}
          </div>
        </div>
      </Drawer>
    </>
  );
}
