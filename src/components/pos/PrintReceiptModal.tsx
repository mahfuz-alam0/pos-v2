"use client";

import { useDispatch } from "react-redux";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { resetSalesDetail } from "@/store/slices/salesDetailSlice";
import { resetAddedLineITems } from "@/store/slices/lineItemsSlice";
import { resetQuoteForSale } from "@/store/slices/quoteForSaleSlice";
import { resetCartForSale } from "@/store/slices/cartSlice";
import { setSelectedCustomer } from "@/store/slices/customerSlice";

/**
 * Post-sale receipt modal.
 *
 * Print mechanism: the old modal drove TWO print paths —
 *   1. Browser print via a `handlePrint` callback (react-to-print trigger built
 *      in the parent). This is a native browser feature and is preserved here:
 *      the "Print Invoice (Web)" button calls `handlePrint()`.
 *   2. A hardware receipt-printer path (antd `PrintModal` + `createPrintJob` +
 *      the `usePrintables`/`usePrintClients` hooks). That whole print-client
 *      subtree is NOT ported yet, so that button is intentionally omitted here
 *      and flagged — wire it back once those hooks/services are migrated.
 *
 * Props:
 *   open, onClose              — visibility control (old isNewOrderModal / setIsNewOrderModal).
 *   handlePrint()              — browser print trigger from the parent (react-to-print).
 *   createOrderRes             — createOrder response; drives the Metrc button.
 *   reportToMetric(saleId)     — callback to push the sale to Metrc.
 *   changeAmount               — cash change to surface at the top.
 *   labMode                    — when true, shows the Email Receipt button.
 *   onNewOrder()               — optional; fired after the sale state is reset.
 */
export default function PrintReceiptModal({
  open,
  onClose,
  handlePrint,
  createOrderRes,
  reportToMetric,
  changeAmount = 0,
  labMode = false,
  onNewOrder,
}) {
  const dispatch = useDispatch();

  if (!open) return null;

  const handleNewOrder = () => {
    onClose?.();
    dispatch(resetSalesDetail());
    dispatch(resetAddedLineITems());
    dispatch(resetQuoteForSale());
    dispatch(resetCartForSale());
    dispatch(setSelectedCustomer(null));
    onNewOrder?.();
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative z-[1] w-full max-w-md rounded-xl bg-card p-5 shadow-2xl">
        <div className="flex w-full flex-col gap-3">
          {changeAmount > 0 && (
            <div className="rounded-lg border border-green-300 bg-green-50 px-4 py-3 text-center dark:border-green-800 dark:bg-green-950">
              <div className="text-[13px] font-medium text-green-700 dark:text-green-400">
                Change amount
              </div>
              <div className="text-[28px] font-bold text-green-800 dark:text-green-300">
                ${Number(changeAmount).toFixed(2)}
              </div>
            </div>
          )}

          <Button
            onClick={() => handlePrint?.()}
            className="!py-6 text-2xl"
            style={{ backgroundColor: "#5C6BC0", color: "white" }}
          >
            Print Invoice (Web)
          </Button>

          {createOrderRes?.shouldAttemptMetrcReporting &&
            !createOrderRes?.isAutomatedReportingEnabled && (
              <Button
                onClick={() => reportToMetric?.(createOrderRes?.saleId)}
                className="!py-6 text-2xl"
                style={{ backgroundColor: "#E76F51", color: "white" }}
              >
                Update on Metrc
              </Button>
            )}

          {labMode && (
            <Button
              onClick={() =>
                toast.success(
                  "The receipt has been successfully sent to the customer"
                )
              }
              className="!py-6 text-2xl"
              style={{ backgroundColor: "#2196F3", color: "white" }}
            >
              Email Receipt
            </Button>
          )}

          <Button
            onClick={handleNewOrder}
            className="!py-6 text-2xl"
            style={{ background: "#2A9D8F", color: "#fff" }}
          >
            New Order
          </Button>
        </div>
      </div>
    </div>
  );
}
