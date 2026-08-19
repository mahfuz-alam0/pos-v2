// Self-check for the METRC transfer import money path.
// Run: npx jiti "src/app/metrc/transfers/[id]/assign-package/financials.check.ts"
import assert from "node:assert/strict";

import { effectiveTotalCost, packageFinancials, recommendedPrice } from "./financials";
import type { PackageAssignment } from "./types";

const base: PackageAssignment = {
  metrcTag: "1A4",
  productId: "p1",
  unitCost: 400, // total wholesale cost for the whole package
  quantity: 100,
  metrcQuantityNumber: 100,
  shouldActivate: true,
};

// --- discount is display-only, never mutates unitCost -----------------------
assert.equal(effectiveTotalCost(base), 400);
assert.equal(effectiveTotalCost({ ...base, discountPercent: 25 }), 300);
assert.equal(base.unitCost, 400, "unitCost must never be mutated by the discount");

// --- unit cost spreads the effective total over the package quantity --------
{
  const fin = packageFinancials({ ...base, recommendedUnitPrice: 10 });
  assert.equal(fin.unitCost, 4);
  assert.equal(fin.unitPrice, 10);
  assert.equal(fin.totalPrice, 1000);
  assert.equal(fin.margin, 60); // (10 - 4) / 10
}

// --- discount lifts the margin ----------------------------------------------
{
  const fin = packageFinancials({ ...base, recommendedUnitPrice: 10, discountPercent: 25 });
  assert.equal(fin.unitCost, 3);
  assert.equal(fin.margin, 70);
}

// --- a zero quantity must not produce Infinity/NaN --------------------------
{
  const fin = packageFinancials({ ...base, quantity: 0, metrcQuantityNumber: 0, recommendedUnitPrice: 10 });
  assert.equal(fin.unitCost, 400, "with no quantity, unit cost falls back to the total");
  assert.equal(fin.totalPrice, null);
  assert.ok(Number.isFinite(fin.margin!), "margin must stay finite when quantity is 0");
}

// --- price falls back to live inventory pricing, never to 0 -----------------
// This is the regression the old POS had: a blank price wiped out retail pricing.
assert.equal(recommendedPrice({ ...base, inventoryUnitPrice: 12 }), 12, "blank price must fall back to inventory");
assert.equal(recommendedPrice({ ...base, recommendedUnitPrice: 15, inventoryUnitPrice: 12 }), 15, "typed price wins");
assert.equal(recommendedPrice(base), 0, "no price anywhere is still 0");

// --- margin uses inventory price when the user left the field blank ---------
{
  const fin = packageFinancials({ ...base, inventoryUnitPrice: 8 });
  assert.equal(fin.unitPrice, 8);
  assert.equal(fin.margin, 50);
}

// --- conversion scales the per-item price -----------------------------------
{
  const fin = packageFinancials({
    ...base,
    recommendedUnitPrice: 10,
    enableProjectedQty: true,
    projectedQtyConversionRate: 3.5,
  });
  assert.equal(fin.pricePerItem, 35);
}
assert.equal(
  packageFinancials({ ...base, recommendedUnitPrice: 10, projectedQtyConversionRate: 3.5 }).pricePerItem,
  null,
  "conversion rate without the toggle enabled must not apply"
);

console.log("financials: all checks passed");
