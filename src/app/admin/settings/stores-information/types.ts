export interface LocationDetails {
  country?: string | null;
  streetAddress?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
}

export interface OperationSlot {
  from: string;
  to: string;
  disabled: boolean;
}

export interface StoreRow {
  id: string | number;
  name: string;
  location?: string | null;
  email?: string | null;
  mobile?: string | null;
}

export interface StoreDetail {
  id: string | number;
  shopName?: string | null;
  phone?: string | null;
  shopEmail?: string | null;
  webSite?: string | null;
  currency?: string | null;
  countryCode?: string | null;
  timeZone?: string | null;
  logo?: string | null;
  lat?: string | null;
  long?: string | null;
  licenseDetails?: {
    licenseId?: string | null;
    additionalProperties?: { businessLicenceNo?: string | null };
  } | null;
  locationDetails?: LocationDetails | null;
  operationHours?: {
    open24X7?: boolean;
    slots?: Record<string, OperationSlot>;
  } | null;
}

export interface CountryOption {
  countryCode: string;
  countryName: string;
}

export interface TimezoneOption {
  timezone: string;
  name: string;
  gmtOffSet: string;
}
