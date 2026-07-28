export interface LocationDetails {
  country?: string | null;
  streetAddress?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
}

export interface SupplierRow {
  id: string | number;
  name: string;
  supplierType?: string | null;
  supplierTypeId?: string | number | null;
  license?: string | null;
  ubi?: string | null;
  email?: string | null;
  phone?: string | null;
  countryCode?: string | null;
  logo?: string | null;
  description?: string | null;
  documentLinks?: string[] | null;
  locationDetails?: LocationDetails | null;
}

export interface SupplierTypeOption {
  id: string | number;
  name: string;
}

export interface CountryOption {
  countryCode: string;
  countryName: string;
}

export interface PaginationState {
  page: number;
  limit: number;
  totalEntries: number;
  totalPages: number;
}
