import { useDispatch } from "react-redux";
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

export default function useResetPOS() {
  const dispatch = useDispatch();

  const handleResetPOS = () => {
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
  };

  return { handleResetPOS };
}
