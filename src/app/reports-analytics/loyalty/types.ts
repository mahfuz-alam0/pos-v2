export interface LoyaltyAdjustmentRow {
  _id?: string;
  date: string;
  action: "add" | "remove" | string;
  points: number;
  employeeName?: string;
  customerName?: string;
  reason?: string;
}

export interface LoyaltyRedemptionRow {
  _id?: string;
  createdAt?: string;
  shopId?: { name?: string } | string;
  discountAmount?: number;
  discountRateType?: string;
  notes?: string;
}

export interface ReportPagination {
  page: number;
  pageSize: number;
  totalEntries: number;
  totalPages: number;
}
