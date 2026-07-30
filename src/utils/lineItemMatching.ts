// The quote API correlates request line items to response line items
// (`nonPackagedLineItems`) only by echoing back the same package/quantity/
// override data — it doesn't round-trip any client-supplied line id. That's
// fine for a single line per package, but once the cart holds two lines for
// the *same* package (e.g. added at qty 2, then added again at qty 5), a
// naive `.find(item => item.createdLineItem.packageId === record.id)` always
// resolves to the first response entry for every line sharing that package,
// so every such row would display identical price/discount/tax data instead
// of its own.
//
// Fix: match on everything that makes a request line distinct (package,
// quantity, any manual price override), and consume matches in cart order —
// so if two lines are genuinely identical in every distinguishing field,
// each still gets its own (computationally identical) response entry rather
// than all pointing at the same one.
function lineItemMatchKey(item: any) {
  return [
    item?.packageId ?? item?.id,
    item?.purchaseQuantity,
    item?.forcedManualDiscountType ?? "",
    item?.forcedDiscountRate ?? "",
    item?.forcedRecommendedUnitPrice ?? "",
  ].join("|");
}

// cartKey(item) returns the identity to look results up by later — prefer
// appMaintainedId/key (unique per line) over packageId (shared by duplicates).
function cartKey(item: any) {
  return item?.key ?? item?.appMaintainedId ?? item?.id;
}

export function buildLineItemAssignment(cartItems: any[], nonPackagedLineItems: any[]) {
  const pools = new Map<string, any[]>();
  (nonPackagedLineItems || []).forEach((entry) => {
    const key = lineItemMatchKey(entry?.createdLineItem || {});
    if (!pools.has(key)) pools.set(key, []);
    pools.get(key)!.push(entry);
  });

  const assignment = new Map<string, any>();
  (cartItems || []).forEach((item) => {
    const matchKey = lineItemMatchKey(item);
    const pool = pools.get(matchKey);
    const entry = pool?.shift();
    if (entry) assignment.set(cartKey(item), entry);
  });

  return assignment;
}
