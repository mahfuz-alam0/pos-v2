export interface InventoryTransactionRow {
  _id: string;
  dateTime: string;
  packageId: string;
  productName: string;
  categoryName?: string;
  brandName?: string;
  quanitiy: number;
  transcationType: string;
  roomName?: string;
  unitCost: number;
  totalCost: number;
}

export interface PackageHistoryRow {
  _id: string;
  productName: string;
  productSku?: string;
  location?: { country?: string };
  transactionId: string;
  transactionType: string;
  packageQuantityChange: number;
  packageTotal: number;
  roomName?: string;
  createdAt?: string;
}

export interface InventorySnapshotRow {
  _id?: string;
  productName: string;
  category: string;
  containsMJ: boolean;
  currentQty: number;
  unitWeight?: number;
  netWeight?: number;
  costPerItem: number;
  cog: number;
  salesPrice: number;
  retailValue: number;
}

export interface InventoryPagination {
  page: number;
  pageSize: number;
  totalEntries: number;
  totalPages: number;
}
