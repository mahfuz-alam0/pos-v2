export type PurchaseOrderStatus = "OPEN" | "CLOSED";
export type PaymentStatus = "UNPAID" | "PARTIAL" | "PAID";
export type PaymentMethod = "CASH" | "CHECK" | "BANK_TRANSFER" | "CREDIT";

export interface PurchaseOrderRow {
  id: string;
  metrcId?: string;
  supplierNameSnapshot?: string;
  status: PurchaseOrderStatus;
  paymentStatus: PaymentStatus;
  createdAt?: string;
  receivedLineItemCount?: number;
  lineItemCount?: number;
  total?: number;
}

export interface PurchaseOrderLineItem {
  id: string;
  productId?: string;
  productNameSnapshot?: string;
  orderedQty?: number;
  receivedQty?: number;
  costPerUnit?: number;
  total?: number;
  lineTotal?: number;
  totalCost?: number;
}

export interface PurchaseOrderPayment {
  id: string;
  amount: number;
  method: PaymentMethod;
  notes?: string;
  paidAt?: string;
}

export interface PurchaseOrderReception {
  id: string;
  lineItemId?: string;
}

export interface PurchaseOrderDetailData {
  id: string;
  status: PurchaseOrderStatus;
  paymentStatus: PaymentStatus;
  supplierNameSnapshot?: string;
  supplierAddress?: string;
  supplierPhone?: string;
  shopId?: string;
  shopName?: string;
  shopAddress?: string;
  createdAt?: string;
  createdByName?: string;
  paymentTerms?: string;
  paymentTermsDueDate?: string;
  expectedAt?: string;
  externalInvoiceNumber?: string;
  metrcId?: string;
  notes?: string;
  shippingFee?: number;
  total?: number;
  amountPaid?: number;
  outstandingBalance?: number;
  lineItems?: PurchaseOrderLineItem[];
  payments?: PurchaseOrderPayment[];
  receptions?: PurchaseOrderReception[];
}

export interface SupplierOption {
  id: string;
  name?: string;
  licenseNumber?: string;
}

export interface PurchaseOrderFilters {
  metrcId: string;
  productName: string;
  supplierId?: string;
  status?: PurchaseOrderStatus;
  paymentStatus?: PaymentStatus;
  startDate?: string;
  endDate?: string;
}
