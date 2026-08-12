/** A single cart line item inside `CustomerQueueItem.cartMetaDataJsonString`. */
export interface QueueCartLineItem {
  id?: string | null;
  advertisedId?: string | null;
  key?: string | null;
  productId?: string | null;
  inventoryId?: string | null;
  packageId?: string | null;
  name?: string | null;
  productName?: string | null;
  price?: number | null;
  purchaseQuantity?: number | null;
  sellableUomShortForm?: string | null;
  shouldAllowDecimalValue?: boolean | null;
  expiry?: string | null;
  createdAt?: string | null;
}

/** The parsed cart payload saved on a queued customer. */
export interface QueueCartMetaData {
  shopId?: string | null;
  customerId?: string | null;
  customerTypeId?: string | null;
  customerGroupId?: string | null;
  tipGiven?: number | null;
  lineItems?: QueueCartLineItem[] | null;
  miscCharges?: unknown[] | null;
  miscDiscount?: number | null;
  registerId?: string | null;
  drawerId?: string | null;
  internalNote?: string | null;
  receiptNote?: string | null;
  changeMethod?: string | null;
  changeAmount?: number | null;
  storeCreditsUtilized?: unknown[] | null;
  userProvidedDate?: string | null;
  userProvidedTwelveHoursTime?: string | null;
  deliveryMethod?: string | null;
  applicableRegularDeals?: unknown[] | null;
  applicableBogoDeals?: unknown[] | null;
  couponId?: string | null;
  loyaltyPointsClaimed?: number | null;
  proxyPin?: string | null;
  bundledLineItems?: unknown[] | null;
  customerDetails?: {
    firstName?: string | null;
    lastName?: string | null;
    phone?: string | null;
    avatarUrl?: string | null;
  } | null;
  tipPreference?: string | null;
  customerInQueueId?: string | null;
}

/** A customer entry in the `/customer-queue/list` response. */
export interface CustomerQueueItem {
  orgId?: string | null;
  avatarUrl?: string | null;
  countryCode?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  deletedAt?: string | null;
  customerId?: string | null;
  customerTypeId?: string | null;
  customerTypeName?: string | null;
  dob?: string | null;
  documentLinks?: unknown[] | null;
  drivingLicense?: string | null;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  groupIdsToBeZipped?: string[] | null;
  groupNamesToBeZipped?: string[] | null;
  id?: string | null;
  internalNotes?: string | null;
  isAnonymous?: boolean | null;
  isGettingServed?: boolean | null;
  isLocked?: boolean | null;
  isWaiting?: boolean | null;
  isAddedByQrScan?: boolean | null;
  isRemoved?: boolean | null;
  mjMedicalCareGiverLicense?: string | null;
  mjMedicalLicense?: string | null;
  mjMedicalLicenseExpiresAt?: string | null;
  note?: string | null;
  personId?: string | null;
  phone?: string | null;
  receiptNotes?: string | null;
  shopId?: string | null;
  drivingLicenseExpiresAt?: string | null;
  onboardedDateString?: string | null;
  addedByEmployeeId?: string | null;
  /** JSON string of `QueueCartMetaData` — the saved in-progress cart. */
  cartMetaDataJsonString?: string | null;
}

/** Response envelope of `/customer-queue/list`. */
export interface CustomerQueueListResponse {
  customers?: CustomerQueueItem[] | null;
  hasMore?: boolean;
  limit?: number;
}
