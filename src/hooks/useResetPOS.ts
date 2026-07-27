import { useDispatch } from "react-redux";
import type { AppDispatch } from "@/store";
import { resetSalesDetail } from "@/store/slices/salesDetailSlice";
import { resetCartForSale } from "@/store/slices/cartSlice";
import { resetAddedLineITems } from "@/store/slices/lineItemsSlice";
import { resetQuoteForSale } from "@/store/slices/quoteForSaleSlice";
import { resetSelectedCustomer } from "@/store/slices/customerSlice";
import { resetBogoLineItems } from "@/store/slices/bogoLineItemsSlice";
import { updateOrderAction } from "@/store/slices/orderActionSlice";
import { resetSaleDetail } from "@/store/slices/saleDataSlice";
import { addMiscallenousCharges } from "@/store/slices/miscChargesSlice";
import { addCustomerInQueue } from "@/store/slices/customerQueueSlice";

// Shared by useResetPOS (in-app "new order"/reset) and logout() (@/util/use-auth),
// so both paths clear the same fields and can't drift out of sync.
export function resetPosState(dispatch: AppDispatch, opts?: { keepRegisterSession?: boolean }) {
  // React 18 batches these automatically — no explicit batch() needed here,
  // unlike the React 16 codebase this was ported from.
  dispatch(resetSelectedCustomer());
  dispatch(addCustomerInQueue(null));
  dispatch(resetSalesDetail());
  dispatch(resetQuoteForSale());
  dispatch(resetSaleDetail());
  dispatch(updateOrderAction(null));
  dispatch(resetBogoLineItems());
  dispatch(addMiscallenousCharges([]));
  dispatch(resetCartForSale());
  dispatch(resetAddedLineITems());

  localStorage.removeItem("pos_cart_items");
  localStorage.removeItem("pos_line_items");
  localStorage.removeItem("customerInQueueId");
  localStorage.removeItem("customerGroups");
  localStorage.removeItem("customerQueue");
  localStorage.removeItem("orderAheadStatus");
  localStorage.removeItem("orderSource");

  if (!opts?.keepRegisterSession) {
    localStorage.removeItem("registerId");
    localStorage.removeItem("drawerId");
    localStorage.removeItem("deliveryType");
    localStorage.removeItem("shopId");
  }
}

export default function useResetPOS() {
  const dispatch = useDispatch<AppDispatch>();

  const handleResetPOS = () => {
    resetPosState(dispatch, { keepRegisterSession: true });
  };

  return { handleResetPOS };
}
