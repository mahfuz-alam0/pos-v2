// Shared types for the Inventory Audit feature.

export interface AuditPackageRow {
  id: string;
  advertisedId?: string;
  metrcTag?: string;
  name?: string;
  isActive?: boolean;
  quantityLeft?: number;
  metrQuantity?: number | null;
  uoMShortForm?: string;
  productBrand?: { id?: string; _id?: string; name?: string } | string;
  productCategory?: { id?: string; _id?: string; name?: string } | string;
  supplierName?: string;
  supplierId?: string;
  supplier?: { id?: string };
  storageLocationBreakdown?: Record<string, number>;
  projectedQtyConversionRate?: number | string | null;
  // Row-expansion fields added client-side (one row per storage location).
  rowLocationId?: string | null;
  rowLocationQty?: number | null;
  [key: string]: any;
}

export interface StorageLocation {
  id: string;
  name: string;
}

export interface SupplierOption {
  id: string;
  name?: string;
  licenseNumber?: string;
}

export interface AdjustmentReason {
  Name: string;
  platformId: string;
}

export interface PendingAdjustment {
  id: string;
  advertisedId?: string;
  locationId?: string | null;
  locationName?: string;
  productName?: string;
  originalQty: number;
  metrcQty: number | null;
  newQty: number;
  inputValue: string;
  uom: string;
  record: AuditPackageRow;
}

export interface AuditFilters {
  searchText: string;
  searchType: "advertisedIds" | "metrcTags" | "packageName";
  category?: string | null;
  location?: string | null;
  brand?: string | null;
  supplier?: string | null;
  discrepancyFilter?: string;
  isActiveFilter: boolean | "";
  isOutOfStockToggle: boolean;
}

export interface LiveAuditSession {
  id: string;
  userId?: string;
  storageLocationId?: string;
  startedAtISO?: string;
  endsAtISO?: string;
  endsAt?: string;
  expiresAt?: string;
  endTime?: string;
  end?: string;
  countKV?: Record<string, number>;
  [key: string]: any;
}
