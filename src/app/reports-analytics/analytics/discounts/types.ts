export interface ItemDiscountRow {
  discountType: string;
  netSales: number;
  noOfItemsDiscounted: number;
  avgItemDiscount: number;
  itemDiscountPercent: number;
  newOrderPercent: number;
  winbackOrderPercent: number;
  noOfOrdersDiscounted: number;
}

export interface CategoryDiscountRow {
  categoryName: string;
  noOfItemsDiscounted: number;
  noOfOrdersDiscounted: number;
  itemDiscountPercent: number;
  avgItemDiscount: number;
}

export interface ProductDiscountRow {
  productName: string;
  noOfItemsDiscounted: number;
  noOfOrdersDiscounted: number;
  itemDiscountPercent: number;
  avgItemDiscount: number;
}

export interface EmployeeDiscountRow {
  employeeName: string;
  noOfItemsDiscounted: number;
  noOfOrdersDiscounted: number;
  itemDiscountPercent: number;
  avgItemDiscount: number;
}

export interface BrandDiscountRow {
  brandName: string;
  netSales: number;
  noOfItemsDiscounted: number;
  noOfOrdersDiscounted: number;
  totalItemDiscountAmount: number;
  avgItemDiscount: number;
  itemDiscountPercent: number;
}

export interface DiscountsExportData {
  itemDiscountsData: ItemDiscountRow[];
  categoryDiscountsData: CategoryDiscountRow[];
  productDiscountsData: ProductDiscountRow[];
  employeeDiscountsData: EmployeeDiscountRow[];
  brandDiscountsData: BrandDiscountRow[];
}

export interface DiscountsPagination {
  page: number;
  pageSize: number;
  totalEntries: number;
  totalPages: number;
}
