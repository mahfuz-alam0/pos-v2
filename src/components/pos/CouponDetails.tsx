"use client";

/**
 * Read-only detail panel for a single coupon. Rendered inside the coupon
 * drawer opened from CouponCard.
 *
 * Props:
 *   coupon — coupon object (couponCode, discountRate, discountType,
 *            onGoingTotalUsage, usageRule{...}, allowedStacks[])
 */
export default function CouponDetails({ coupon }) {
  const Row = ({ label, value }) => (
    <div className="mb-2 flex justify-between">
      <span className="font-medium text-muted-foreground">{label}</span>
      <span className="font-semibold text-foreground">{value}</span>
    </div>
  );

  return (
    <div className="p-4">
      <h2 className="mb-4 text-xl font-bold text-[#f62d2b]">
        {coupon?.couponCode}
      </h2>

      <Row
        label="Discount Rate:"
        value={`${coupon?.discountRate ?? 0}${
          coupon?.discountType === "PERCENTAGE" ? "%" : "$"
        }`}
      />

      <hr className="my-3 border-border" />

      <Row label="On Going Usage:" value={coupon?.onGoingTotalUsage ?? 0} />
      <Row
        label="Total Usage Limit:"
        value={
          coupon?.usageRule?.totalUsageLimit?.isEnabled
            ? coupon?.usageRule?.totalUsageLimit?.value
            : "Unlimited"
        }
      />
      <Row
        label="Usage Limit Per User:"
        value={
          coupon?.usageRule?.totalUsageLimitPerUser?.isEnabled
            ? coupon?.usageRule?.totalUsageLimitPerUser?.value
            : "Unlimited"
        }
      />

      <hr className="my-3 border-border" />

      <Row
        label="Stacks With:"
        value={coupon?.allowedStacks?.join(", ") || "None"}
      />
    </div>
  );
}
