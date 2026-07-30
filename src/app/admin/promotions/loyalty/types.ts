export interface LoyaltyTier {
  minimumAmountToBeSpent: number;
  pointsToBeGiven: number;
}

export interface LoyaltySettingsValue {
  isEnabled: boolean;
  pointsRepresentation: number;
  amountRepresentation: number;
  registrationAward: { isEnabled: boolean; pointsToBeGiven: number };
  firstOrderAward: { isEnabled: boolean; pointsToBeGiven: number };
  rewardStrategyType: "NONE" | "PER_SPENDING_BASIS" | "TIERED_SPENDING_BASIS";
  pointsToBeGivenPerSpendingBasis: number;
  tiers: LoyaltyTier[];
  isRestrictionEnabled: boolean;
  restrictionPolicy: string;
  restrictionValueRepresentation: number;
  allowedStacks: string[];
  isEmailRequiredToUseLoyaltyPoints: boolean;
  isPhoneRequiredToUseLoyaltyPoints: boolean;
  isEcomSignupRequiredToUseLoyaltyPoints: boolean;
}

export const EMPTY_LOYALTY_SETTINGS: LoyaltySettingsValue = {
  isEnabled: false,
  pointsRepresentation: 1,
  amountRepresentation: 0.2,
  registrationAward: { isEnabled: false, pointsToBeGiven: 0 },
  firstOrderAward: { isEnabled: false, pointsToBeGiven: 0 },
  rewardStrategyType: "NONE",
  pointsToBeGivenPerSpendingBasis: 1,
  tiers: [{ minimumAmountToBeSpent: 0, pointsToBeGiven: 0 }],
  isRestrictionEnabled: false,
  restrictionPolicy: "MAXIMUM_DEDUCTION_PERCENTAGE",
  restrictionValueRepresentation: 0,
  allowedStacks: [],
  isEmailRequiredToUseLoyaltyPoints: false,
  isPhoneRequiredToUseLoyaltyPoints: false,
  isEcomSignupRequiredToUseLoyaltyPoints: false,
};
