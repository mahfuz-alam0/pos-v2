export interface CategoryLimit {
  measurementType: "TOTAL_QUANTITIES" | "WEIGHT_OF_TOTAL_QUANTITIES";
  categoryIds: string[];
  name: string | null;
  colorCode: string;
  uomId: string;
  limit: number;
  metrcPurchaseTypeIds?: string[];
  purchaseTypeName?: string;
}

export interface RuleProfile {
  clientId: string;
  profileType: "CATEGORY_BASED" | "METRC_BASED";
  isEnabled: boolean;
  isRelatedToMetrc: boolean;
  timeFrameToConsider: { type: "PER_ORDER" | "WITHIN_TIME_LIMIT_IN_DAYS"; duration: number };
  executionOrder: number;
  orderConsiderationStrategy: "WITHIN_SHOP" | "WITHIN_ORGANIZATION";
  maximumPurchaseLimitsBasedOnCategory: CategoryLimit[];
}
