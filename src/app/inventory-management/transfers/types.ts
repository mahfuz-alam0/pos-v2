export type TransferTab = "within-storage-locations" | "with-in-shops" | "supplier-specific";

export interface WithinLocationTransferRow {
  id: string;
  createdAt: string;
  sourceStorageLocation: string;
  destinationStorageLocation: string;
  initiatedBy?: { name?: string };
  advertisedId?: string;
}

export interface ShopTransferRow {
  id: string;
  createdAt: string;
  sourceStorageLocation?: string;
  destinationStorageLocation?: string;
  isIncoming?: boolean;
  advertisedId?: string;
  isCompleted?: boolean;
}

export interface SupplierTransferRow {
  id: string;
  createdAt: string;
  advertisedId?: string;
  fromSupplier?: { id?: string; name?: string };
  toSupplier?: { id?: string; name?: string };
  transferType?: "incoming" | "outgoing" | "unknown";
  totalPrice?: number;
  numberOfPackages?: number;
  isTransit?: boolean;
  isCompleted?: boolean;
  [key: string]: any;
}

export interface EmployeeOption {
  id: string;
  name?: string;
}

export interface PaginationState {
  limit: number;
  page: number;
  totalEntries: number;
  totalPages: number;
}
