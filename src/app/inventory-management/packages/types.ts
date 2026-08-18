export type PackageSource = "PLATFORM" | "METRC";
export type PackageTab = "unFinish" | "finishPackages" | "finishedPackages" | "conversions" | "archived";

export interface StorageLocationBreakdown {
  [locationId: string]: number;
}

export interface PackageRow {
  id: string;
  advertisedId?: string;
  name?: string;
  metrcTag?: string;
  metrQuantity?: number;
  productBrand?: string | null;
  productCategory?: string | null;
  originalQuantity?: number;
  quantityLeft?: number;
  uoMShortForm?: string;
  isActive?: boolean;
  isSample?: boolean;
  isImported?: boolean;
  isExpired?: boolean;
  isFinished?: boolean;
  isConverted?: boolean;
  source?: PackageSource;
  createdAt?: string;
  updatedAt?: string;
  hasMETRCDiscrepancy?: boolean;
  storageLocationBreakdown?: StorageLocationBreakdown;
  unitCost?: number | null;
  effectiveUnitCost?: number | null;
  projectedQtyConversionRate?: number;
  supplierId?: string;
  productId?: string;
  archivedAt?: string;
}

/** Mirrors the backend's IMetrcPackage (metrc-reporting/types/list-packages-metrc-response).
 *  Product name/category/strain and potency live on the nested `Item`, not the root —
 *  the previous shape invented root-level fields, so every read silently returned
 *  undefined and the panel rendered "N/A". */
export interface MetrcItem {
  Id?: number;
  Name?: string;
  ProductCategoryName?: string | null;
  StrainName?: string | null;
  ItemBrandName?: string | null;
  UnitOfMeasureName?: string;
  UnitThcPercent?: number | null;
  UnitThcContent?: number | null;
  UnitCbdPercent?: number | null;
  UnitCbdContent?: number | null;
}

export interface MetrcSnapshotData {
  Id?: number;
  Label?: string;
  PackageType?: string;
  SourceHarvestNames?: string;
  Quantity?: number;
  UnitOfMeasureName?: string;
  UnitOfMeasureAbbreviation?: string;
  PackagedDate?: string;
  LocationName?: string;
  ExpirationDate?: string | null;
  SellByDate?: string | null;
  UseByDate?: string | null;
  LabTestingPerformedDate?: string | null;
  LabTestingRecordedDate?: string;
  IsTestingSample?: boolean;
  IsTradeSample?: boolean;
  IsOnHold?: boolean;
  IsFinished?: boolean;
  ReceivedFromFacilityName?: string;
  Item?: MetrcItem;
}

export interface MetrcData {
  /** METRC's own package id — the backend calls it `id` on metrcData. */
  id?: string;
  metrcTag?: string;
  metrcId?: string;
  metrcLabel?: string;
  batchId?: string;
  quantity?: number;
  isActive?: boolean;
  isSample?: boolean;
  isOnHold?: boolean;
  isFinished?: boolean;
  supplierName?: string | null;
  snapShotData?: {
    metrcSnapshotData?: MetrcSnapshotData;
  };
  labResults?: LabResult[];
}

export interface LabResult {
  id?: string;
  testName?: string;
  testResultLevel?: number | string;
  testPassed?: boolean;
  testPerformedDate?: string;
}

export interface AdditionalCannabisProps {
  thcContent?: number;
  thcaContent?: number;
  cbdContent?: number;
  cbdaContent?: number;
  cbcContent?: number;
  cbnContent?: number;
  cbdvContent?: number;
  cbgContent?: number;
  thcvContent?: number;
  cbgaContent?: number;
  testUom?: "PERCENTAGE" | "MILLIGRAM";
  thcTestRangeMin?: number;
  thcTestRangeMax?: number;
  cbdTestRangeMin?: number;
  cbdTestRangeMax?: number;
  totalPotentialPsychoactiveThc?: number;
  myrcene?: number;
  alphaPinene?: number;
  betaPinene?: number;
  alphaBisabolol?: number;
  terpinolene?: number;
  limonene?: number;
  humulene?: number;
  caryophyllene?: number;
  linalool?: number;
  testLab?: string;
  testLicense?: string;
  testCompletedDate?: string;
  manufacturedDate?: string;
  harvestedDate?: string;
  sellByDate?: string;
  useByDate?: string;
  packagedNetWeightInGrams?: number;
  coaDocuments?: { url: string; name?: string }[];
  testQrCodeDocuments?: { url: string; name?: string }[];
}

export interface PackageDetail {
  id: string;
  advertisedId?: string;
  name?: string;
  supplierId?: string;
  supplierName?: string;
  category?: { id: string; name: string } | null;
  brand?: { id: string; name: string } | null;
  /** The package's own category/brand as imported (e.g. from METRC). Present even
   *  when no product is attached, which is what the detail panel shows. */
  originalCategory?: string | null;
  originalBrand?: string | null;
  inventoryId?: string | null;
  originalQuantity?: number;
  quantityLeft?: number;
  uoMShortForm?: string;
  uomId?: string;
  unitCost?: number;
  discountPercent?: number;
  expiry?: string;
  externalBatchId?: string;
  manufacturerSku?: string;
  isActive?: boolean;
  isSample?: boolean;
  isFinished?: boolean;
  isImported?: boolean;
  isProductImported?: boolean;
  source?: PackageSource;
  productId?: string;
  productName?: string;
  productImageUrl?: string;
  metrcData?: MetrcData | null;
  additionalCannabisProps?: AdditionalCannabisProps | null;
  storageLocationBreakdown?: StorageLocationBreakdown;
  documentLinks?: { url: string; name?: string }[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CategoryOption {
  id: string;
  name: string;
}

export interface BrandOption {
  id: string;
  name: string;
}

export interface StorageLocationOption {
  id: string;
  name: string;
}

export interface PackageFilters {
  searchText: string;
  searchType: "advertisedIds" | "packageName" | "metrcTags";
  productCategoryIds?: string;
  productBrandIds?: string;
  storageLocationId?: string;
  discrepancyFilter?: "YES" | "NO";
  source?: "PLATFORM" | "METRC";
  packageStatus?: "isActive" | "isSample" | "isImported" | "isExpired" | "pendingImport";
  productProfile?: "REGULAR" | "CANNABIS";
  lastUpdatedWithinDays?: number;
  lastManuallyAdjustedWithinDays?: number;
}

export interface MetrcAdjustmentReason {
  Name: string;
  platformId: string;
}
