"use client";

import { useSelector } from "react-redux";

/**
 * Read-only order summary shown while updating an EXISTING order's status
 * (currentAction === "processOrder" in TotalCard.tsx) — purchased line items
 * plus SubTotal/Total, sourced straight from the sale record itself
 * (saleData), not a live cart quote. Unlike a fresh sale, no quote has been
 * fetched for this order, so ProductPromoTaxes (which reads quoteForSale)
 * would render empty here; this mirrors ReturnSummary.tsx's top half, minus
 * the Return SubTotal/Return Total rows that don't apply outside a return.
 */
export default function ProcessOrderSummary() {
  const saleDetail = useSelector((state: any) => state?.saleData);
  const nonPackagedLineItems = saleDetail?.nonPackagedLineItems ?? [];
  const hasMiscCharges = saleDetail?.miscCharges?.length > 0;

  return (
    <div>
      <h6 className="mb-2 font-semibold">Purchased Line Items</h6>

      <div className="divide-y divide-border rounded-lg border border-border">
        {nonPackagedLineItems.map((item, index) => (
          <details key={index} className="group">
            <summary className="cursor-pointer list-none px-4 py-3 font-medium">
              {item?.snapShotData?.productName ?? "Unknown Product"}
            </summary>
            <div className="px-4 pb-3 text-sm">
              <p>Unit Price: ${item?.finalUnitPrice ?? "?"}</p>
              <p>Total Price: ${item?.finalTotalPrice ?? "?"}</p>

              {item?.discountBreakDownHierarchy?.length > 0 ? (
                <div className="my-2 rounded-lg bg-muted p-2.5">
                  <h4 className="mb-2 font-bold">Discount Breakdown:</h4>
                  <ul className="list-none p-0">
                    {item.discountBreakDownHierarchy.map((discount, idx) => (
                      <li key={idx} className="mb-2 border-b border-border pb-2">
                        {Object.entries(discount).map(
                          ([key, value]: [string, any]) =>
                            key !== "unitDiscountApplied" &&
                            key !== "referenceId" &&
                            key !== "discountRateType" &&
                            key !== "isDisabled" && (
                              <div key={key} className="mb-1">
                                {key === "discountRate" && (
                                  <div className="flex justify-between">
                                    <h6>Discount Rate:</h6>
                                    <span>
                                      {discount.discountRateType === "PERCENTAGE"
                                        ? `${value}%`
                                        : `$${value ?? "?"}`}
                                    </span>
                                  </div>
                                )}
                                {key === "discountRate" &&
                                  discount.totalDiscountApplied && (
                                    <div className="mt-1 flex justify-between">
                                      <h6>Discounted Amount:</h6>
                                      <span>
                                        $ {discount.totalDiscountApplied}
                                      </span>
                                    </div>
                                  )}
                                {key !== "discountRate" &&
                                  key !== "totalDiscountApplied" && (
                                    <div className="flex justify-between">
                                      <h6>
                                        {key === "notes"
                                          ? "Notes"
                                          : key === "source"
                                          ? "Source"
                                          : key}
                                        :
                                      </h6>
                                      <span>{value ?? "?"}</span>
                                    </div>
                                  )}
                              </div>
                            )
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p>No Discounts Applied</p>
              )}

              {item?.snapShotData?.taxesApplied?.length > 0 ? (
                <div>
                  <h4>Taxes Applied:</h4>
                  <ul>
                    {item.snapShotData.taxesApplied.map((tax, idx) => (
                      <li key={idx}>
                        <div className="flex items-center justify-between">
                          <div className="mt-2">{tax.name ?? "?"}</div>
                          <div>$ {tax.amount ?? "?"}</div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p>No Taxes Applied</p>
              )}
            </div>
          </details>
        ))}

        {hasMiscCharges && (
          <details className="group">
            <summary className="cursor-pointer list-none px-4 py-3 font-medium">
              Miscellaneous Charges
            </summary>
            <div className="px-4 pb-3 text-sm">
              {saleDetail.miscCharges.map((charge, index) => (
                <div key={index}>
                  <p>Name: {charge?.snapShotData?.taxesApplied?.[0]?.name}</p>
                  <p>Notes: {charge.notes}</p>
                  <p>Total Tax Applied: ${charge.totalTaxApplied}</p>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>

      <div className="flex justify-between pt-5">
        <div className="font-semibold">SubTotal</div>
        <div className="font-semibold">
          $ {saleDetail?.finalPayable ?? "0.00"}
        </div>
      </div>

      <div className="mt-2 flex justify-between">
        <div className="font-semibold text-muted-foreground">Total</div>
        <div className="font-semibold">
          $ {saleDetail?.finalPayable ?? "0.00"}
        </div>
      </div>
    </div>
  );
}
