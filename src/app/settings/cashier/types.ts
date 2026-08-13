export type FeeType = "FEE" | "DISCOUNT";
export type FeeOperator = "LT" | "GT";
export type FeeAmountType = "PERCENTAGE" | "AMOUNT";
export type PaymentMethodKey = "CREDIT_CARD" | "DEBIT_CARD" | "CASHLESS_ATM" | "ACH";

export interface ProcessingFeeTier {
  operator: FeeOperator;
  amount: number;
  type: FeeAmountType;
  chargeAmount: number;
  feeType: FeeType;
}

export interface PaymentMethodPreference {
  paymentMethod: PaymentMethodKey;
  isEnabled: boolean;
  shouldForceMinimumSubtotal: boolean;
  minimumSubTotalToForce: number;
  shouldTakeProcessingFee: boolean;
  processingFeePreferences: ProcessingFeeTier[];
}

export interface EcommPaymentPreference {
  shouldAllowInStorePayment: boolean;
  onlinePaymentPreferences: PaymentMethodPreference[];
}

export interface ShopPreferences {
  shouldAllowOutOfStockPackagesToSell: boolean;
  shouldAllowSaleBelowCost: boolean;
  isChoosingDrawerMandatoryForCashSaleOnPhysicalStore: boolean;
  isChoosingDrawerMandatoryForVirtualSaleOnPhysicalStore: boolean;
  allowedDiscounts: string[];
  shouldHidePIFieldsFromForm: boolean;
  shouldRoundUpCalculation: boolean;
  shouldKeepIntegerOnly: boolean;
  shouldRoundUpToTheClosestNickel: boolean;
  shouldConsiderCentsToRound: boolean;
  centsToConsiderToRound: number;
  shouldStopLineItemsToBeAlignedWithRoundingSubtotal: boolean;
  shouldAllowAnonymousCustomer: boolean;
  sendOrderReceiptViaEmail: boolean;
  shouldAllowStoreCreditsToBeUsedAcrossTheOrganization: boolean;
  allowedStoresForAcceptingStoreCredits: (string | number)[];
  shouldImposeDayLimitsOnAcceptingReturns: boolean;
  numberOfDaysAllowedForAcceptingReturns: number;
  shouldEnableScanOnlyCart: boolean;
  isChoosingCustomerGroupMandatoryForMJProducts: boolean;
  shouldAllowManualEditOnPosPage: boolean;
  shouldAddNewLineItemOnScan: boolean;

  posOnlinePaymentPreference: PaymentMethodPreference[];
  appOnlinePaymentPreference: PaymentMethodPreference[];

  ecommAndroidOnlinePaymentPreference: EcommPaymentPreference;
  ecommIOSOnlinePaymentPreference: EcommPaymentPreference;
  ecommWEBOnlinePaymentPreference: EcommPaymentPreference;
}

export const EMPTY_PREFERENCES: ShopPreferences = {
  shouldAllowOutOfStockPackagesToSell: false,
  shouldAllowSaleBelowCost: false,
  isChoosingDrawerMandatoryForCashSaleOnPhysicalStore: false,
  isChoosingDrawerMandatoryForVirtualSaleOnPhysicalStore: false,
  allowedDiscounts: [],
  shouldHidePIFieldsFromForm: false,
  shouldRoundUpCalculation: false,
  shouldKeepIntegerOnly: false,
  shouldRoundUpToTheClosestNickel: false,
  shouldConsiderCentsToRound: false,
  centsToConsiderToRound: 0,
  shouldStopLineItemsToBeAlignedWithRoundingSubtotal: false,
  shouldAllowAnonymousCustomer: false,
  sendOrderReceiptViaEmail: false,
  shouldAllowStoreCreditsToBeUsedAcrossTheOrganization: false,
  allowedStoresForAcceptingStoreCredits: [],
  shouldImposeDayLimitsOnAcceptingReturns: false,
  numberOfDaysAllowedForAcceptingReturns: 0,
  shouldEnableScanOnlyCart: false,
  isChoosingCustomerGroupMandatoryForMJProducts: false,
  shouldAllowManualEditOnPosPage: false,
  shouldAddNewLineItemOnScan: false,
  posOnlinePaymentPreference: [],
  appOnlinePaymentPreference: [],
  ecommAndroidOnlinePaymentPreference: { shouldAllowInStorePayment: false, onlinePaymentPreferences: [] },
  ecommIOSOnlinePaymentPreference: { shouldAllowInStorePayment: false, onlinePaymentPreferences: [] },
  ecommWEBOnlinePaymentPreference: { shouldAllowInStorePayment: false, onlinePaymentPreferences: [] },
};
