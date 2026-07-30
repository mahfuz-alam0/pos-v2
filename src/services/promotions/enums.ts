export type SelectItem = { value: string; label: string };

export const WEEKDAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"] as const;
export type Weekday = (typeof WEEKDAYS)[number];

export const WEEKDAY_LABELS: Record<Weekday, string> = {
  MON: "Monday",
  TUE: "Tuesday",
  WED: "Wednesday",
  THU: "Thursday",
  FRI: "Friday",
  SAT: "Saturday",
  SUN: "Sunday",
};

export const SALE_SOURCE_ITEMS: SelectItem[] = [
  { value: "INTERNAL", label: "Internal (POS)" },
  { value: "EXTERNAL", label: "External" },
  { value: "WEEDMAPS", label: "Weedmaps" },
  { value: "LEAFLY", label: "Leafly" },
];

export const DELIVERY_METHOD_ITEMS: SelectItem[] = [
  { value: "IN_STORE", label: "In Store" },
  { value: "PICK_UP", label: "Pick Up" },
  { value: "DELIVERY", label: "Delivery" },
  { value: "SHIPMENT", label: "Shipment" },
];

export const COUPON_DISCOUNT_TYPE_ITEMS: SelectItem[] = [
  { value: "PERCENTAGE", label: "Percentage" },
  { value: "AMOUNT", label: "Fixed Amount" },
];

export const COUPON_STACK_ITEMS: SelectItem[] = [
  { value: "DEALS", label: "Deals" },
  { value: "LOYALTY_POINTS", label: "Loyalty Points" },
];

export const DEAL_STACK_ITEMS: SelectItem[] = [
  { value: "COUPONS", label: "Coupons" },
  { value: "LOYALTY_POINTS", label: "Loyalty Points" },
];

export const LOYALTY_STACK_ITEMS: SelectItem[] = [
  { value: "DEALS", label: "Deals" },
  { value: "COUPONS", label: "Coupons" },
];

export const DEAL_TYPE_ITEMS: SelectItem[] = [
  { value: "REGULAR", label: "Regular" },
  { value: "BOGO", label: "Buy One Get One" },
  { value: "TIERED", label: "Tiered" },
];

export const DEAL_TYPE_BADGE_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  REGULAR: "default",
  BOGO: "secondary",
  TIERED: "outline",
};

export const REGULAR_DEAL_DISCOUNT_TYPE_ITEMS: SelectItem[] = [
  { value: "PERCENTAGE", label: "Percentage" },
  { value: "AMOUNT", label: "Fixed Amount" },
  { value: "FINAL_UNIT_PRICE", label: "Final Unit Price" },
];

export const REGULAR_DEAL_TARGET_ENTITY_ITEMS: SelectItem[] = [
  { value: "CATEGORIES", label: "Categories" },
  { value: "BRANDS", label: "Brands" },
  { value: "PRODUCTS", label: "Products" },
];

export const TIERED_DEAL_TARGET_ENTITY_ITEMS: SelectItem[] = [
  ...REGULAR_DEAL_TARGET_ENTITY_ITEMS,
  { value: "TAGS", label: "Tags" },
];

export const TIERED_MEASUREMENT_TYPE_ITEMS: SelectItem[] = [
  { value: "WEIGHT", label: "Weight" },
  { value: "QUANTITY", label: "Quantity" },
  { value: "AMOUNT", label: "Amount" },
];

export const TIERED_OFF_TYPE_ITEMS: SelectItem[] = [
  { value: "UNIT_AMOUNT_OFF", label: "Amount Off" },
  { value: "UNIT_PERCENTAGE_OFF", label: "Percentage Off" },
  { value: "NEW_TOTAL_PRICE", label: "New Total Price" },
];

export const BOGO_BUY_SCOPE_ITEMS: SelectItem[] = [
  { value: "CATEGORIES", label: "Categories" },
  { value: "BRANDS", label: "Brands" },
  { value: "PRODUCTS", label: "Products" },
];

export const BOGO_GET_PRODUCT_TYPE_ITEMS: SelectItem[] = [
  { value: "SELF", label: "Same Product" },
  { value: "USER_DEFINED", label: "Customer Picks" },
  { value: "OTHER_DEFINED", label: "Specific Other Product(s)" },
];

export const BOGO_DISCOUNT_TYPE_ITEMS: SelectItem[] = [
  { value: "PERCENTAGE", label: "Percentage" },
  { value: "AMOUNT", label: "Fixed Amount" },
  { value: "FLAT", label: "Flat Price" },
];

export const BOGO_DISCOUNT_TARGET_ITEMS: SelectItem[] = [
  { value: "ON_GET_PRODUCT", label: "On the Get Product" },
  { value: "ON_BUNDLE", label: "On the Whole Bundle" },
];

export const LOYALTY_RESTRICTION_POLICY_ITEMS: SelectItem[] = [
  { value: "MAXIMUM_DEDUCTION_AMOUNT", label: "Maximum Deduction Amount" },
  { value: "MAXIMUM_DEDUCTION_PERCENTAGE", label: "Maximum Deduction Percentage" },
  { value: "MAXIMUM_SPENDABLE_POINTS", label: "Maximum Spendable Points" },
];

export const LOYALTY_REWARD_TYPE_ITEMS: SelectItem[] = [
  { value: "NONE", label: "None" },
  { value: "PER_SPENDING_BASIS", label: "Per Spending Basis" },
  { value: "TIERED_SPENDING_BASIS", label: "Tiered Spending Basis" },
];

export const PROMO_TYPE = { COUPON: "COUPON", DEAL: "DEAL" } as const;
