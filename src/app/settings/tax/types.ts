export interface TaxCharge {
  taxName: string;
  taxType: string;
  taxRate: string | number;
  externalId: string;
  compoundTaxReferences: string[];
  isCompound: boolean;
  shouldBeForced: boolean;
}

export interface TaxRef {
  value: string;
  label: string;
}

export interface RegionalTaxGroup {
  state: string;
  zipCodeMode: "INCLUDE" | "EXCLUDE" | "ALL";
  zipCodes: string[];
  taxes: TaxCharge[];
  taxRefs: TaxRef[];
}

export interface CustomerGroupTaxEntry {
  enabled: boolean;
  taxes: TaxCharge[];
  regionalTaxes: RegionalTaxGroup[];
}

export interface TaxProfile {
  id: string | number;
  name: string;
  description?: string;
  classificationName?: string;
  highlights?: string;
  classification?: { id: string | number; name: string };
  classificationId?: string | number;
  isIncluded?: boolean;
  isIncludeButDiscountIsNotConsidered?: boolean;
  isDefaultForMJ?: boolean;
  isDefaultForNonMJ?: boolean;
  taxes?: TaxCharge[];
  globalRegionalTaxes?: { zipCodePreference?: Record<string, unknown>; taxes: TaxCharge[] }[];
  customerGroupSpecificTaxeS?: {
    customerGroupId: string | number;
    isEnabled?: boolean;
    rootTaxes?: TaxCharge[];
    regionalTaxes?: { zipCodePreference?: Record<string, unknown>; taxes: TaxCharge[] }[];
  }[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Classification {
  id: string | number;
  name: string;
}

export interface CustomerGroup {
  id: string | number;
  name: string;
}

export interface PaginationData {
  limit: number;
  page: number;
  totalEntries: number;
  totalPages: number;
}
