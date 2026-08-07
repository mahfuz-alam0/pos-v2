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

export interface MetrcSnapshotData {
  Id?: number;
  Label?: string;
  PackageType?: string;
  SourceHarvestNames?: string;
  ProductName?: string;
  ProductCategoryName?: string;
  Quantity?: number;
  UnitOfMeasureName?: string;
  PackagedDate?: string;
  LocationName?: string;
  ItemStrainName?: string;
  ExpirationDate?: string;
  PackageState?: string;
  IsSample?: boolean;
  IsTestingSample?: boolean;
  IsProcessValidationTestingSample?: boolean;
  SupplierName?: string;
  TestingStatus?: string;
  DateTested?: string;
}

export interface MetrcData {
  metrcTag?: string;
  metrcId?: string;
  metrcLabel?: string;
  batchId?: string;
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
