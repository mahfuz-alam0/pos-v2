// Local-only assignment data assembled per package in Step 1 of the wizard.
// Nothing here is persisted until the whole batch is submitted via
// completeIncomingMetrcTransfer in Step 2 — matches old assign-package.js's
// assignmentDetails shape (see ImportPackage.jsx's handleSaveAssignment).
export interface StorageLocationBreakdownEntry {
  storageLocationId: string;
  quantity: number;
}

export interface PackageAssignment {
  packageId?: string;
  metrcTag: string;
  productId: string | number;
  unitCost: number; // Total Cost (Wholesale) entered by the user, NOT per-unit
  quantity: number;
  metrcQuantityValue?: string;
  metrcQuantityNumber?: number | null;
  shouldActivate: boolean;
  recommendedUnitPrice?: number | null;
  stockThreshold?: number | null;
  pricingTemplateId?: string | null;
  // Collected in the drawer for parity with old's Import Package form. Not sent
  // by completeIncomingMetrcTransfer — the ecom flag is set per *inventory*,
  // which doesn't exist until after the import runs.
  isEcomEnabled?: boolean;
  // Snapshot of the product's existing inventory pricing, read when the product
  // is picked in the drawer. Used as the price floor at submit time so a blank
  // price never overwrites live retail pricing with 0, and to compute margin.
  inventoryUnitPrice?: number | null;
  sellableUoMShortForm?: string | null;
  unitWeight?: number | null;
  unitWeightUoMId?: string | null;
  expiryDate?: string | null; // YYYY-MM-DD
  externalBatchId?: string | null;
  enableProjectedQty?: boolean;
  projectedQtyConversionRate?: number | null;
  projectedQtyUomId?: string | null;
  storageLocationBreakdown?: StorageLocationBreakdownEntry[] | null;
  // Bulk discount tag applied at Step 1 -> Step 2 transition. Never mutates
  // unitCost itself — applied only for display/PO purposes (see
  // getEffectiveTotalCost in old assign-package.js).
  discountPercent?: number;
}

export interface ProductPricing {
  productId: string | number;
  price?: number | string;
  unitWeight?: number | null;
  unitWeightUoMId?: string | null;
  pricingTemplateId?: string | null;
  stockThreshold?: number | null;
  enableProjectedQty?: boolean;
  projectedQtyConversionRate?: number | null;
  projectedQtyUomId?: string | null;
}
