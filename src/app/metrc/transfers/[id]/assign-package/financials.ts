import type { PackageAssignment } from "./types";

// Same as old assign-package.js's getEffectiveTotalCost — applies the bulk
// discount tag on top of the untouched, original unitCost for display/margin
// purposes only. unitCost itself is never mutated by the discount.
export function effectiveTotalCost(assignment: PackageAssignment) {
  const raw = parseFloat(String(assignment.unitCost)) || 0;
  const pct = assignment.discountPercent || 0;
  return raw * (1 - pct / 100);
}

// Per-package financials, mirroring old assign-package.js's step-0 card. Unit
// cost is the effective (discounted) total spread over the package quantity;
// unit price prefers what the user set, then the product's existing retail
// price; margin is taken against the unit price.
export function packageFinancials(assignment: PackageAssignment) {
  const qty = assignment.metrcQuantityNumber ?? assignment.quantity ?? 0;
  const totalCost = effectiveTotalCost(assignment);
  const unitCost = qty > 0 ? totalCost / qty : totalCost;
  const unitPrice = assignment.recommendedUnitPrice ?? assignment.inventoryUnitPrice ?? null;
  const totalPrice = unitPrice != null && qty > 0 ? unitPrice * qty : null;
  const margin = unitPrice && unitPrice > 0 ? ((unitPrice - unitCost) / unitPrice) * 100 : null;
  // With a transfer conversion configured, each sellable item bundles
  // `projectedQtyConversionRate` base units, so its price scales accordingly.
  const pricePerItem =
    assignment.enableProjectedQty && assignment.projectedQtyConversionRate && unitPrice != null
      ? unitPrice * assignment.projectedQtyConversionRate
      : null;

  return { qty, totalCost, unitCost, unitPrice, totalPrice, margin, pricePerItem };
}

// The price sent to the backend as productPriceRecommendations[].price.
// Falls back to the product's existing retail price before ever falling back
// to 0 — sending 0 would wipe out live pricing on an already-priced product.
export function recommendedPrice(assignment: PackageAssignment) {
  return parseFloat(String(assignment.recommendedUnitPrice ?? assignment.inventoryUnitPrice ?? 0)) || 0;
}
