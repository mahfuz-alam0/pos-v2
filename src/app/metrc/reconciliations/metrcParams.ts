// Query-param construction for the METRC packages table — kept out of the page
// component so it stays directly testable (see metrcParams.check.ts).

export type MetrcTab = "unFinish" | "finishPackages" | "finishedPackages" | "conversions";

export interface MetrcFilters {
  searchText: string;
  searchType: "metrcTags" | "productId";
  originalCategoryName?: string;
  productBrandIds?: string;
  /** Display-only, never sent — the chip would otherwise show the raw brand id. */
  productBrandName?: string;
  storageLocationId?: string;
  discrepancyFilter?: "YES" | "NO";
  source?: "PLATFORM" | "METRC";
  packageStatus?: "isActive" | "isSample" | "isImported" | "isExpired" | "pendingImport";
  productProfile?: "REGULAR" | "CANNABIS";
  lastUpdatedWithinDays?: number;
  lastManuallyAdjustedWithinDays?: number;
}

export const DEFAULT_FILTERS: MetrcFilters = { searchText: "", searchType: "metrcTags" };

export interface MetrcSort {
  sortByAlpha: number;
  sortByCreatedAt: number;
}

export const DEFAULT_SORT: MetrcSort = { sortByAlpha: 0, sortByCreatedAt: -1 };

export function buildParams(tab: MetrcTab, filters: MetrcFilters, page: number, limit: number, sort: MetrcSort) {
  const params: Record<string, any> = { page, limit, source: filters.source ?? "METRC" };
  if (sort.sortByAlpha) params.sortByAlpha = sort.sortByAlpha;
  if (sort.sortByCreatedAt) params.sortByCreatedAt = sort.sortByCreatedAt;

  if (tab === "unFinish") params.isFinished = false;
  else if (tab === "finishPackages") {
    params.isFinished = false;
    params.shouldRequiredToBeFinished = true;
  } else if (tab === "finishedPackages") {
    params.isFinished = true;
    params.hasMETRCDiscrepancy = true;
  } else if (tab === "conversions") {
    params.isConverted = true;
    params.isFinished = false;
  }

  if (filters.searchText) params[filters.searchType] = filters.searchText;
  if (filters.originalCategoryName) params.originalCategoryNames = filters.originalCategoryName;
  if (filters.productBrandIds) params.productBrandIds = filters.productBrandIds;
  if (filters.storageLocationId) params.storageLocationId = filters.storageLocationId;
  if (filters.discrepancyFilter === "YES") params.hasMETRCDiscrepancy = true;
  else if (filters.discrepancyFilter === "NO") params.hasNoMETRCDiscrepancy = true;
  if (filters.packageStatus === "pendingImport") params.isImported = false;
  else if (filters.packageStatus) params[filters.packageStatus] = true;
  if (filters.productProfile) params.packageType = filters.productProfile;
  if (filters.lastUpdatedWithinDays) params.lastUpdatedWithinDays = filters.lastUpdatedWithinDays;
  if (filters.lastManuallyAdjustedWithinDays) params.lastManuallyAdjustedWithinDays = filters.lastManuallyAdjustedWithinDays;

  return params;
}
