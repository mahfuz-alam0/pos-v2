export type DealType = "REGULAR" | "BOGO" | "TIERED";

export interface DealRow {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  onGoingTotalUsage: number;
  applicableShopIds: string[];
  createdAt: string;
  updatedAt: string;
  type: DealType;
}

export interface RegularDealInfoValue {
  discountType: string;
  discountRate: number;
  targetEntity: string;
  associatedCategoryIds: string[];
  associatedBrandIds: string[];
  associatedProductIds: string[];
  productExceptionIds: string[];
  packageExceptionIds: string[];
  isPerLineItemPriceRestrictionEnabled: boolean;
  perLineItemPriceRestrictionAmount: number;
}

export const EMPTY_REGULAR_DEAL_INFO: RegularDealInfoValue = {
  discountType: "PERCENTAGE",
  discountRate: 10,
  targetEntity: "PRODUCTS",
  associatedCategoryIds: [],
  associatedBrandIds: [],
  associatedProductIds: [],
  productExceptionIds: [],
  packageExceptionIds: [],
  isPerLineItemPriceRestrictionEnabled: false,
  perLineItemPriceRestrictionAmount: 0,
};

export interface BogoDealInfoValue {
  buyMinimumExactQuantity: number;
  buyProductScope: string;
  buyProductIds: string[];
  buyProductCategoryIds: string[];
  buyProductBrandIds: string[];
  buyProductExceptionIds: string[];
  buyProductPackageExceptionIds: string[];
  getProductQuantity: number;
  getProductType: string;
  getProductIds: string[];
  getProductCategoryIds: string[];
  getProductBrandIds: string[];
  getProductExceptionIds: string[];
  getProductPackageExceptionIds: string[];
  isGetProductAmountCapApplicable: boolean;
  getProductAmountCap: number;
  discountType: string;
  discountRate: number;
  discountTargetType: string;
  userPickedProductScopes: string;
}

export const EMPTY_BOGO_DEAL_INFO: BogoDealInfoValue = {
  buyMinimumExactQuantity: 2,
  buyProductScope: "PRODUCTS",
  buyProductIds: [],
  buyProductCategoryIds: [],
  buyProductBrandIds: [],
  buyProductExceptionIds: [],
  buyProductPackageExceptionIds: [],
  getProductQuantity: 1,
  getProductType: "SELF",
  getProductIds: [],
  getProductCategoryIds: [],
  getProductBrandIds: [],
  getProductExceptionIds: [],
  getProductPackageExceptionIds: [],
  isGetProductAmountCapApplicable: false,
  getProductAmountCap: 0,
  discountType: "PERCENTAGE",
  discountRate: 10,
  discountTargetType: "ON_GET_PRODUCT",
  userPickedProductScopes: "PRODUCTS",
};

export interface TieredDealTier {
  buyMinimum: number;
  offAmount: number;
  offType: string;
}

export interface TieredDealInfoValue {
  measurementType: string;
  tiers: TieredDealTier[];
  targetEntity: string;
  associatedCategoryIds: string[];
  associatedBrandIds: string[];
  associatedProductIds: string[];
  associatedTagIds: string[];
  productExceptionIds: string[];
  packageExceptionIds: string[];
  shouldAllowAutoApply: boolean;
  shouldAllowMixAndMatch: boolean;
}

export const EMPTY_TIERED_DEAL_INFO: TieredDealInfoValue = {
  measurementType: "WEIGHT",
  tiers: [{ buyMinimum: 1, offAmount: 10, offType: "UNIT_PERCENTAGE_OFF" }],
  targetEntity: "PRODUCTS",
  associatedCategoryIds: [],
  associatedBrandIds: [],
  associatedProductIds: [],
  associatedTagIds: [],
  productExceptionIds: [],
  packageExceptionIds: [],
  shouldAllowAutoApply: false,
  shouldAllowMixAndMatch: false,
};
