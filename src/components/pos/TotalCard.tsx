"use client";

import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Drawer from "@/components/ui/Drawer";

import ProductPromoTaxes from "@/components/pos/ProductPromoTaxes";
import MiscellaneousChargeDrawer from "@/components/pos/MiscellaneousChargeDrawer";
import PaymentStatusRow from "@/components/pos/PaymentStatusRow";
import QuickActionsRow from "@/components/pos/QuickActionsRow";
import LoyaltyPointsPanel from "@/components/pos/LoyaltyPointsPanel";
import Notes from "@/components/pos/Notes";
import AddTip from "@/components/pos/AddTip";
import EnterPin from "@/components/pos/EnterPin";
import PaymentSidebar from "@/components/pos/PaymentSidebar";
import PrintReceiptModal from "@/components/pos/PrintReceiptModal";
import ReturnSummary from "@/components/pos/ReturnSummary";

import { updateSalesDetail, resetSalesDetail } from "@/store/slices/salesDetailSlice";
import {
  getQuoteForSale,
  resetQuoteForSale,
} from "@/store/slices/quoteForSaleSlice";
import { resetSaleDetail } from "@/store/slices/saleDataSlice";
import { resetAddedLineITems } from "@/store/slices/lineItemsSlice";
import { addMiscallenousCharges } from "@/store/slices/miscChargesSlice";
import { resetBogoLineItems } from "@/store/slices/bogoLineItemsSlice";
import { updateOrderAction } from "@/store/slices/orderActionSlice";

import { getQuoteForSales } from "@/services/sales/getQuoteforSales";
import { getCustomerLoyaltyStatus } from "@/services/loyalty/getCustomerLoyaltyStatus";
import { getOrderStatuses } from "@/services/sales/getOrderStatuses";
import { createOrder as createOrderService } from "@/services/sales/createOrder";
import { createSaleDraft } from "@/services/sales/createSaleDraft";
import { updateOrderStatus as updateOrderStatusService } from "@/services/sales/updateOrderStatus";
import { createReturn } from "@/services/sales/createReturn";
import { getSingleSale } from "@/services/sales/getSingleSales";
import { quoteApiManager } from "@/utils/quoteApiManager";
import useDiscountTypes from "@/hooks/useDiscountTypes";

/**
 * Cart / checkout summary panel — the right side of the POS screen. Ported from
 * app/components/posModule/totalCard.js (~6080 lines).
 *
 * Orchestration reproduced from the old file:
 *  - orderAction drives the whole panel: null = live sale, "processReturns" =
 *    return flow (ReturnSummary + refund method + Process Return), "processOrder"
 *    = order-ahead editing (status update).
 *  - live sale: ProductPromoTaxes (line items / taxes / promos / misc-discount /
 *    loyalty display), applied-coupon row, NewAvailableCoupons,
 *    then the Complete Order / Checkout button that either opens PaymentSidebar or
 *    (when payment is already configured) fires createOrder.
 *  - PaymentSidebar.onProcessPayment stores payment details; the checkout button
 *    then calls createOrder(payload) -> buildOrderBody -> create-internal-sale.
 *  - new order status: Send to Fulfillment -> createOrderFullfilment.
 *  - existing order (processOrder): Update Order Status -> update-sale-status.
 *  - after a successful order: reset session, open PrintReceiptModal, refreshOrders.
 *  - Save as Draft -> sale-drafts/create.
 *  - deletes/removals (misc charge, misc discount, loyalty, regular deal) each
 *    dispatch to salesDetail then re-quote through quoteApiManager.
 *  - Share Mode: when a proxyPin is required it defers the action behind EnterPin.
 *
 * Intentionally deferred (named in report, not silently dropped):
 *  - ACH QR / socket payment-confirmation flow and manual-transaction verify.
 *  - Hardware auto-print (usePrint) — PrintReceiptModal handles browser print.
 *  - METRC sale/return reporting (no service in this app yet).
 */
export default function TotalCard({
  refreshOrders,
  onDraftSaved,
  setResetOrderHistory,
  deliverySubType,
  deliveryType,
}: any) {
  const dispatch = useDispatch();

  const getOrderSummary = useSelector((state: any) => state?.quoteForSale?.lineItems);
  const quoteBody = useSelector((state: any) => state?.salesDetail);
  const selectedCustomer = useSelector(
    (state: any) => state.customer?.selectedCustomer
  );
  const saleDetail = useSelector((state: any) => state?.saleData) || {};
  const currentAction = useSelector((state: any) => state?.orderAction?.orderAction);
  const lineItems = useSelector((state: any) => state?.lineItems?.lineItems) || [];
  const bogoData = useSelector((state: any) => state?.bogoLineItems?.bogoDeals) || [];
  const currentMiscallenousCharges = useSelector(
    (state: any) => state?.miscCharges?.miscCharges || []
  );

  const { discountTypes } = useDiscountTypes();
  const isDisabledLoyalty = !discountTypes.includes("LOYALTY_POINTS");

  // ---- Local UI / payment state --------------------------------------------
  const [orderStatus, setOrderStatus] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState(undefined);
  const [orderStatusDetails, setOrderStatusDetails] = useState(null);

  const [loading, setLoading] = useState(false);
  const [orderProcessing, setOrderProcessing] = useState(false);
  const [saveDraftLoading, setSaveDraftLoading] = useState(false);
  const [sendToFulfilmentLoading, setSendToFulfilmentLoading] = useState(false);
  const [subTotalValue, setSubTotalValue] = useState(0);

  const [notes, setNotesOpen] = useState(false);
  const [visibleTip, setVisibleTip] = useState(false);
  const [miscallenousCharge, setMiscallenousCharge] = useState(false);
  const [miscallenousDiscount, setMiscallenousDiscount] = useState(false);
  const [errorModal, setErrorModal] = useState(false);
  const [errorList, setErrorList] = useState("");

  // Loyalty points
  const [customerLoyaltyInfo, setCustomerLoyaltyInfo] = useState(null);
  const [appliedLoyaltyPoints, setAppliedLoyaltyPoints] = useState(0);
  const [loyaltyLoading, setLoyaltyLoading] = useState(false);

  // Payment (PaymentSidebar is fully controlled from here)
  const [paymentSidebarVisible, setPaymentSidebarVisible] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [method, setMethod] = useState("CASH");
  const [cashAmount, setCashAmount] = useState(0);
  const [cardPaymentAmount, setCardPaymentAmount] = useState(0);
  const [debitCardAmount, setDebitCardAmount] = useState(0);
  const [cashlessATMAmount, setCashlessATMAmount] = useState(0);
  const [bleaumACHAmount, setBleaumACHAmount] = useState(0);
  const [storeCreditAmount, setStoreCreditAmount] = useState(0);
  const [selectedStoreCredit, setSelectedStoreCredit] = useState(null);
  const [splitMode, setSplitMode] = useState(false);
  const [changeValue, setChangeValue] = useState(0);
  const [tipAmountSidebar, setTipAmountSidebar] = useState(0);
  const [tipPaymentMethod, setTipPaymentMethod] = useState("CASH");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [processingFee, setProcessingFee] = useState({
    creditCard: 0,
    debitCard: 0,
    cashlessATM: 0,
    ach: 0,
  });
  const [isAch, setIsAch] = useState(false);
  const [onlineTransactionFee, setOnlineTransactionFee] = useState(0);
  const [resetPaymentFields, setResetPaymentFields] = useState(false);
  const [quoteError, setQuoteError] = useState(null);

  // Return / refund method (return flow + cancel-with-refund)
  const [returnedMethod, setReturnedMethod] = useState(null);
  const [cashReturned, setCashReturned] = useState<any>(0);
  const [storeCreditsReturned, setStoreCreditsReturned] = useState<any>(0);
  const [returnStrategy] = useState("RESPECTIVE");
  const [showRefundMethod, setShowRefundMethod] = useState(false);
  const [cancellationReason] = useState(null);

  // Print / new-order modal
  const [isNewOrderModal, setIsNewOrderModal] = useState(false);
  const [createOrderRes, setCreateOrderRes] = useState(null);
  const [invoiceOrderId, setInvoiceOrderId] = useState(null);
  const [orderChangeAmount, setOrderChangeAmount] = useState(0);

  // Share Mode PIN gating
  const [shareModePin, setShareModePin] = useState(false);
  const pendingPinActionRef = useRef(null);
  const [originalPaymentPayload, setOriginalPaymentPayload] = useState(null);

  const shareMode =
    typeof window !== "undefined" && localStorage.getItem("shareMode");
  const isShareModeActive = () => shareMode === "true";

  // Old header "Reset" toggle — visible once there's cart history.
  useEffect(() => {
    setResetOrderHistory?.(lineItems.length > 0 || bogoData.length > 0);
  }, [lineItems.length, bogoData.length, setResetOrderHistory]);

  // ---- Order statuses -------------------------------------------------------
  const fetchOrderStatus = () => {
    const orderSource = saleDetail?.source ? saleDetail.source : "INTERNAL";
    const orderDeliveryMethod =
      saleDetail?.deliveryMethod || quoteBody?.deliveryMethod;

    getOrderStatuses(orderSource, orderDeliveryMethod)
      .then((res) => {
        const statuses = res.data.data.statuses || [];
        let updated =
          orderDeliveryMethod === "DELIVERY"
            ? statuses.filter((s) => !s.isAssociatedWithDelivery)
            : statuses;

        if (
          ["processReturns", "processRefunds", "processOrder"].includes(
            currentAction
          )
        ) {
          if (!updated.some((s) => s.statusId === "CANCELLED")) {
            const cancelled = statuses.find((s) => s.statusId === "CANCELLED");
            if (cancelled) updated = [...updated, cancelled];
          }
        } else {
          updated = updated.filter((s) => s.statusId !== "CANCELLED");
        }
        setOrderStatus(updated);
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchOrderStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentAction, quoteBody?.deliveryMethod, saleDetail?.id]);

  // ---- Loyalty: load the selected customer's points balance -----------------
  const customerIdForLoyalty = selectedCustomer?.id || quoteBody?.customerId;
  useEffect(() => {
    if (!customerIdForLoyalty) {
      setCustomerLoyaltyInfo(null);
      setAppliedLoyaltyPoints(0);
      return;
    }
    getCustomerLoyaltyStatus(customerIdForLoyalty)
      .then((res) => setCustomerLoyaltyInfo(res?.data?.data?.info || null))
      .catch(() => setCustomerLoyaltyInfo(null));
  }, [customerIdForLoyalty]);

  const selectedStatusObj =
    orderStatus?.find((s) => s.statusId === selectedStatus) ||
    orderStatus?.find((s) => s.isDefaultSelection) ||
    null;
  const colorCode = selectedStatusObj?.colorCode || "";

  const handleChange = (value) => {
    const statusObj = orderStatus?.find((s) => s.statusId === value);
    if (!statusObj) return;
    setOrderStatusDetails(statusObj);
    setSelectedStatus(value);
    dispatch(updateSalesDetail({ statusId: value }));

    const isPaidInFull = saleDetail?.paymentStatus === "PAID_IN_FULL";
    setShowRefundMethod(value === "CANCELLED" && isPaidInFull);
  };

  // ---- Quote refresh helper (replaces old useAutoRefresh) -------------------
  const reQuote = async (updatedQuoteBody, source) => {
    const res = await quoteApiManager.call(
      getQuoteForSales,
      updatedQuoteBody,
      source
    );
    if (res?.data) dispatch(getQuoteForSale(res.data));
    return res;
  };

  // ---- Applied-discount removals -------------------------------------------
  const deleteMiscCharge = async (id) => {
    const updated = currentMiscallenousCharges.filter(
      (item) => item?.taxProfileId !== id
    );
    dispatch(addMiscallenousCharges(updated));
    dispatch(updateSalesDetail({ miscCharges: updated }));
    try {
      await reQuote(
        { ...quoteBody, miscCharges: updated },
        "totalCard-delete-misc-charge"
      );
    } catch (e) {
      console.error("delete misc charge", e);
    }
  };

  const deleteMiscallenousDiscount = async () => {
    dispatch(updateSalesDetail({ miscDiscount: null }));
    try {
      await reQuote(
        { ...quoteBody, miscDiscount: null },
        "totalCard-delete-misc-discount"
      );
      toast.success("Miscellaneous discount removed");
    } catch (e) {
      toast.error("Error removing miscellaneous discount");
    }
  };

  const deleteLoyaltyPoints = async () => {
    dispatch(updateSalesDetail({ loyaltyPointsClaimed: 0 }));
    setAppliedLoyaltyPoints(0);
    try {
      await reQuote(
        { ...quoteBody, loyaltyPointsClaimed: 0 },
        "totalCard-delete-loyalty"
      );
      toast.success("Loyalty points removed");
    } catch (e) {
      console.error("delete loyalty", e);
    }
  };

  // Points entered by the cashier are converted to their dollar value using the
  // customer's current points-per-dollar rate before being sent as loyaltyPointsClaimed.
  const applyLoyaltyPoints = async (points) => {
    if (loyaltyLoading || !points || points <= 0) return;

    const finalPayable = getOrderSummary?.data?.finalPayable || 0;
    const availableBalance = customerLoyaltyInfo?.amountRepresentation || 0;

    if (points > availableBalance) {
      toast.warning("Loyalty points applied exceed available balance.");
      return;
    }
    if (points > finalPayable) {
      toast.warning("Loyalty points cannot exceed the order total.");
      return;
    }

    const conversionRate =
      (customerLoyaltyInfo?.userLoyaltyStatus?.currentLoyaltyPoints || 0) /
      (availableBalance || 1);
    const convertedLoyaltyPoints = points * conversionRate;

    setLoyaltyLoading(true);
    dispatch(updateSalesDetail({ loyaltyPointsClaimed: convertedLoyaltyPoints }));
    try {
      const res = await reQuote(
        { ...quoteBody, loyaltyPointsClaimed: convertedLoyaltyPoints },
        "totalCard-apply-loyalty"
      );
      const loyaltyErrors = res?.data?.data?.errorMessages?.loyaltyPoints || [];
      if (loyaltyErrors.length > 0) {
        setErrorList("Please resolve the highlighted loyalty point errors.");
        setErrorModal(true);
      } else {
        toast.success("Loyalty points applied successfully");
      }
    } catch (error: any) {
      toast.error(error?.error || "Error applying loyalty points");
    } finally {
      setLoyaltyLoading(false);
    }
  };

  const removeDealFromSelectedProduct = async (data) => {
    if (!data?.packageId || !data?.productId || !data?.dealId) return;
    const updated = (quoteBody?.applicableRegularDeals || []).filter(
      (item) =>
        !(
          item.dealId === data.dealId &&
          item.packageId === data.packageId &&
          item.productId === data.productId
        )
    );
    dispatch(updateSalesDetail({ applicableRegularDeals: updated }));
    try {
      await reQuote(
        { ...quoteBody, applicableRegularDeals: updated },
        "totalCard-remove-deal"
      );
      toast.success("Deal removed");
    } catch (e) {
      toast.error("Error removing deal");
    }
  };

  const getMiscDiscountFromOrderData = (orderData) => {
    if (!orderData) return 0;
    return [
      ...(orderData.nonPackagedLineItems || []),
      ...(orderData.packagedLineItems || []).flatMap((item) => [
        ...(item.parentLineItems || []),
        ...(item.childLineItems || []),
      ]),
    ]
      .map((item) => item.createdLineItem)
      .filter(Boolean)
      .flatMap((item) => item.discountBreakDownHierarchy || [])
      .filter((item) => item.source === "MISCELLANEOUS" && !item.isDisabled)
      .reduce((acc, item) => acc + (item.totalDiscountApplied || 0), 0);
  };

  // ---- Payment sidebar open/close ------------------------------------------
  const handleOpenPaymentSidebar = () => {
    if (currentAction === "processOrder" && saleDetail?.paymentMethod) {
      setPaymentMethod(saleDetail.paymentMethod || "CASH");
      setCashAmount(saleDetail.cashPaid || 0);
      setChangeValue(saleDetail.changeAmount || 0);
      setPaymentNotes(saleDetail.notes || "");
      setTipAmountSidebar(saleDetail.tipGiven || 0);
      setCashlessATMAmount(saleDetail.cashlessATMAmount || 0);
      setCardPaymentAmount(saleDetail.cardAmount || 0);
      setBleaumACHAmount(saleDetail.bleaumACHAmount || 0);
      setStoreCreditAmount(saleDetail.storeCreditAmount || 0);
      setSplitMode(saleDetail.splitMode || false);
    } else {
      setPaymentMethod("CASH");
      setCashAmount(0);
      setCardPaymentAmount(0);
      setChangeValue(0);
      setPaymentNotes("");
      setCashlessATMAmount(0);
      setBleaumACHAmount(0);
      setStoreCreditAmount(0);
      setSplitMode(false);
      setTipAmountSidebar(0);
    }
    setPaymentSidebarVisible(true);
  };

  const handleClosePaymentSidebar = () => setPaymentSidebarVisible(false);
  const handleAddMiscCharge = () => setMiscallenousCharge(true);
  const handleRemoveMiscCharge = (index) =>
    deleteMiscCharge(currentMiscallenousCharges[index]?.taxProfileId);

  // ---- Build order body (ported verbatim in structure) ----------------------
  const buildOrderBody = (
    paymentPayload,
    isPaymentCompleted = false,
    achData = null,
    overrideProxyPin = undefined
  ) => {
    const currentTipPreference =
      paymentPayload?.tipPreference ||
      quoteBody?.tipPreference ||
      tipPaymentMethod ||
      "CASH";
    const finalPayable = getOrderSummary?.data?.finalPayable || 0;
    const currentPaymentMethod = paymentPayload?.paymentMethod || paymentMethod;
    const cashPaidAmount =
      paymentPayload?.cashPaid ||
      paymentPayload?.cashAmount ||
      Number.parseFloat(String(cashAmount)) ||
      0;
    const virtualPaidAmount =
      paymentPayload?.virtualPaid ||
      (paymentPayload
        ? (paymentPayload.cardAmount || 0) +
          (paymentPayload.cashlessATMAmount || 0) +
          (paymentPayload.bleaumACHAmount || 0) +
          (paymentPayload.debitCardAmount || 0)
        : 0);
    const currentChangeAmount =
      paymentPayload?.changeAmount || Number.parseFloat(String(changeValue)) || 0;
    const currentChangeMethod =
      paymentPayload?.changeMethod || quoteBody?.changeMethod || "CASH";
    const currentTipAmount =
      paymentPayload?.tipAmount ||
      Number.parseFloat(String(quoteBody.tipGiven)) ||
      0;
    const currentStoreCreditsUtilized =
      paymentPayload?.storeCreditsUtilized ||
      (quoteBody?.storeCreditsUtilized?.length > 0
        ? quoteBody?.storeCreditsUtilized
        : []);

    let body = {
      ...quoteBody,
      statusId: "COMPLETED",
      shopId: JSON.parse(localStorage.getItem("shopId")),
      tipGiven: currentTipAmount,
      changeMethod: currentChangeMethod,
      changeAmount: currentChangeAmount,
      tipPreference: currentTipPreference,
      customerInQueueId: JSON.parse(localStorage.getItem("customerInQueueId")),
      storeCreditsUtilized: currentStoreCreditsUtilized,
      ...(quoteBody?.deliveryMethod === "DELIVERY" && {
        deliveryMethod: "DELIVERY",
        deliveryAddress: quoteBody?.deliveryAddress || null,
        ...(quoteBody?.preferredDeliveryPriorityId
          ? { preferredDeliveryPriorityId: quoteBody.preferredDeliveryPriorityId }
          : {}),
      }),
    };

    if (currentPaymentMethod === "CASH") {
      body = {
        ...body,
        paymentMethod: "CASH",
        cashPaid: cashPaidAmount || finalPayable,
        onlinePaymentMethod: method,
      };
    } else if (currentPaymentMethod === "VIRTUAL") {
      body = {
        ...body,
        paymentMethod: "VIRTUAL",
        onlinePaymentMethod: method,
        virtualPaid: virtualPaidAmount || finalPayable,
        isAchPayment: false,
      };
    } else {
      body = {
        ...body,
        paymentMethod: "BOTH_CASH_VIRTUAL",
        cashPaid: cashPaidAmount,
        virtualPaid: virtualPaidAmount,
        onlinePaymentMethod: method,
        isAchPayment: false,
      };
    }

    if (overrideProxyPin !== undefined) body = { ...body, proxyPin: overrideProxyPin };
    return body;
  };

  const hasQuoteErrors = () => {
    const em = getOrderSummary?.data?.errorMessages;
    return (
      em?.loyaltyPoints?.length > 0 ||
      em?.coupon?.length > 0 ||
      Object.keys(em?.regularDeals || {}).length > 0 ||
      Object.keys(em?.bogoDeals || {}).length > 0
    );
  };

  const resetSessionAfterOrder = () => {
    dispatch(resetBogoLineItems());
    dispatch(updateSalesDetail({}));
    dispatch(updateOrderAction("orderCreated"));
    setTimeout(() => dispatch(updateOrderAction(null)), 1000);
    if (typeof refreshOrders === "function") refreshOrders();
    setOrderChangeAmount(changeValue);
    setIsNewOrderModal(true);
  };

  // ---- Create order (checkout) ----------------------------------------------
  const createOrder = async (
    paymentPayload = null,
    overrideProxyPin = undefined
  ) => {
    if (orderProcessing) return;
    setLoading(true);
    setOrderProcessing(true);

    const effectiveProxyPin =
      overrideProxyPin !== undefined ? overrideProxyPin : quoteBody?.proxyPin;
    if (isShareModeActive() && (effectiveProxyPin === null || effectiveProxyPin === undefined)) {
      pendingPinActionRef.current = (pin) => createOrder(paymentPayload, pin);
      setShareModePin(true);
      setLoading(false);
      setOrderProcessing(false);
      return;
    }

    const emptyCart =
      (!quoteBody.lineItems || quoteBody.lineItems.length === 0) &&
      (!quoteBody?.bundledLineItems || quoteBody.bundledLineItems.length === 0) &&
      (!lineItems || lineItems.length === 0);
    if (emptyCart) {
      toast.error("Your cart is empty. Please add products before placing an order.");
      setLoading(false);
      setOrderProcessing(false);
      return;
    }

    if (hasQuoteErrors()) {
      setErrorModal(true);
      setErrorList("Please resolve the highlighted loyalty/coupon/deal errors.");
      setLoading(false);
      setOrderProcessing(false);
      return;
    }

    try {
      if (paymentPayload) setOriginalPaymentPayload(paymentPayload);
      const body = buildOrderBody(
        paymentPayload || originalPaymentPayload,
        false,
        null,
        effectiveProxyPin
      );
      const res = await createOrderService(body);
      if (res.data.success) {
        const saleId = res.data.data.saleId;
        setInvoiceOrderId(saleId);
        setCreateOrderRes({
          ...res.data.data,
          nonPackagedLineItems: getOrderSummary?.data?.nonPackagedLineItems,
        });
        toast.success("Order placed successfully");
        resetSessionAfterOrder();
        setOriginalPaymentPayload(null);
      } else {
        const requestId = res.data?.data?.requestId;
        toast.error(
          `Order could not be completed.${requestId ? ` (Request ID: ${requestId})` : ""}`
        );
      }
    } catch (error) {
      if (error?.error === "No user found for the pin") {
        dispatch(updateSalesDetail({ proxyPin: null }));
        setShareModePin(true);
      }
      toast.error(error?.message || error?.error || "Unexpected error occurred");
    } finally {
      setLoading(false);
      setOrderProcessing(false);
    }
  };

  // ---- Send to fulfillment (new orders, non-terminal statuses) --------------
  const createOrderFullfilment = async (status, overrideProxyPin = undefined) => {
    const emptyCart =
      (!quoteBody.lineItems || quoteBody.lineItems.length === 0) &&
      (!quoteBody?.bundledLineItems || quoteBody.bundledLineItems.length === 0) &&
      (!lineItems || lineItems.length === 0);
    if (emptyCart) {
      toast.error("Your cart is empty. Please add products before placing an order.");
      return;
    }

    if (isShareModeActive() && quoteBody?.proxyPin == null && overrideProxyPin === undefined) {
      pendingPinActionRef.current = (pin) => createOrderFullfilment(status, pin);
      setShareModePin(true);
      return;
    }

    setSendToFulfilmentLoading(true);
    const isTerminalState = orderStatus?.find(
      (s) => s.statusId === status
    )?.isTerminationState;

    let body = {
      ...quoteBody,
      ...(overrideProxyPin !== undefined ? { proxyPin: overrideProxyPin } : {}),
      shopId: JSON.parse(localStorage.getItem("shopId")),
      statusId: status,
      tipGiven: parseFloat(quoteBody.tipGiven || 0),
      customerInQueueId: JSON.parse(localStorage.getItem("customerInQueueId")),
      storeCreditsUtilized:
        quoteBody?.storeCreditsUtilized?.length > 0
          ? quoteBody?.storeCreditsUtilized
          : [],
      isAchPayment: false,
      ...(quoteBody?.deliveryMethod === "DELIVERY" && {
        deliveryMethod: "DELIVERY",
        deliveryAddress: quoteBody?.deliveryAddress || null,
      }),
    };

    if (isTerminalState) {
      const paid = getOrderSummary?.data?.finalPayable;
      if (paymentMethod === "CASH") {
        body = { ...body, paymentMethod: "CASH", changeAmount: changeValue, cashPaid: paid };
      } else if (paymentMethod === "VIRTUAL") {
        body = {
          ...body,
          paymentMethod: "VIRTUAL",
          changeMethod: quoteBody?.changeMethod || "CASH",
          changeAmount: changeValue,
          virtualPaid: paid,
        };
      }
    }

    try {
      const res = await createOrderService(body);
      if (res.data.success) {
        setInvoiceOrderId(res.data.data.saleId);
        setCreateOrderRes(res.data.data);
        toast.success("Order placed successfully");
        resetSessionAfterOrder();
      } else {
        toast.error("Order could not be completed.");
      }
    } catch (error) {
      toast.error(error?.message || error?.error || "Unexpected error occurred");
    } finally {
      setSendToFulfilmentLoading(false);
    }
  };

  // ---- Save as draft --------------------------------------------------------
  const handleSaveAsDraft = async () => {
    if (
      (!quoteBody.lineItems || quoteBody.lineItems.length === 0) &&
      (!quoteBody?.bundledLineItems || quoteBody.bundledLineItems.length === 0)
    ) {
      toast.error("Your cart is empty. Please add products before saving a draft.");
      return;
    }

    const {
      couponId,
      applicableBogoDeals,
      applicableTieredDeals,
      loyaltyPointsClaimed,
      appliedDiscounts,
      disabledDiscountSources,
      manualDiscount,
      forcedDiscountRate,
      forcedManualDiscountType,
      forcedRecommendedUnitPrice,
      ...quoteBodyWithoutDiscounts
    } = quoteBody;

    const body = {
      ...quoteBodyWithoutDiscounts,
      shopId: JSON.parse(localStorage.getItem("shopId")),
      tipGiven: parseFloat(quoteBody.tipGiven || 0),
      customerInQueueId: JSON.parse(localStorage.getItem("customerInQueueId")),
      storeCreditsUtilized:
        quoteBody?.storeCreditsUtilized?.length > 0
          ? quoteBody?.storeCreditsUtilized
          : [],
      lineItems: (quoteBodyWithoutDiscounts.lineItems || []).map((item) => ({
        ...item,
        disabledDiscountSources: [],
      })),
    };

    setSaveDraftLoading(true);
    try {
      const res = await createSaleDraft(body);
      if (res.data.success) {
        toast.success("Draft saved successfully!");
        onDraftSaved?.();
      } else {
        toast.error("Failed to save draft.");
      }
    } catch (error) {
      toast.error(error?.message || error?.error || "Failed to save draft.");
    } finally {
      setSaveDraftLoading(false);
    }
  };

  // ---- Process payment (stores payment details, closes sidebar) -------------
  const handleProcessPayment = async (paymentPayload) => {
    try {
      setMethod(paymentPayload.onlinePaymentMethod);
      const updatedQuoteBody = {
        ...quoteBody,
        virtualPaid: paymentPayload.virtualPaid,
        onlinePaymentMethod: paymentPayload.onlinePaymentMethod,
        lineItems: quoteBody.lineItems,
        tipGiven: paymentPayload.tipAmount || 0,
        storeCreditsUtilized: paymentPayload.storeCreditsUtilized || [],
      };
      const quoteResponse = await getQuoteForSales(updatedQuoteBody);
      setOnlineTransactionFee(
        quoteResponse?.data?.data?.onlineTransactionFee?.amount || 0
      );
      if (!quoteResponse.data.success) {
        toast.error("Failed to get quote");
        return;
      }
      const quoteData = quoteResponse.data.data;
      const em = quoteData?.errorMessages;
      if (
        em?.loyaltyPoints?.length > 0 ||
        em?.coupon?.length > 0 ||
        Object.keys(em?.regularDeals || {}).length > 0 ||
        Object.keys(em?.bogoDeals || {}).length > 0
      ) {
        setErrorModal(true);
        return;
      }

      setPaymentMethod(paymentPayload.paymentMethod);
      setChangeValue(paymentPayload.changeAmount);
      setPaymentNotes(paymentPayload.notes);
      setCashAmount(paymentPayload.cashAmount || 0);
      setStoreCreditAmount(paymentPayload.storeCreditAmount || 0);
      setCashlessATMAmount(paymentPayload.cashlessATMAmount || 0);
      setCardPaymentAmount(paymentPayload.cardAmount || 0);
      setBleaumACHAmount(paymentPayload.bleaumACHAmount || 0);
      setSplitMode(paymentPayload.splitMode || false);
      setTipAmountSidebar(paymentPayload.tipAmount || 0);

      if (paymentPayload.storeCreditsUtilized?.length > 0) {
        setSelectedStoreCredit({
          shopId: paymentPayload.storeCreditsUtilized[0].shopId,
          utilized: paymentPayload.storeCreditsUtilized[0].utilized,
        });
      }

      dispatch(
        updateSalesDetail({
          paymentMethod: paymentPayload.paymentMethod,
          cashPaid: paymentPayload.cashPaid || paymentPayload.cashAmount,
          virtualPaid:
            paymentPayload.virtualPaid ||
            paymentPayload.cardAmount +
              paymentPayload.cashlessATMAmount +
              paymentPayload.bleaumACHAmount,
          changeAmount: paymentPayload.changeAmount,
          changeMethod: paymentPayload.changeMethod,
          tipGiven: paymentPayload.tipAmount,
          storeCreditsUtilized:
            paymentPayload.storeCreditAmount > 0
              ? [
                  {
                    shopId: JSON.parse(localStorage.getItem("shopId")),
                    utilized: paymentPayload.storeCreditAmount,
                  },
                ]
              : [],
        })
      );

      if (paymentPayload.tipAmount !== (quoteBody?.tipGiven || 0)) {
        dispatch(updateSalesDetail({ tipGiven: paymentPayload.tipAmount }));
        reQuote(
          { ...quoteBody, tipGiven: paymentPayload.tipAmount },
          "totalCard-tip-on-pay"
        ).catch(() => {});
      }

      setPaymentSidebarVisible(false);
    } catch (error) {
      if (error?.error) {
        setQuoteError({ message: error.error, requestId: error.requestId || null });
      }
      toast.error(error?.message || error?.error || "Something went wrong");
    }
  };

  // ---- Update existing order status (processOrder) --------------------------
  const updateOrderStatus = async (paymentPayload = null) => {
    if (currentAction !== "processOrder") return;
    setLoading(true);
    const p = paymentPayload || originalPaymentPayload;
    if (paymentPayload) setOriginalPaymentPayload(paymentPayload);

    const paidAmountValue =
      p?.cashAmount || cashAmount || getOrderSummary?.data?.finalPayable || 0;
    const virtualPaidValue =
      (p?.cashlessATMAmount || cashlessATMAmount || 0) +
      (p?.cardAmount || cardPaymentAmount || 0) +
      (p?.bleaumACHAmount || bleaumACHAmount || 0) +
      (p?.debitCardAmount || debitCardAmount || 0);

    const body = {
      shopId: saleDetail?.shopId,
      id: saleDetail?.id,
      statusId: selectedStatus || saleDetail?.status?.statusId,
      registerId: quoteBody.registerId,
      drawerId: quoteBody.drawerId,
      cancellationReason,
      proxyPin: quoteBody.proxyPin,
      onlinePaymentMethod: method,
      returnPackageResolverStrategy: returnStrategy,
      refundStrategy: {
        cashReturned: Number(cashReturned || 0),
        storeCreditsReturned: Number(storeCreditsReturned || 0),
        shouldForceMarkAsRefunded: true,
        registerId: quoteBody.registerId,
        drawerId: quoteBody.drawerId,
        proxyPin: quoteBody.proxyPin,
      },
      paymentStrategy: {
        cashPaid: Number(paidAmountValue || 0),
        virtualPaid: Number(virtualPaidValue || 0),
        changeAmount: Number(changeValue || 0),
        changeMethod: quoteBody?.changeMethod || "CASH",
        storeCreditsUtilized:
          selectedStoreCredit && storeCreditAmount > 0
            ? [{ shopId: selectedStoreCredit.shopId, utilized: Number(storeCreditAmount || 0) }]
            : [],
        registerId: quoteBody.registerId,
        drawerId: quoteBody.drawerId,
      },
      isPaymentProcessingCompleted: false,
      tipPreference: quoteBody?.tipPreference || tipPaymentMethod || "CASH",
    };

    try {
      await updateOrderStatusService(body);
      toast.success("Order status updated successfully");
      dispatch(updateSalesDetail({}));
      localStorage.removeItem("orderAheadStatus");
      localStorage.removeItem("orderSource");
      setOriginalPaymentPayload(null);
      window.location.reload();
    } catch (error) {
      if (error?.error === "Already on the desired state") {
        toast.warning(`Status unchanged—already in ${selectedStatus}`);
      } else {
        toast.error(error?.message || error?.error || "Error");
      }
    } finally {
      setLoading(false);
    }
  };

  // ---- Process return (processReturns) --------------------------------------
  // The Return/AddReturned leaf pair writes the returned items into
  // salesDetail.lineItems (there is no returned-items redux slice), so read them
  // from there rather than the old ReturnLineItemsReducer.
  const processReturn = async () => {
    const body = {
      shopId: saleDetail?.shopId,
      saleId: saleDetail?.id,
      lineItems: quoteBody?.lineItems,
      cashReturned:
        returnedMethod === "CASH" || returnedMethod === "cashStoreCredits"
          ? (cashReturned && Number(cashReturned)) ||
            getOrderSummary?.data?.finalPayable
          : 0,
      storeCreditsReturned:
        returnedMethod === "storeCredits" || returnedMethod === "cashStoreCredits"
          ? +storeCreditsReturned
          : 0,
      virtualReturned:
        returnedMethod === "VIRTUAL"
          ? parseFloat(cashReturned) || getOrderSummary?.data?.finalPayable || 0
          : 0,
      drawerId: quoteBody?.drawerId,
      registerId: quoteBody?.registerId,
      returnPackageResolverStrategy: returnStrategy,
      shouldForceMarkAsRefunded: false,
      proxyPin: quoteBody.proxyPin,
    };
    try {
      await createReturn(body);
      toast.success("Return placed successfully");
      localStorage.removeItem("orderAheadStatus");
      localStorage.removeItem("orderSource");
      window.location.reload();
    } catch (error) {
      toast.error(error?.message || error?.error || "An error occurred");
    }
  };

  // Sticky-quote error surface for PrintReceiptModal print.
  const handlePrint = () => {
    // Hardware print (usePrint) is out of scope; fall back to the browser's
    // print of whatever the receipt modal renders.
    if (typeof window !== "undefined") window.print();
  };

  const finalPayable = getOrderSummary?.data?.finalPayable || 0;
  const totalPaid =
    (storeCreditAmount || 0) +
    (cashAmount || 0) +
    (cashlessATMAmount || 0) +
    (cardPaymentAmount || 0) +
    (bleaumACHAmount || 0) +
    (debitCardAmount || 0);
  const paymentCompleted = finalPayable === 0 || totalPaid >= finalPayable;
  const remainingAmount = Math.max(0, finalPayable - totalPaid);
  const isPaymentConfigured = ["CASH", "VIRTUAL", "BOTH_CASH_VIRTUAL"].includes(
    paymentMethod
  );
  const hasSale = Object.keys(saleDetail).length > 0;
  const cartEmpty = lineItems.length === 0 && bogoData.length === 0;

  const runOrDeferForPin = (action) => {
    if (isShareModeActive() && quoteBody?.proxyPin == null) {
      pendingPinActionRef.current = action;
      setShareModePin(true);
    } else {
      action();
    }
  };

  return (
    <>
      <Card className="flex max-h-[calc(100vh-120px)] flex-col overflow-y-auto p-4">
        {/* processOrder: back / refresh */}
        {currentAction === "processOrder" && (
          <div className="mb-3 flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                dispatch(updateOrderAction(null));
                dispatch(resetAddedLineITems());
                dispatch(resetBogoLineItems());
                dispatch(addMiscallenousCharges([]));
                dispatch(resetSaleDetail());
                dispatch(resetQuoteForSale());
              }}
            >
              Refresh POS
            </Button>
          </div>
        )}

        {/* Action row: payment method + status + finalize buttons */}
        <div className="mb-2 flex flex-col gap-2">
          <PaymentStatusRow
            paymentStatusPaidInFull={saleDetail?.paymentStatus === "PAID_IN_FULL"}
            cartEmpty={cartEmpty}
            onOpenPaymentSidebar={handleOpenPaymentSidebar}
            paymentMethod={paymentMethod}
            finalPayable={finalPayable}
            currentAction={currentAction}
            hasSale={hasSale}
            orderStatus={orderStatus}
            selectedStatus={selectedStatus}
            onStatusChange={handleChange}
            saleDetailStatusId={saleDetail?.status?.statusId}
            selectedStatusObj={selectedStatusObj}
            onQuickStatusChange={setSelectedStatus}
            sendToFulfilmentLoading={sendToFulfilmentLoading}
            onSendToFulfillment={() =>
              runOrDeferForPin(() => createOrderFullfilment(selectedStatus))
            }
          />

          <QuickActionsRow
            hasSale={hasSale}
            cartEmpty={cartEmpty}
            currentAction={currentAction}
            saveDraftLoading={saveDraftLoading}
            onSaveDraft={handleSaveAsDraft}
            onAddMiscCharge={() => setMiscallenousCharge(true)}
            onAddMiscDiscount={() => setMiscallenousDiscount(true)}
            onOpenNotes={() => setNotesOpen(true)}
            onOpenTip={() => setVisibleTip(true)}
            showCoupons={
              currentAction === null && !!(selectedCustomer?.id || quoteBody?.customerId)
            }
          />
        </div>

        {(loading || orderProcessing) && currentAction === null && (
          <div className="mb-1 rounded-md border border-amber-200 bg-amber-50 px-4 py-1 text-center text-xs font-medium text-amber-700">
            Processing order…
          </div>
        )}

        {/* ---- Return mode ---- */}
        {currentAction === "processReturns" && (
          <>
            <ReturnSummary />
            <div className="mt-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold">Refund Method</span>
                <Select value={returnedMethod ?? ""} onValueChange={setReturnedMethod}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Select">
                      {(value) => {
                        const labels = {
                          CASH: "Cash",
                          storeCredits: "Store Credits",
                          cashStoreCredits: "Cash + Store Credits",
                        };
                        return labels[value] || "Select";
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH">Cash</SelectItem>
                    <SelectItem value="storeCredits">Store Credits</SelectItem>
                    <SelectItem value="cashStoreCredits">Cash + Store Credits</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {(returnedMethod === "CASH" || returnedMethod === "cashStoreCredits") && (
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Amount Returned</span>
                  <Input
                    className="w-48"
                    value={cashReturned || getOrderSummary?.data?.finalPayable || ""}
                    onChange={(e) => setCashReturned(e.target.value)}
                  />
                </div>
              )}
              {(returnedMethod === "storeCredits" || returnedMethod === "cashStoreCredits") && (
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Return Store Credits</span>
                  <Input
                    className="w-48"
                    value={storeCreditsReturned || ""}
                    onChange={(e) => setStoreCreditsReturned(e.target.value)}
                  />
                </div>
              )}
              <Button
                className="w-full"
                onClick={() => runOrDeferForPin(processReturn)}
              >
                Process Return
              </Button>
            </div>
          </>
        )}

        {/* ---- Live sale ---- */}
        {currentAction === null && (
          <>
            <div className="mt-2">
              <ProductPromoTaxes
                currentAction={currentAction}
                getOrderSummary={getOrderSummary}
                deleteMiscCharge={deleteMiscCharge}
                setSubTotalValue={setSubTotalValue}
                getMiscDiscountFromOrderData={getMiscDiscountFromOrderData}
                deleteMiscallenousDiscount={deleteMiscallenousDiscount}
                deleteLoyaltyPoints={deleteLoyaltyPoints}
                removeDealFromSelectedProduct={removeDealFromSelectedProduct}
              />
            </div>

            {getOrderSummary?.data?.couponDiscountApplied > 0 && (
              <div className="my-1 flex items-center justify-between rounded-md border border-green-200 bg-green-50 px-3 py-1.5">
                <span className="text-xs font-semibold text-green-700">
                  Coupon {quoteBody?.couponCode || quoteBody?.couponId || ""}
                </span>
                <span className="text-sm font-semibold text-green-700">
                  - ${Number(getOrderSummary.data.couponDiscountApplied).toFixed(2)}
                </span>
              </div>
            )}

            {/* Loyalty Points */}
            {(selectedCustomer?.id || quoteBody?.customerId) && (
              <LoyaltyPointsPanel
                customerLoyaltyInfo={customerLoyaltyInfo}
                appliedLoyaltyPoints={appliedLoyaltyPoints}
                onAppliedLoyaltyPointsChange={setAppliedLoyaltyPoints}
                loyaltyLoading={loyaltyLoading}
                isDisabledLoyalty={isDisabledLoyalty}
                loyaltyPointsUsed={getOrderSummary?.data?.loyaltyPointsUsed || 0}
                loyaltyDiscountGiven={getOrderSummary?.data?.loyaltyDiscountGiven}
                hasLoyaltyErrors={
                  (getOrderSummary?.data?.errorMessages?.loyaltyPoints?.length || 0) > 0
                }
                finalPayable={getOrderSummary?.data?.finalPayable || 0}
                onApply={applyLoyaltyPoints}
                onRemove={deleteLoyaltyPoints}
              />
            )}

            {/* Complete Order / Checkout */}
            {!cartEmpty && (
              <div className="sticky bottom-0 z-20 mt-2 bg-background pb-1 pt-2">
              <button
                disabled={
                  loading ||
                  orderProcessing ||
                  (isPaymentConfigured && !paymentCompleted)
                }
                onClick={() => {
                  if (isPaymentConfigured) {
                    createOrder({
                      paymentMethod,
                      storeCreditAmount,
                      cashAmount,
                      cashlessATMAmount,
                      cardAmount: cardPaymentAmount,
                      bleaumACHAmount,
                      debitCardAmount,
                      cashPaid: cashAmount,
                      virtualPaid:
                        cashlessATMAmount + cardPaymentAmount + bleaumACHAmount,
                      changeAmount: changeValue,
                      changeMethod: quoteBody?.changeMethod || "CASH",
                      tipAmount: tipAmountSidebar || quoteBody?.tipGiven || 0,
                      notes: paymentNotes,
                      miscCharges: currentMiscallenousCharges || [],
                      miscDiscount: quoteBody?.miscDiscount || 0,
                      totalAmount: finalPayable,
                      totalPaid,
                      splitMode,
                      storeCreditsUtilized:
                        selectedStoreCredit && storeCreditAmount > 0
                          ? [{ shopId: selectedStoreCredit.shopId, utilized: storeCreditAmount }]
                          : [],
                    });
                  } else {
                    handleOpenPaymentSidebar();
                  }
                }}
                className="w-full rounded-lg bg-[#297473] px-4 py-3 font-bold text-white shadow-lg transition-all hover:bg-[#20605f] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading
                  ? "Processing…"
                  : isPaymentConfigured
                  ? paymentCompleted
                    ? "Complete Order"
                    : `Pay Remaining $${remainingAmount.toFixed(2)}`
                  : "Checkout"}{" "}
                (Total: ${(finalPayable + (onlineTransactionFee || 0)).toFixed(2)})
              </button>
            </div>
            )}
          </>
        )}

        {/* ---- processOrder: update status ---- */}
        {currentAction === "processOrder" && hasSale && (
          <div className="mt-3">
            <ProductPromoTaxes
              currentAction={currentAction}
              getOrderSummary={getOrderSummary}
              deleteMiscCharge={deleteMiscCharge}
              setSubTotalValue={setSubTotalValue}
              getMiscDiscountFromOrderData={getMiscDiscountFromOrderData}
              deleteMiscallenousDiscount={deleteMiscallenousDiscount}
            />
            <Button
              className="mt-3 w-full"
              style={{ backgroundColor: colorCode, borderColor: colorCode }}
              onClick={() => {
                const requiresPayment =
                  (selectedStatus === "PACKAGED_AND_READY" ||
                    selectedStatus === "COMPLETED") &&
                  saleDetail?.paymentStatus !== "PAID_IN_FULL";
                if (requiresPayment && !paymentMethod) {
                  toast.warning("Please set payment details before updating status");
                  handleOpenPaymentSidebar();
                  return;
                }
                const payload = paymentMethod
                  ? {
                      paymentMethod,
                      storeCreditAmount,
                      cashAmount,
                      cashlessATMAmount,
                      cardAmount: cardPaymentAmount,
                      bleaumACHAmount,
                      cashPaid: cashAmount,
                      virtualPaid:
                        cashlessATMAmount + cardPaymentAmount + bleaumACHAmount,
                      changeAmount: changeValue,
                      changeMethod: quoteBody?.changeMethod || "CASH",
                      tipAmount: tipAmountSidebar || quoteBody?.tipGiven || 0,
                      notes: paymentNotes,
                      storeCreditsUtilized:
                        selectedStoreCredit && storeCreditAmount > 0
                          ? [{ shopId: selectedStoreCredit.shopId, utilized: storeCreditAmount }]
                          : [],
                    }
                  : null;
                runOrDeferForPin(() => updateOrderStatus(payload));
              }}
            >
              Update Order Status
            </Button>
          </div>
        )}
      </Card>

      {/* -------------------- Drawers / modals -------------------- */}
      <Drawer open={notes} onClose={() => setNotesOpen(false)} side="right" size={500}>
        <div className="flex h-full flex-col">
          <div className="border-b border-border px-6 py-4 text-base font-semibold">Notes</div>
          <div className="flex-1 overflow-auto">
            <Notes setNotes={setNotesOpen} />
          </div>
        </div>
      </Drawer>

      <Drawer
        open={visibleTip}
        onClose={() => setVisibleTip(false)}
        side="right"
        size={600}
      >
        <div className="flex h-full flex-col">
          <div className="border-b border-border px-6 py-4 text-base font-semibold">
            Add Tip{" "}
            <span className="text-sm font-normal text-muted-foreground">
              (Total: ${finalPayable.toFixed(2)})
            </span>
          </div>
          <div className="flex-1 overflow-auto p-4">
            <AddTip setVisibleTip={setVisibleTip} />
          </div>
        </div>
      </Drawer>

      <Drawer
        open={miscallenousCharge}
        onClose={() => setMiscallenousCharge(false)}
        side="right"
        size={600}
      >
        <div className="flex h-full flex-col">
          <div className="border-b border-border px-6 py-4 text-base font-semibold">
            Miscellaneous Charge
          </div>
          <div className="flex-1 overflow-auto p-4">
            <MiscellaneousChargeDrawer
              type="charge"
              onDone={() => setMiscallenousCharge(false)}
            />
          </div>
        </div>
      </Drawer>

      <Drawer
        open={miscallenousDiscount}
        onClose={() => setMiscallenousDiscount(false)}
        side="right"
        size={500}
      >
        <div className="flex h-full flex-col">
          <div className="border-b border-border px-6 py-4 text-base font-semibold">
            Miscellaneous Discount
          </div>
          <div className="flex-1 overflow-auto p-4">
            <MiscellaneousChargeDrawer
              type="discount"
              onDone={() => setMiscallenousDiscount(false)}
            />
          </div>
        </div>
      </Drawer>

      <Drawer
        open={shareModePin}
        onClose={() => setShareModePin(false)}
        side="right"
        size={400}
      >
        <div className="flex h-full flex-col">
          <div className="border-b border-border px-6 py-4 text-base font-semibold">
            Enter Pin
          </div>
          <div className="flex-1 overflow-auto p-4">
            <EnterPin
              onDone={(pin) => {
                setShareModePin(false);
                const action = pendingPinActionRef.current;
                pendingPinActionRef.current = null;
                if (action) action(pin);
              }}
            />
          </div>
        </div>
      </Drawer>

      <PaymentSidebar
        visible={paymentSidebarVisible}
        onClose={() => {
          setQuoteError(null);
          handleClosePaymentSidebar();
        }}
        totalAmount={
          currentAction === "processOrder"
            ? saleDetail?.finalPayable || getOrderSummary?.data?.finalPayable || 0
            : getOrderSummary?.data?.finalPayable || saleDetail?.finalPayable || 0
        }
        paymentMethod={paymentMethod}
        setPaymentMethod={setPaymentMethod}
        setProcessingFee={setProcessingFee}
        setIsAch={setIsAch}
        cashAmount={cashAmount}
        setCashAmount={setCashAmount}
        changeMethod={quoteBody?.changeMethod || "CASH"}
        setChangeMethod={(m) => dispatch(updateSalesDetail({ changeMethod: m }))}
        setChangeValue={setChangeValue}
        tipAmount={tipAmountSidebar || quoteBody?.tipGiven || 0}
        setTipAmount={(tip) => {
          setTipAmountSidebar(tip);
          dispatch(updateSalesDetail({ tipGiven: tip }));
          reQuote({ ...quoteBody, tipGiven: tip }, "totalCard-payment-tip").catch(
            () => {}
          );
        }}
        tipPaymentMethod={tipPaymentMethod}
        setTipPaymentMethod={setTipPaymentMethod}
        notes={paymentNotes}
        setNotes={setPaymentNotes}
        miscCharges={currentMiscallenousCharges || []}
        onAddMiscCharge={handleAddMiscCharge}
        onRemoveMiscCharge={handleRemoveMiscCharge}
        miscDiscount={quoteBody?.miscDiscount || 0}
        onProcessPayment={handleProcessPayment}
        loading={loading || sendToFulfilmentLoading}
        resetFields={resetPaymentFields}
        initialCashAmount={cashAmount}
        initialStoreCreditAmount={storeCreditAmount}
        initialCashlessATMAmount={cashlessATMAmount}
        initialCardPaymentAmount={cardPaymentAmount}
        initialDebitCardAmount={debitCardAmount}
        initialBleaumACHAmount={bleaumACHAmount}
        initialSelectedStoreCredit={selectedStoreCredit}
        initialSplitMode={splitMode}
        setCashlessATMAmount={setCashlessATMAmount}
        setCardPaymentAmount={setCardPaymentAmount}
        setDebitCardAmount={setDebitCardAmount}
        setBleaumACHAmount={setBleaumACHAmount}
        setStoreCreditAmount={setStoreCreditAmount}
        setSplitMode={setSplitMode}
        onlineTransactionFee={onlineTransactionFee}
        quoteError={quoteError}
        onClearQuoteError={() => setQuoteError(null)}
      />

      <PrintReceiptModal
        open={isNewOrderModal}
        onClose={() => setIsNewOrderModal(false)}
        handlePrint={handlePrint}
        createOrderRes={createOrderRes}
        reportToMetric={() => {}}
        changeAmount={orderChangeAmount}
        labMode={false}
        onNewOrder={() => {
          setIsNewOrderModal(false);
          dispatch(resetSalesDetail());
          dispatch(resetAddedLineITems());
          dispatch(resetQuoteForSale());
          dispatch(resetBogoLineItems());
          dispatch(addMiscallenousCharges([]));
        }}
      />

      {errorModal && (
        <Drawer
          open={errorModal}
          onClose={() => {
            setErrorModal(false);
            deleteLoyaltyPoints();
          }}
          side="right"
          size={420}
        >
          <div className="flex h-full flex-col">
            <div className="border-b border-border px-6 py-4 text-base font-semibold">
              Error Messages
            </div>
            <div className="flex-1 overflow-auto p-4">
              <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                {errorList || "Please resolve the highlighted errors."}
              </div>
              <Button
                className="mt-4 w-full"
                onClick={() => {
                  setErrorModal(false);
                  deleteLoyaltyPoints();
                }}
              >
                OK
              </Button>
            </div>
          </div>
        </Drawer>
      )}
    </>
  );
}
