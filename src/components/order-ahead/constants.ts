// Board lifecycle columns. "NEW" and "CONFIRMED" are pre-sale states (not yet a Sale);
// the rest are real Sale.status.statusId values from /sales/overall-sale-statuses.
export const LIFECYCLE_COLUMNS = [
  { key: "NEW", label: "New Orders", accent: "#1791FF" },
  { key: "CONFIRMED", label: "Confirmed", accent: "#134c85" },
  { key: "PROCESSING", label: "Processing", accent: "#f59e0b" },
  { key: "PACKAGED_AND_READY", label: "Packaged & Ready", accent: "#8b5cf6" },
  { key: "AWAITING_DRIVER", label: "Awaiting Driver", accent: "#ec4899" },
  { key: "OUT_FOR_DELIVERY", label: "Out for Delivery", accent: "#10b981" },
];

// Short badge label + solid color per lifecycle stage, matching the old app's
// per-status color coding (blue New, navy Confirmed, orange Processing, ...).
export const LIFECYCLE_BADGE = {
  NEW: { label: "New", className: "bg-blue-500 text-white" },
  CONFIRMED: { label: "Confirmed", className: "bg-blue-900 text-white" },
  PROCESSING: { label: "Processing", className: "bg-amber-500 text-white" },
  PACKAGED_AND_READY: { label: "P&R", className: "bg-emerald-600 text-white" },
  AWAITING_DRIVER: { label: "Awaiting Driver", className: "bg-pink-500 text-white" },
  OUT_FOR_DELIVERY: { label: "Out for Delivery", className: "bg-teal-500 text-white" },
};

// Primary action button color per stage, matching the old card footer buttons.
export const LIFECYCLE_ACTION_CLASS = {
  NEW: "bg-blue-500 hover:bg-blue-600 text-white",
  CONFIRMED: "bg-blue-900 hover:bg-blue-950 text-white",
  PROCESSING: "bg-amber-500 hover:bg-amber-600 text-white",
  PACKAGED_AND_READY: "bg-emerald-600 hover:bg-emerald-700 text-white",
};

export const SOURCE_OPTIONS = [
  { value: "EXTERNAL", label: "Ecommerce" },
  { value: "INTERNAL", label: "POS" },
  { value: "WEEDMAPS", label: "Weedmaps" },
  { value: "LEAFLY", label: "Leafly" },
];

export const DELIVERY_METHOD_OPTIONS = [
  { value: "IN_STORE", label: "In Store" },
  { value: "PICK_UP", label: "Pickup" },
  { value: "DELIVERY", label: "Delivery" },
];

export const PAYMENT_STATUS_OPTIONS = [
  { value: "PAID_IN_FULL", label: "Paid" },
  { value: "PENDING", label: "Unpaid" },
];

// A pre-sale from Weedmaps/Leafly already went through its own marketplace accept
// flow before landing here, so it's shown as Confirmed regardless of isConfirmed.
export function isMarketplaceSource(source) {
  return source === "WEEDMAPS" || source === "LEAFLY";
}

export function getPreSaleLifecycle(preSale) {
  const saleData = preSale?.info?.saleData;
  if (isMarketplaceSource(preSale?.info?.source) || saleData?.isConfirmed) {
    return "CONFIRMED";
  }
  return "NEW";
}

export function getPreSalePaymentStatus(preSale) {
  return preSale?.info?.saleData?.isPaymentComplete ? "PAID_IN_FULL" : "PENDING";
}

// Compact "11w ago" style relative time, matching the old card header.
export function abbreviateDuration(dateInput) {
  const seconds = Math.max(0, (Date.now() - new Date(dateInput).getTime()) / 1000);
  const units = [
    { limit: 60, div: 1, suffix: "s" },
    { limit: 3600, div: 60, suffix: "m" },
    { limit: 86400, div: 3600, suffix: "h" },
    { limit: 604800, div: 86400, suffix: "d" },
    { limit: Infinity, div: 604800, suffix: "w" },
  ];
  const unit = units.find((u) => seconds < u.limit) || units[units.length - 1];
  const value = Math.max(1, Math.floor(seconds / unit.div));
  return `${value}${unit.suffix} ago`;
}

export function sortByCreatedAt(items, order) {
  return [...(items || [])].sort((a, b) => {
    const aTime = new Date(a?.createdAt).getTime();
    const bTime = new Date(b?.createdAt).getTime();
    return order === "NEWEST_FIRST" ? bTime - aTime : aTime - bTime;
  });
}

// Normalizes each source's line items into a common shape the assign-packages
// UI can render, mirroring the old app's per-source field mapping.
export function getConfirmedLineItems(preSale) {
  const info = preSale?.info;
  const saleData = info?.saleData;

  if (info?.source === "WEEDMAPS") {
    return (saleData?.lineItems || []).map((item) => ({
      itemId: item.id,
      externalId: item.externalId,
      purchaseQuantity: Number(item.quantity || 0),
      snapShotData: {
        productName: item.name,
        brandName: item.brand,
        productThumbNail: item.imageUrl,
        purchaseUoMShortForm: item.unitOfMeasure?.unit || "",
        productId: item.wmProductId,
      },
    }));
  }

  if (info?.source === "LEAFLY") {
    return (saleData?.cartItems || []).map((item) => ({
      itemId: item.integratorVariantId,
      externalId: item.integratorVariantId,
      purchaseQuantity: Number(item.quantity || 0),
      snapShotData: {
        productName: item.name || item.integratorVariantId || "Leafly Product",
        brandName: "",
        productThumbNail: "",
        purchaseUoMShortForm: "",
        productId: item.integratorVariantId,
      },
    }));
  }

  return saleData?.confirmedNonPackagedLineItems || [];
}

export function getPackagedLineItemsFlattened(preSale) {
  const confirmedPackagedLineItems = preSale?.info?.saleData?.confirmedPackagedLineItems;
  const flattened = [];

  (confirmedPackagedLineItems || []).forEach((packageItem) => {
    flattened.push({
      ...packageItem.parentLineItem,
      itemId: packageItem.parentLineItem.itemId,
      itemType: "parent",
      packageType: packageItem.packageConstructorType,
      uniqueKey: `parent-${packageItem.parentLineItem.itemId}`,
    });
    (packageItem.childLineItems || []).forEach((child, index) => {
      flattened.push({
        ...child,
        itemId: child.itemId,
        itemType: "child",
        packageType: packageItem.packageConstructorType,
        uniqueKey: `child-${child.itemId}-${index}`,
      });
    });
  });

  return flattened;
}

export function getCustomerName(preSale) {
  if (preSale?.info?.source === "LEAFLY") {
    return `${preSale?.info?.saleData?.firstName || ""} ${preSale?.info?.saleData?.lastName || ""}`.trim();
  }
  return `${preSale?.customerInfo?.firstName || ""} ${preSale?.customerInfo?.lastName || ""}`.trim();
}

// A Sale's customer name field differs by endpoint: /sales/single-sale
// returns `customer` (full object), while /sales/list (the board/table row
// shape) only returns the lighter `customerInfo` — falling back to
// customerInfo when customer isn't present avoids showing "Guest" for every
// list row.
export function getSaleCustomerName(sale) {
  const c = sale?.customer || sale?.customerInfo;
  return `${c?.firstName || ""} ${c?.lastName || ""}`.trim();
}

export function isShareMode() {
  return typeof window !== "undefined" && localStorage.getItem("shareMode") === "true";
}

// Normalizes line items (with pricing) for both a Sale and a pre-sale into the
// same display shape — used by the Order Details drawer and the print modal.
export function getOrderLineItems(type, item) {
  let source;
  if (type !== "presale") {
    source = item?.nonPackagedLineItems || [];
  } else {
    const saleData = item?.info?.saleData;
    const lifecycle = getPreSaleLifecycle(item);
    source =
      (lifecycle === "NEW"
        ? saleData?.nonPackagedLineItems
        : saleData?.confirmedNonPackagedLineItems || saleData?.nonPackagedLineItems) || [];
  }

  return source.map((li) => ({
    name: li?.productName || li?.snapShotData?.productName || "Product",
    brand: li?.brandName || li?.snapShotData?.brandName || "",
    thumbnail: li?.productThumbNail || li?.snapShotData?.productThumbNail || "",
    qty: li?.purchaseQuantity || li?.quantity || 1,
    unitPrice: li?.initialUnitPrice || 0,
    subtotal: li?.totalPriceBeforeTax || 0,
    discount: li?.totalDiscountApplied || 0,
    tax: li?.totalTaxApplied || 0,
    total: li?.finalTotalPrice ?? li?.initialTotalPrice ?? 0,
    discountNotes: (li?.discountBreakDownHierarchy || []).map((d: any) => d.notes).filter(Boolean).join(", "),
    metrcTag: li?.snapShotData?.metrcPackageTag || "",
    metrcBatchId: li?.snapShotData?.metrcBatchId || "",
    taxesApplied: li?.snapShotData?.taxesApplied || [],
  }));
}

// preSale.info.saleData.deliveryLocation / sale.deliveryLocation — same shape
// either way (houseNumber/streetAddress1/streetAddress2/apt/floor/intercom/
// zipCode/state/country/tag), matching the old app's formatDeliveryAddress.
export function getDeliveryAddress(type, item) {
  const loc = type === "presale" ? item?.info?.saleData?.deliveryLocation : item?.deliveryLocation;
  if (!loc) return null;

  const lines = [
    [loc.houseNumber, loc.streetAddress1].filter(Boolean).join(" "),
    loc.streetAddress2,
    loc.apt ? `Apt ${loc.apt}` : "",
    loc.floor ? `Floor ${loc.floor}` : "",
    loc.intercom ? `Intercom: ${loc.intercom}` : "",
  ].filter(Boolean);
  const cityLine = [loc.zipCode, loc.state ? loc.state.replace(/_/g, " ") : "", loc.country]
    .filter(Boolean)
    .join(", ");

  return { lines, cityLine, tag: loc.tag };
}

export function getCustomerPhone(type, item) {
  if (type === "presale") return item?.customerInfo?.phone || "";
  return item?.customer?.phone || item?.customerInfo?.phone || "";
}
