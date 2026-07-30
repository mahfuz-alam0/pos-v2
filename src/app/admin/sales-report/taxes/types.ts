export interface TaxLineItem {
  name: string;
  rate: number | null;
  amount: number;
}

export interface TaxDetailRow {
  productId?: string;
  createdAt?: string;
  locationName?: string;
  categoryName?: string;
  productName?: string;
  sku?: string;
  purchaseUoMShortForm?: string;
  advertisedSaleId?: string;
  brandName?: string;
  supplierName?: string;
  supplierLicense?: string;
  dateSold?: string;
  unitPrice?: number;
  quantitySold?: number;
  totalPrice?: number;
  totalTaxApplied?: number;
  taxes?: TaxLineItem[];
}

export interface TaxDetailSummary {
  totalSales?: number;
  totalTax?: number;
  totalQuantitySold?: number;
  totalTransactions?: number;
}

export interface TaxExemptionRow {
  id?: string;
  date?: string;
  customerTypeName?: string;
  taxType?: string;
  exemptionReason?: string;
  taxAmountExempt?: number;
  employeeName?: string;
  customerName?: string;
  productName?: string;
}

export interface ReportPagination {
  page: number;
  pageSize: number;
  totalEntries: number;
  totalPages: number;
}
