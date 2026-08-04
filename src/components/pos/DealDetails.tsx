"use client";

/**
 * Read-only detail panel for a deal. Handles BOGO deals (deal.bogoDealInfo),
 * tiered deals (deal.tieredDealInfo), and regular deals (deal.regularDealInfo).
 * Rendered inside the deal drawer opened from DealCard / BogoDealCard /
 * TieredDealCard.
 *
 * Props:
 *   deal — deal object (dealName, bogoDealInfo|tieredDealInfo|regularDealInfo,
 *          usageRule, allowedStacks, expiryInfo, ...)
 */
export default function DealDetails({ deal }) {
  const isBogoDeal = Boolean(deal?.bogoDealInfo);
  const isTieredDeal = Boolean(deal?.tieredDealInfo);
  const dealInfo = isBogoDeal
    ? deal.bogoDealInfo
    : isTieredDeal
      ? deal.tieredDealInfo
      : deal.regularDealInfo;

  const Row = ({ label, value }) => (
    <div className="mb-2 flex justify-between">
      <span className="font-medium text-muted-foreground">{label}</span>
      <span className="font-semibold text-foreground">{value}</span>
    </div>
  );

  return (
    <div className="p-4">
      <h2 className="mb-4 text-xl font-bold">{deal?.dealName}</h2>

      {isBogoDeal ? (
        <>
          <Row label="Deal Type:" value="BOGO Deal" />
          <Row
            label="Buy Quantity:"
            value={dealInfo?.buyMinimumExactQuantity || 1}
          />
          <Row label="Get Quantity:" value={dealInfo?.getProductQuantity || 1} />
          <Row
            label="Discount Rate:"
            value={`${dealInfo?.discountRate || 0}${
              dealInfo?.discountType === "PERCENTAGE" ? "%" : "$"
            }`}
          />
          <Row
            label="Buy Product Scope:"
            value={dealInfo?.buyProductScope || "Not specified"}
          />
          <Row
            label="Get Product Type:"
            value={dealInfo?.getProductType || "Not specified"}
          />
          <Row
            label="Discount Target:"
            value={dealInfo?.discountTargetType || "Not specified"}
          />
          {dealInfo?.userPickedProductScopes && (
            <Row
              label="User Picked Scope:"
              value={dealInfo.userPickedProductScopes}
            />
          )}
          {dealInfo?.isGetProductAmountCapApplicable && (
            <Row
              label="Amount Cap:"
              value={
                dealInfo.isGetProductAmountCapApplicable
                  ? `$${dealInfo.getProductAmountCap || 0}`
                  : "No Cap"
              }
            />
          )}
        </>
      ) : isTieredDeal ? (
        <>
          <Row label="Deal Type:" value="Tiered Deal" />
          <Row label="Target Entity:" value={dealInfo?.targetEntity || "Not specified"} />
          <Row
            label="Measurement Type:"
            value={dealInfo?.measurementType || "QUANTITY"}
          />
          <Row
            label="Mix & Match:"
            value={dealInfo?.shouldAllowMixAndMatch ? "Allowed" : "Not Allowed"}
          />
          <Row
            label="Auto Apply:"
            value={dealInfo?.shouldAllowAutoApply ? "Yes" : "No"}
          />
          {(dealInfo?.tiers || []).map((tier, idx) => (
            <Row
              key={idx}
              label={`Tier ${idx + 1}:`}
              value={
                tier.offType === "NEW_UNIT_PRICE"
                  ? `Buy ${tier.buyMinimum}+ → $${tier.offAmount}/unit`
                  : tier.offType === "PERCENTAGE_OFF" ||
                      tier.offType === "UNIT_PERCENTAGE_OFF"
                    ? `Buy ${tier.buyMinimum}+ → ${tier.offAmount}% off`
                    : `Buy ${tier.buyMinimum}+ → $${tier.offAmount} off/unit`
              }
            />
          ))}
        </>
      ) : (
        <>
          <Row label="Deal Type:" value="Regular Deal" />
          <Row
            label="Discount Rate:"
            value={`${dealInfo?.discountRate}${
              dealInfo?.discountType === "PERCENTAGE" ? "%" : "$"
            }`}
          />
          <Row label="Target Entity:" value={dealInfo?.targetEntity} />
        </>
      )}

      {deal?.description && (
        <Row label="Description:" value={deal.description} />
      )}

      <hr className="my-3 border-border" />

      <Row label="On Going Usage:" value={deal?.onGoingTotalUsage || 0} />
      <Row
        label="Total Usage Limit:"
        value={
          deal?.usageRule?.totalUsageLimit?.isEnabled
            ? deal?.usageRule?.totalUsageLimit?.value
            : "Unlimited"
        }
      />
      <Row
        label="Usage Limit Per User:"
        value={
          deal?.usageRule?.totalUsageLimitPerUser?.isEnabled
            ? deal?.usageRule?.totalUsageLimitPerUser?.value
            : "Unlimited"
        }
      />
      {deal?.usageRule?.maximumApplicableDiscount?.isEnabled && (
        <Row
          label="Max Applicable Discount:"
          value={`$${deal.usageRule.maximumApplicableDiscount.value || 0}`}
        />
      )}

      <hr className="my-3 border-border" />

      <Row
        label="Stacks With:"
        value={deal?.allowedStacks?.join(", ") || "None"}
      />

      {deal?.expiryInfo && (
        <>
          <hr className="my-3 border-border" />
          <Row
            label="Start Date:"
            value={
              deal.expiryInfo.startsAtDate
                ? `${deal.expiryInfo.startsAtDate} at ${
                    deal.expiryInfo.startsAtTime || "12:00 AM"
                  }`
                : "Not specified"
            }
          />
          <Row
            label="End Date:"
            value={
              deal.expiryInfo.neverExpires
                ? "Never Expires"
                : deal.expiryInfo.endsAtDate
                  ? `${deal.expiryInfo.endsAtDate} at ${
                      deal.expiryInfo.endsAtTime || "11:59 PM"
                    }`
                  : "Not specified"
            }
          />
          <Row
            label="Time Zone:"
            value={
              deal.expiryInfo.schedule?.dummyTimeZone?.timeZone ||
              "Not specified"
            }
          />
        </>
      )}

      {isBogoDeal && dealInfo?.buyProductCategoryIds?.length > 0 && (
        <>
          <hr className="my-3 border-border" />
          <Row
            label="Buy Categories:"
            value={`${dealInfo.buyProductCategoryIds.length} categories selected`}
          />
        </>
      )}

      {isBogoDeal && dealInfo?.getProductIds?.length > 0 && (
        <Row
          label="Get Products:"
          value={`${dealInfo.getProductIds.length} products available`}
        />
      )}
    </div>
  );
}
