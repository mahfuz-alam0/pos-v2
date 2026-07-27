"use client";

import { useState, useEffect } from "react";
import { Info } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import { getQuoteForSales } from "@/services/sales/getQuoteforSales";
import { quoteApiManager } from "@/utils/quoteApiManager";
import { updateSalesDetail } from "@/store/slices/salesDetailSlice";
import { getQuoteForSale } from "@/store/slices/quoteForSaleSlice";
import useDiscountTypes from "@/hooks/useDiscountTypes";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Drawer from "@/components/ui/Drawer";
import DealDetails from "./DealDetails";

/**
 * Regular-deal table with per-deal Apply/Remove. Maintains
 * salesDetail.applicableRegularDeals (matched on dealId+packageId+productId)
 * and re-quotes on every change.
 *
 * Props:
 *   deals          — array of applicable regular-deal objects.
 *   productRecord  — (unused here, kept for parity with old signature).
 *   onDealApplied  — optional callback fired after a successful apply.
 */
export default function DealCard({ deals = [], productRecord, onDealApplied }) {
  const [dealStates, setDealStates] = useState({});
  const [visible, setVisible] = useState(false);
  const [deal, setDealDetails] = useState(null);

  const quoteBody = useSelector((state: any) => state?.salesDetail);
  const dispatch = useDispatch();
  const { discountTypes } = useDiscountTypes();
  const isDisabled = !discountTypes.includes("DEAL");

  const appliedDeals = useSelector(
    (state: any) => state?.salesDetail?.applicableRegularDeals || []
  );

  useEffect(() => {
    const dealStatesMap = {};
    deals.forEach((d) => {
      const { dealId, packageId, productId } = d;
      const isApplied = appliedDeals.some(
        (ad) =>
          ad.dealId === dealId &&
          ad.packageId === packageId &&
          ad.productId === productId
      );
      dealStatesMap[dealId] = { applied: isApplied, dealInfo: d };
    });
    setDealStates(dealStatesMap);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quoteBody]);

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
    // Matches the old logic exactly: filter on dealId + productId (not packageId).
    const updatedApplicableDeals = quoteBody?.applicableRegularDeals?.filter(
      (d) =>
        !(d.dealId === removeDeal.dealId && d.productId === removeDeal.productId)
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
      {deals.length === 0 ? (
        <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
          No deals available
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
              {deals.map((item) => {
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
