import { configureStore } from "@reduxjs/toolkit";
import salesDetail from "./slices/salesDetailSlice";
import quoteForSale from "./slices/quoteForSaleSlice";
import saleData from "./slices/saleDataSlice";
import lineItems from "./slices/lineItemsSlice";
import cart from "./slices/cartSlice";
import bogoLineItems from "./slices/bogoLineItemsSlice";
import miscCharges from "./slices/miscChargesSlice";
import customer from "./slices/customerSlice";
import customerQueue from "./slices/customerQueueSlice";
import orderAction from "./slices/orderActionSlice";

export const store = configureStore({
  reducer: {
    salesDetail,
    quoteForSale,
    saleData,
    lineItems,
    cart,
    bogoLineItems,
    miscCharges,
    customer,
    customerQueue,
    orderAction,
  },
});
