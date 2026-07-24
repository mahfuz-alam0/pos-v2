"use client";

/**
 * Tax line-item breakdown for a single product/line-item snapshot.
 *
 * Props:
 *   product  — the line item's `snapShotData` (has `taxesApplied` [] and
 *              `taxProfileSnapShot.taxes` used to look up each tax's rate).
 */
export default function TaxBreakdown({ product }) {
  const hasTaxes = product?.taxesApplied?.length > 0;
  const taxProfileSnapshot = product?.taxProfileSnapShot;

  if (!hasTaxes) return null;

  return (
    <>
      <div className="my-2 ml-[30px] font-semibold text-[#4D5250]">
        Tax Breakdown
      </div>
      <div className="rounded pl-[30px] pr-0 pt-[5px]">
        {product.taxesApplied.map((tax, taxIndex) => {
          const matchedTaxProfile = taxProfileSnapshot?.taxes?.find(
            (taxProfile) => taxProfile.taxName === tax.name
          );

          return (
            <div
              key={taxIndex}
              className="mb-[5px] flex justify-between"
            >
              <div className="text-[#9CA3AF]">
                {tax.name}
                <span>
                  {matchedTaxProfile && `(${matchedTaxProfile.taxRate}%)`}
                </span>
              </div>
              <span className="mr-2 font-medium text-[#76CA99]">
                $ {tax.amount}
              </span>
            </div>
          );
        })}
      </div>
    </>
  );
}
