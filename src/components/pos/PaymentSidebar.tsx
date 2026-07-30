"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useSelector } from "react-redux";
import { X, Minus, Trash2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getShopPreferences } from "@/services/sales/getShopPreferences";
import { getOrderStoreCredits } from "@/services/storeCredits/getOrderStoreCredits";

const currencySymbols = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  INR: "₹",
  JPY: "¥",
  AUD: "A$",
  CAD: "C$",
};

/**
 * A "$"-prefixed number field with an optional right-hand suffix label.
 * Replaces the antd Input's prefix/suffix affordances with native markup.
 */
function AmountField({ value, onChange, onFocus, placeholder, suffix, disabled = false }) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-semibold text-muted-foreground">
        $
      </span>
      <input
        type="number"
        className="h-[50px] w-full rounded-lg border border-input bg-transparent py-3 pl-7 pr-32 text-lg font-semibold outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
        value={value}
        onChange={onChange}
        onFocus={onFocus}
        placeholder={placeholder}
        min="0"
        step="0.01"
        disabled={disabled}
      />
      {suffix != null && (
        <span className="pointer-events-none absolute right-3 top-1/2 max-w-[45%] -translate-y-1/2 truncate text-right text-sm text-muted-foreground">
          {suffix}
        </span>
      )}
    </div>
  );
}

/**
 * Payment sidebar — method selection (cash / card / debit / cashless ATM / ACH /
 * store credit / split), amount entry, tip allocation, misc charges, change
 * calculation, and payment-completeness validation. All money math and the
 * final payment-payload assembly are ported verbatim from the antd original;
 * only the presentation (antd → native + shadcn) changed. The theme-specific
 * styled-jsx dark overrides were dropped in favour of shadcn theme tokens.
 *
 * Fully controlled: the parent owns the payment amounts/tip/notes via the
 * setter props and receives the assembled payload through onProcessPayment.
 * The complete prop contract is unchanged from the original component.
 */
export default function PaymentSidebar({
  visible,
  onClose,
  totalAmount = 0,
  paymentMethod,
  setPaymentMethod,
  setProcessingFee,
  setIsAch,
  cashAmount = 0,
  setCashAmount,
  changeMethod,
  setChangeMethod,
  setChangeValue,
  tipAmount = 0,
  setTipAmount,
  notes = "",
  setNotes,
  miscCharges = [],
  onAddMiscCharge,
  onRemoveMiscCharge,
  miscDiscount = 0,
  onProcessPayment,
  loading = false,
  resetFields = false,
  initialCashAmount = 0,
  initialStoreCreditAmount = 0,
  initialCashlessATMAmount = 0,
  initialCardPaymentAmount = 0,
  initialDebitCardAmount = 0,
  initialBleaumACHAmount = 0,
  initialSelectedStoreCredit = null,
  initialSplitMode = false,
  setCashlessATMAmount,
  setCardPaymentAmount,
  setDebitCardAmount,
  setBleaumACHAmount,
  tipPaymentMethod: propTipPaymentMethod,
  setTipPaymentMethod: setPropTipPaymentMethod,
  setStoreCreditAmount,
  setSplitMode,
  onlineTransactionFee = 0,
  quoteError = null,
  onClearQuoteError,
}) {
  const [splitMode, setSplitModeInternal] = useState(initialSplitMode);
  const autoPopulatedRef = React.useRef(false);
  const [quickTipAmount, setQuickTipAmount] = useState(null);
  const [visibleTip, setVisibleTip] = useState(false);
  const [availableStoreCredits, setAvailableStoreCredits] = useState([]);
  const [selectedStoreCredit, setSelectedStoreCredit] = useState(
    initialSelectedStoreCredit
  );
  const [tipAllocation, setTipAllocation] = useState(null);
  const [processError, setProcessError] = useState("");
  const [tipPaymentMethod, setTipPaymentMethod] = useState("CASH");

  useEffect(() => {
    if (
      propTipPaymentMethod !== undefined &&
      propTipPaymentMethod !== tipPaymentMethod
    ) {
      setTipPaymentMethod(propTipPaymentMethod);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propTipPaymentMethod]);

  useEffect(() => {
    if (setPropTipPaymentMethod) {
      setPropTipPaymentMethod(tipPaymentMethod);
    }
  }, [tipPaymentMethod, setPropTipPaymentMethod]);

  const [shopPreferences, setShopPreferences] = useState(null);
  const [processingFees, setProcessingFees] = useState({
    creditCard: 0,
    debitCard: 0,
    cashlessATM: 0,
    ach: 0,
  });

  const saleDetail = useSelector((state: any) => state?.salesDetail);
  const getOrderSummary = useSelector((state: any) => state?.quoteForSale?.lineItems);

  const [cashAmountInternal, setCashAmountInternal] = useState(initialCashAmount);
  const [cashInputString, setCashInputString] = useState(
    initialCashAmount > 0 ? String(initialCashAmount) : ""
  );
  const [storeCreditAmount, setStoreCreditAmountInternal] = useState(
    initialStoreCreditAmount
  );
  const [storeCreditInputString, setStoreCreditInputString] = useState(
    initialStoreCreditAmount > 0 ? String(initialStoreCreditAmount) : ""
  );
  const [cashlessATMAmount, setCashlessATMAmountInternal] = useState(
    initialCashlessATMAmount
  );
  const [cashlessATMInputString, setCashlessATMInputString] = useState(
    initialCashlessATMAmount > 0 ? String(initialCashlessATMAmount) : ""
  );
  const [cardPaymentAmount, setCardPaymentAmountInternal] = useState(
    initialCardPaymentAmount
  );
  const [cardInputString, setCardInputString] = useState(
    initialCardPaymentAmount > 0 ? String(initialCardPaymentAmount) : ""
  );
  const [debitCardAmount, setDebitCardAmountInternal] = useState(
    initialDebitCardAmount
  );
  const [debitCardInputString, setDebitCardInputString] = useState(
    initialDebitCardAmount > 0 ? String(initialDebitCardAmount) : ""
  );
  const [bleaumACHAmount, setBleaumACHAmountInternal] = useState(
    initialBleaumACHAmount
  );
  const [bleaumACHInputString, setBleaumACHInputString] = useState(
    initialBleaumACHAmount > 0 ? String(initialBleaumACHAmount) : ""
  );

  const tipPercentages = [10, 15, 18, 20, 25];

  const isPaymentMethodEnabled = (paymentType, preferences) => {
    if (!preferences || !preferences.posOnlinePaymentPreference) return false;
    const methodMapping = {
      creditCard: "CREDIT_CARD",
      debitCard: "DEBIT_CARD",
      cashlessATM: "CASHLESS_ATM",
      ach: "ACH",
      cash: "CASH",
    };
    const paymentMethodName = methodMapping[paymentType];
    if (!paymentMethodName) return false;
    const paymentConfig = preferences.posOnlinePaymentPreference.find(
      (config) => config.paymentMethod === paymentMethodName
    );
    return paymentConfig && paymentConfig.isEnabled === true;
  };

  const getVirtualFieldForTip = () => {
    const amounts = {
      card: cardPaymentAmount,
      debitCard: debitCardAmount,
      cashlessATM: cashlessATMAmount,
      ach: bleaumACHAmount,
    };
    for (const [key, amt] of Object.entries(amounts)) {
      if (amt > 0) return key;
    }
    const order = ["card", "debitCard", "cashlessATM", "ach"];
    const typeMap = {
      card: "creditCard",
      debitCard: "debitCard",
      cashlessATM: "cashlessATM",
      ach: "ach",
    };
    for (const key of order) {
      if (isPaymentMethodEnabled(typeMap[key], shopPreferences)) {
        return key;
      }
    }
    return null;
  };

  useEffect(() => {
    const fetchShopPreferences = async () => {
      try {
        const shopId = JSON.parse(localStorage.getItem("shopId"));
        if (shopId) {
          const response = await getShopPreferences();
          if (response?.data?.data) {
            setShopPreferences(response.data.data.preference);
          }
        }
      } catch (error) {
        console.error("Error fetching shop preferences:", error);
      }
    };
    fetchShopPreferences();
  }, []);

  const calculateProcessingFee = (paymentAmount, paymentType, preferences) => {
    if (!preferences || !paymentAmount || paymentAmount <= 0) return 0;
    const methodMapping = {
      creditCard: "CREDIT_CARD",
      debitCard: "DEBIT_CARD",
      cashlessATM: "CASHLESS_ATM",
      ach: "ACH",
    };
    const preferenceArray = preferences.posOnlinePaymentPreference;
    const paymentMethodName = methodMapping[paymentType];
    if (!preferenceArray || !paymentMethodName) return 0;
    const paymentConfig = preferenceArray.find(
      (config) => config.paymentMethod === paymentMethodName
    );
    if (!paymentConfig || !paymentConfig.shouldTakeProcessingFee) return 0;
    const { processingFeePreferences } = paymentConfig;
    if (!processingFeePreferences || processingFeePreferences.length === 0)
      return 0;
    const sortedTiers = [...processingFeePreferences].sort(
      (a, b) => a.amount - b.amount
    );
    let applicableFee = null;
    for (const feeTier of sortedTiers) {
      const { operator, amount } = feeTier;
      if (operator === "LT" && paymentAmount < amount) {
        applicableFee = feeTier;
        break;
      } else if (operator === "GT" && paymentAmount > amount) {
        applicableFee = feeTier;
      }
    }
    if (!applicableFee) return 0;
    const { chargeAmount, type } = applicableFee;
    let feeValue;
    if (type === "PERCENTAGE") {
      feeValue = (paymentAmount * (chargeAmount || 0)) / 100;
    } else if (type === "AMOUNT") {
      feeValue = chargeAmount || 0;
    } else {
      feeValue = 0;
    }
    feeValue = Number(feeValue) || 0;
    return feeValue;
  };

  useEffect(() => {
    if (!shopPreferences) return;
    const newProcessingFees = {
      creditCard: calculateProcessingFee(
        cardPaymentAmount,
        "creditCard",
        shopPreferences
      ),
      debitCard: calculateProcessingFee(
        debitCardAmount,
        "debitCard",
        shopPreferences
      ),
      cashlessATM: calculateProcessingFee(
        cashlessATMAmount,
        "cashlessATM",
        shopPreferences
      ),
      ach: calculateProcessingFee(bleaumACHAmount, "ach", shopPreferences),
    };
    Object.keys(newProcessingFees).forEach((key) => {
      newProcessingFees[key] = Number(newProcessingFees[key]) || 0;
    });
    if (setProcessingFee) {
      setProcessingFee({ ...newProcessingFees });
    }
    setProcessingFees(newProcessingFees);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    cardPaymentAmount,
    debitCardAmount,
    cashlessATMAmount,
    bleaumACHAmount,
    shopPreferences,
  ]);

  const resetAllFields = () => {
    setCashAmountInternal(0);
    setCashInputString("");
    setStoreCreditAmountInternal(0);
    setStoreCreditInputString("");
    setCashlessATMAmountInternal(0);
    setCashlessATMInputString("");
    setCardPaymentAmountInternal(0);
    setCardInputString("");
    setDebitCardAmountInternal(0);
    setDebitCardInputString("");
    setBleaumACHAmountInternal(0);
    setBleaumACHInputString("");
    setSelectedStoreCredit(null);
    setSplitModeInternal(false);
    setQuickTipAmount(null);
    setTipPaymentMethod("CASH");
    setVisibleTip(false);
    setAvailableStoreCredits([]);
    setTipAllocation(null);
    setProcessError("");
    setProcessingFees({ creditCard: 0, debitCard: 0, cashlessATM: 0, ach: 0 });

    setCashAmount?.(0);
    setCashlessATMAmount?.(0);
    setCardPaymentAmount?.(0);
    setDebitCardAmount?.(0);
    setBleaumACHAmount?.(0);
    setStoreCreditAmount?.(0);
    setSplitMode?.(false);
    setTipAmount?.(0);
    setNotes?.("");
    setChangeValue?.(0);
  };

  useEffect(() => {
    if (resetFields) {
      resetAllFields();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetFields]);

  useEffect(() => {
    if (cashAmountInternal === 0 && initialCashAmount > 0) {
      setCashAmountInternal(initialCashAmount);
    }
    if (storeCreditAmount === 0 && initialStoreCreditAmount > 0) {
      setStoreCreditAmountInternal(initialStoreCreditAmount);
    }
    if (cashlessATMAmount === 0 && initialCashlessATMAmount > 0) {
      setCashlessATMAmountInternal(initialCashlessATMAmount);
    }
    if (cardPaymentAmount === 0 && initialCardPaymentAmount > 0) {
      setCardPaymentAmountInternal(initialCardPaymentAmount);
    }
    if (debitCardAmount === 0 && initialDebitCardAmount > 0) {
      setDebitCardAmountInternal(initialDebitCardAmount);
    }
    if (bleaumACHAmount === 0 && initialBleaumACHAmount > 0) {
      setBleaumACHAmountInternal(initialBleaumACHAmount);
    }
    if (!selectedStoreCredit && initialSelectedStoreCredit) {
      setSelectedStoreCredit(initialSelectedStoreCredit);
    }
    if (!visible && initialSplitMode !== splitMode) {
      setSplitModeInternal(initialSplitMode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    initialCashAmount,
    initialStoreCreditAmount,
    initialCashlessATMAmount,
    initialCardPaymentAmount,
    initialDebitCardAmount,
    initialBleaumACHAmount,
    initialSelectedStoreCredit,
    initialSplitMode,
  ]);

  const cashDenominations = (() => {
    const total = Number(totalAmount);
    if (!Number.isFinite(total) || total <= 0) return [];
    const first = Math.ceil((total + 0.01) / 50) * 50;
    return [first, first + 50, first + 100];
  })();

  useEffect(() => {
    if (!visible) {
      autoPopulatedRef.current = false;
      return;
    }
    if (splitMode || autoPopulatedRef.current || totalAmount <= 0) return;
    autoPopulatedRef.current = true;

    const amountStr = totalAmount.toFixed(2);
    if (!paymentMethod || paymentMethod === "CASH") {
      handlePaymentAmountChange("cash", amountStr);
    } else if (paymentMethod === "CREDIT_CARD") {
      handlePaymentAmountChange("card", amountStr);
    } else if (paymentMethod === "DEBIT_CARD") {
      handlePaymentAmountChange("debitCard", amountStr);
    } else if (paymentMethod === "CASHLESS_ATM") {
      handlePaymentAmountChange("cashlessATM", amountStr);
    } else if (paymentMethod === "ACH" || paymentMethod === "BLEAUM_PAY") {
      handlePaymentAmountChange("bleaumACH", amountStr);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, splitMode, totalAmount, paymentMethod]);

  useEffect(() => {
    if (saleDetail?.customerId) {
      getOrderStoreCredits(saleDetail.customerId, "usd")
        .then((res) => {
          if (res?.data?.data) {
            setAvailableStoreCredits(res.data.data);
            if (res.data.data.length === 1) {
              setSelectedStoreCredit(res.data.data[0]);
              if (!initialStoreCreditAmount) setStoreCreditAmountInternal(0);
            } else if (res.data.data.length > 1 && !initialSelectedStoreCredit) {
              setSelectedStoreCredit(null);
              if (!initialStoreCreditAmount) setStoreCreditAmountInternal(0);
            }
          }
        })
        .catch((error) => {
          console.error("Error fetching store credits:", error);
          setAvailableStoreCredits([]);
        });
    } else {
      setAvailableStoreCredits([]);
      if (!initialSelectedStoreCredit) setSelectedStoreCredit(null);
      if (!initialStoreCreditAmount) setStoreCreditAmountInternal(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saleDetail?.customerId]);

  const handleStoreCreditSelection = (shopId) => {
    const selectedCredit = availableStoreCredits.find(
      (credit) => String(credit.shopId) === String(shopId)
    );
    setSelectedStoreCredit(selectedCredit);
    setStoreCreditAmountInternal(0);
    setStoreCreditAmount?.(0);
  };

  const getMaxStoreCreditAmount = () => {
    if (!selectedStoreCredit) return 0;
    return selectedStoreCredit.runningAmount || 0;
  };

  const handlePaymentAmountChange = (type, value) => {
    let numValue = 0;
    if (value === "" || value === null || value === undefined) {
      numValue = 0;
    } else {
      const stringValue = String(value);
      if (stringValue === "." || stringValue === "") {
        numValue = 0;
      } else {
        const parsed = Number.parseFloat(stringValue);
        numValue = isNaN(parsed) ? 0 : parsed;
      }
    }
    if (numValue < 0) numValue = 0;

    if (type === "storeCredit") {
      const maxAmount = getMaxStoreCreditAmount();
      if (numValue > maxAmount) return;
      setStoreCreditAmountInternal(numValue);
      setStoreCreditInputString(value);
      setStoreCreditAmount?.(numValue);
      setTimeout(() => calculateChange(), 0);
      return;
    }

    if (!splitMode && numValue > 0) {
      if (type === "cash") {
        setCashAmountInternal(numValue);
        setCashInputString(value);
        setCashAmount?.(numValue);
        setCashlessATMAmountInternal(0);
        setCashlessATMInputString("");
        setCashlessATMAmount?.(0);
        setCardPaymentAmountInternal(0);
        setCardInputString("");
        setCardPaymentAmount?.(0);
        setDebitCardAmountInternal(0);
        setDebitCardInputString("");
        setDebitCardAmount?.(0);
        setBleaumACHAmountInternal(0);
        setBleaumACHInputString("");
        setBleaumACHAmount?.(0);
      } else if (type === "cashlessATM") {
        setCashlessATMAmountInternal(numValue);
        setCashlessATMInputString(value);
        setCashlessATMAmount?.(numValue);
        setCashAmountInternal(0);
        setCashInputString("");
        setCashAmount?.(0);
        setCardPaymentAmountInternal(0);
        setCardInputString("");
        setCardPaymentAmount?.(0);
        setDebitCardAmountInternal(0);
        setDebitCardInputString("");
        setDebitCardAmount?.(0);
        setBleaumACHAmountInternal(0);
        setBleaumACHInputString("");
        setBleaumACHAmount?.(0);
      } else if (type === "card") {
        setCardPaymentAmountInternal(numValue);
        setCardInputString(value);
        setCardPaymentAmount?.(numValue);
        setCashAmountInternal(0);
        setCashInputString("");
        setCashAmount?.(0);
        setCashlessATMAmountInternal(0);
        setCashlessATMInputString("");
        setCashlessATMAmount?.(0);
        setDebitCardAmountInternal(0);
        setDebitCardInputString("");
        setDebitCardAmount?.(0);
        setBleaumACHAmountInternal(0);
        setBleaumACHInputString("");
        setBleaumACHAmount?.(0);
      } else if (type === "debitCard") {
        setDebitCardAmountInternal(numValue);
        setDebitCardInputString(value);
        setDebitCardAmount?.(numValue);
        setCashAmountInternal(0);
        setCashInputString("");
        setCashAmount?.(0);
        setCashlessATMAmountInternal(0);
        setCashlessATMInputString("");
        setCashlessATMAmount?.(0);
        setCardPaymentAmountInternal(0);
        setCardInputString("");
        setCardPaymentAmount?.(0);
        setBleaumACHAmountInternal(0);
        setBleaumACHInputString("");
        setBleaumACHAmount?.(0);
      } else if (type === "bleaumACH") {
        setBleaumACHAmountInternal(numValue);
        setBleaumACHInputString(value);
        setBleaumACHAmount?.(numValue);
        setCashAmountInternal(0);
        setCashInputString("");
        setCashAmount?.(0);
        setCashlessATMAmountInternal(0);
        setCashlessATMInputString("");
        setCashlessATMAmount?.(0);
        setCardPaymentAmountInternal(0);
        setCardInputString("");
        setCardPaymentAmount?.(0);
        setDebitCardAmountInternal(0);
        setDebitCardInputString("");
        setDebitCardAmount?.(0);
      }
    } else {
      if (type === "cash") {
        setCashAmountInternal(numValue);
        setCashInputString(value);
        setCashAmount?.(numValue);
      } else if (type === "cashlessATM") {
        setCashlessATMAmountInternal(numValue);
        setCashlessATMInputString(value);
        setCashlessATMAmount?.(numValue);
        if (numValue > 0) {
          setCardPaymentAmountInternal(0);
          setCardInputString("");
          setCardPaymentAmount?.(0);
          setDebitCardAmountInternal(0);
          setDebitCardInputString("");
          setDebitCardAmount?.(0);
        }
      } else if (type === "card") {
        setCardPaymentAmountInternal(numValue);
        setCardInputString(value);
        setCardPaymentAmount?.(numValue);
        if (numValue > 0) {
          setCashlessATMAmountInternal(0);
          setCashlessATMInputString("");
          setCashlessATMAmount?.(0);
          setDebitCardAmountInternal(0);
          setDebitCardInputString("");
          setDebitCardAmount?.(0);
        }
      } else if (type === "debitCard") {
        setDebitCardAmountInternal(numValue);
        setDebitCardInputString(value);
        setDebitCardAmount?.(numValue);
        if (numValue > 0) {
          setCashlessATMAmountInternal(0);
          setCashlessATMInputString("");
          setCashlessATMAmount?.(0);
          setCardPaymentAmountInternal(0);
          setCardInputString("");
          setCardPaymentAmount?.(0);
        }
      } else if (type === "bleaumACH") {
        setBleaumACHAmountInternal(numValue);
        setBleaumACHInputString(value);
        setBleaumACHAmount?.(numValue);
        if (numValue > 0) {
          setCashlessATMAmountInternal(0);
          setCashlessATMInputString("");
          setCashlessATMAmount?.(0);
          setCardPaymentAmountInternal(0);
          setCardInputString("");
          setCardPaymentAmount?.(0);
          setDebitCardAmountInternal(0);
          setDebitCardInputString("");
          setDebitCardAmount?.(0);
        }
      }
    }

    setTimeout(() => calculateChange(), 0);
  };

  const grandTotal = totalAmount;

  // Pure — safe to call during render (e.g. for display). Does not touch
  // React state; use calculateChange() below for that.
  const getChangeAmount = () => {
    const cashPaid = Number.parseFloat(String(cashAmountInternal)) || 0;
    const virtualPaid =
      (Number.parseFloat(String(cashlessATMAmount)) || 0) +
      (Number.parseFloat(String(cardPaymentAmount)) || 0) +
      (Number.parseFloat(String(debitCardAmount)) || 0) +
      (Number.parseFloat(String(bleaumACHAmount)) || 0);
    const totalPaid = storeCreditAmount + cashPaid + virtualPaid;
    const change = totalPaid - grandTotal;
    const changeAmount = Math.max(0, change);
    return Number.parseFloat(changeAmount.toFixed(2));
  };

  // Side-effecting: also pushes the value up via setChangeValue (a parent
  // state setter). Only call this from event handlers/effects — calling it
  // during render updates a different component (TotalCard) mid-render,
  // which React disallows. Render-time reads should use getChangeAmount().
  const calculateChange = () => {
    const value = getChangeAmount();
    setChangeValue(value);
    return value;
  };

  const calculateRemaining = () => {
    const cashPaid = Number.parseFloat(String(cashAmountInternal)) || 0;
    const virtualPaid =
      (Number.parseFloat(String(cashlessATMAmount)) || 0) +
      (Number.parseFloat(String(cardPaymentAmount)) || 0) +
      (Number.parseFloat(String(debitCardAmount)) || 0) +
      (Number.parseFloat(String(bleaumACHAmount)) || 0);
    const totalPaid = storeCreditAmount + cashPaid + virtualPaid;
    const remaining = grandTotal - totalPaid;
    return Math.max(0, remaining);
  };

  const isPaymentComplete = () => {
    const cashPaid = Number.parseFloat(String(cashAmountInternal)) || 0;
    const virtualPaid =
      (Number.parseFloat(String(cashlessATMAmount)) || 0) +
      (Number.parseFloat(String(cardPaymentAmount)) || 0) +
      (Number.parseFloat(String(debitCardAmount)) || 0) +
      (Number.parseFloat(String(bleaumACHAmount)) || 0);
    const totalPaid = storeCreditAmount + cashPaid + virtualPaid;
    return totalPaid >= grandTotal;
  };

  const calculateTipAmount = (percentage) => {
    const tip = (totalAmount * percentage) / 100;
    setTipAmount?.(tip);
    setQuickTipAmount(percentage);
  };

  const determineOnlinePaymentMethod = () => {
    if (cashlessATMAmount > 0) return "CASHLESS_ATM";
    if (cardPaymentAmount > 0) return "CREDIT_CARD";
    if (debitCardAmount > 0) return "DEBIT_CARD";
    if (bleaumACHAmount > 0) return "ACH";
    return null;
  };

  const handleApplyTip = () => {
    if (tipAmount <= 0) return;
    const fieldType =
      tipPaymentMethod === "CASH" ? "cash" : getVirtualFieldForTip();
    if (!fieldType) {
      console.warn("No suitable virtual payment method for tip");
      return;
    }
    let newValue = 0;
    const tipVal = tipAmount;
    if (fieldType === "cash") {
      newValue = cashAmountInternal + tipVal;
      setCashAmountInternal(newValue);
      setCashInputString(newValue.toFixed(2));
      setCashAmount?.(newValue);
    } else if (fieldType === "card") {
      newValue = cardPaymentAmount + tipVal;
      setCardPaymentAmountInternal(newValue);
      setCardInputString(newValue.toFixed(2));
      setCardPaymentAmount?.(newValue);
    } else if (fieldType === "debitCard") {
      newValue = debitCardAmount + tipVal;
      setDebitCardAmountInternal(newValue);
      setDebitCardInputString(newValue.toFixed(2));
      setDebitCardAmount?.(newValue);
    } else if (fieldType === "cashlessATM") {
      newValue = cashlessATMAmount + tipVal;
      setCashlessATMAmountInternal(newValue);
      setCashlessATMInputString(newValue.toFixed(2));
      setCashlessATMAmount?.(newValue);
    } else if (fieldType === "ach") {
      newValue = bleaumACHAmount + tipVal;
      setBleaumACHAmountInternal(newValue);
      setBleaumACHInputString(newValue.toFixed(2));
      setBleaumACHAmount?.(newValue);
    }
    setTipAllocation({ method: fieldType, amount: tipVal });
    setProcessError("");
    setTimeout(() => calculateChange(), 0);
    setVisibleTip(false);
  };

  const handleRemoveTip = () => {
    if (tipAllocation) {
      const { method: fieldType, amount: tipVal } = tipAllocation;
      if (fieldType === "cash") {
        const newValue = Math.max(0, cashAmountInternal - tipVal);
        setCashAmountInternal(newValue);
        setCashInputString(newValue > 0 ? newValue.toFixed(2) : "");
        setCashAmount?.(newValue);
      } else if (fieldType === "card") {
        const newValue = Math.max(0, cardPaymentAmount - tipVal);
        setCardPaymentAmountInternal(newValue);
        setCardInputString(newValue > 0 ? newValue.toFixed(2) : "");
        setCardPaymentAmount?.(newValue);
      } else if (fieldType === "debitCard") {
        const newValue = Math.max(0, debitCardAmount - tipVal);
        setDebitCardAmountInternal(newValue);
        setDebitCardInputString(newValue > 0 ? newValue.toFixed(2) : "");
        setDebitCardAmount?.(newValue);
      } else if (fieldType === "cashlessATM") {
        const newValue = Math.max(0, cashlessATMAmount - tipVal);
        setCashlessATMAmountInternal(newValue);
        setCashlessATMInputString(newValue > 0 ? newValue.toFixed(2) : "");
        setCashlessATMAmount?.(newValue);
      } else if (fieldType === "ach") {
        const newValue = Math.max(0, bleaumACHAmount - tipVal);
        setBleaumACHAmountInternal(newValue);
        setBleaumACHInputString(newValue > 0 ? newValue.toFixed(2) : "");
        setBleaumACHAmount?.(newValue);
      }
      setTipAllocation(null);
      setTimeout(() => calculateChange(), 0);
    }
    setTipAmount?.(0);
    setQuickTipAmount(null);
    setTipPaymentMethod("CASH");
    setProcessError("");
  };

  const checkTipPaidCorrectly = () => {
    if (tipAmount <= 0 || !tipAllocation) return true;
    const { method: fieldType, amount: tipVal } = tipAllocation;
    let currentAmount = 0;
    if (fieldType === "cash") currentAmount = cashAmountInternal;
    else if (fieldType === "card") currentAmount = cardPaymentAmount;
    else if (fieldType === "debitCard") currentAmount = debitCardAmount;
    else if (fieldType === "cashlessATM") currentAmount = cashlessATMAmount;
    else if (fieldType === "ach") currentAmount = bleaumACHAmount;
    return currentAmount >= tipVal;
  };

  const handleProcess = () => {
    setProcessError("");
    if (tipAmount > 0 && !checkTipPaidCorrectly()) {
      const errorMsg =
        tipPaymentMethod === "CASH"
          ? "Please ensure the cash payment covers the full tip amount of $" +
            tipAmount.toFixed(2) +
            "."
          : "Please ensure the virtual payment covers the full tip amount of $" +
            tipAmount.toFixed(2) +
            ".";
      setProcessError(errorMsg);
      return;
    }

    let activePaymentMethod = "CASH";
    const hasCash = (cashAmountInternal || 0) > 0;
    const hasCashlessATM = cashlessATMAmount > 0;
    const hasCard = cardPaymentAmount > 0;
    const hasDebitCard = debitCardAmount > 0;
    const hasBleaumACH = bleaumACHAmount > 0;
    const hasAnyVirtual =
      hasCashlessATM || hasCard || hasDebitCard || hasBleaumACH;

    if (hasCash && hasAnyVirtual) {
      activePaymentMethod = "BOTH_CASH_VIRTUAL";
    } else if (hasAnyVirtual && !hasCash) {
      activePaymentMethod = "VIRTUAL";
    } else if (hasCash && !hasAnyVirtual) {
      activePaymentMethod = "CASH";
    } else if (!hasCash && !hasAnyVirtual && storeCreditAmount > 0) {
      activePaymentMethod = "CASH";
    }

    const storeCreditsUtilized = [];
    if (storeCreditAmount > 0 && selectedStoreCredit) {
      storeCreditsUtilized.push({
        shopId: selectedStoreCredit.shopId,
        utilized: Number.parseFloat(String(storeCreditAmount)) || 0,
      });
    }

    const cashPaid = Number.parseFloat(String(cashAmountInternal)) || 0;
    const virtualPaid =
      (Number.parseFloat(String(cashlessATMAmount)) || 0) +
      (Number.parseFloat(String(cardPaymentAmount)) || 0) +
      (Number.parseFloat(String(debitCardAmount)) || 0) +
      (Number.parseFloat(String(bleaumACHAmount)) || 0);

    const onlinePaymentMethod = determineOnlinePaymentMethod();

    const paymentPayload = {
      paymentMethod: activePaymentMethod,
      storeCreditAmount: Number.parseFloat(String(storeCreditAmount)) || 0,
      cashAmount: cashPaid,
      cashlessATMAmount: Number.parseFloat(String(cashlessATMAmount)) || 0,
      cardAmount: Number.parseFloat(String(cardPaymentAmount)) || 0,
      debitCardAmount: Number.parseFloat(String(debitCardAmount)) || 0,
      bleaumACHAmount: Number.parseFloat(String(bleaumACHAmount)) || 0,
      cashPaid,
      virtualPaid,
      onlinePaymentMethod,
      saleSourceForConsideringOnlinePayment: "INTERNAL",
      changeAmount: calculateChange(),
      changeMethod:
        calculateChange() > 0
          ? changeMethod === "CASH" || changeMethod === "STORE_CREDIT"
            ? changeMethod
            : "CASH"
          : null,
      tipAmount: Number.parseFloat(String(tipAmount)) || 0,
      tipPreference: tipPaymentMethod,
      notes,
      miscCharges,
      miscDiscount: Number.parseFloat(String(miscDiscount)) || 0,
      totalAmount,
      totalPaid: storeCreditAmount + cashPaid + virtualPaid,
      splitMode,
      storeCreditsUtilized,
      processingFeesDisplay: processingFees,
    };

    setPaymentMethod(activePaymentMethod);

    if (onProcessPayment) {
      try {
        onProcessPayment(paymentPayload);
      } catch (error) {
        console.error("Error calling onProcessPayment:", error);
      }
    }

    if (setIsAch) {
      setIsAch(bleaumACHAmount > 0);
    }
  };

  if (!visible) return null;

  const locallyCalculatedFees = Object.values(processingFees).reduce(
    (sum, fee) => sum + fee,
    0
  );
  const totalProcessingFees =
    onlineTransactionFee !== 0 ? onlineTransactionFee : locallyCalculatedFees;

  const feeSuffix = (fee, label) =>
    fee !== 0 ? (
      <span className={fee > 0 ? "text-red-600" : "text-green-600"}>
        {label} ({fee > 0 ? "Fee" : "Discount"}: ${Math.abs(fee).toFixed(2)})
      </span>
    ) : (
      label
    );

  const enabledMethodsCount = [
    true,
    isPaymentMethodEnabled("cashlessATM", shopPreferences),
    isPaymentMethodEnabled("creditCard", shopPreferences),
    isPaymentMethodEnabled("debitCard", shopPreferences),
    isPaymentMethodEnabled("ach", shopPreferences),
    availableStoreCredits.length > 0,
  ].filter(Boolean).length;

  // Portaled straight to <body> — this overlay must always cover the full
  // viewport regardless of where its trigger lives in the tree; rendering it
  // inline would put it at the mercy of any ancestor with a CSS `transform`
  // (e.g. a sliding Drawer), which creates a new containing block and would
  // shrink/misplace this `fixed` panel to that ancestor's box instead.
  return createPortal(
    <div className="fixed inset-0 z-[999] overflow-hidden">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="absolute right-0 top-0 h-full w-full max-w-[75vw] bg-card text-foreground shadow-2xl">
        <div className="flex h-full flex-col">
          <div className="flex w-full items-center justify-between px-6 pt-2">
            <button
              onClick={resetAllFields}
              className="rounded-lg border border-destructive/30 px-3 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
              title="Reset all payment fields"
            >
              Reset All
            </button>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted"
            >
              <X className="size-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="px-6 pb-2">
              <div className="text-center">
                <p className="my-2 text-4xl font-bold">
                  ${(totalAmount + (totalProcessingFees || 0)).toFixed(2)}
                </p>
                <p className="text-sm opacity-75">Total Due</p>
                {tipAmount > 0 && (
                  <div className="mt-1 text-xs text-muted-foreground">
                    Subtotal: ${(totalAmount - tipAmount).toFixed(2)} + Tip: $
                    {tipAmount.toFixed(2)}
                  </div>
                )}
                {totalProcessingFees !== 0 && (
                  <>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Order Total: ${totalAmount.toFixed(2)}
                    </p>
                    <p
                      className={`mt-1 text-xs ${
                        totalProcessingFees > 0
                          ? "text-orange-600"
                          : "text-green-600"
                      }`}
                    >
                      {totalProcessingFees > 0
                        ? "Processing Fee: +"
                        : "Discount Applied: -"}
                      ${Math.abs(totalProcessingFees).toFixed(2)}
                    </p>
                  </>
                )}
              </div>
            </div>

            <div className="space-y-6 px-6 pb-6">
              <div className="rounded-xl border border-border p-6">
                <h3 className="mb-4 text-lg font-semibold">Payment Methods</h3>

                <div className="space-y-4">
                  {availableStoreCredits && (
                    <div className="space-y-2">
                      <label className="block text-sm font-medium">
                        Available Store Credits
                      </label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-semibold text-muted-foreground">
                            $
                          </span>
                          <input
                            type="number"
                            className="h-[50px] w-full rounded-lg border border-input bg-transparent pl-7 pr-3 text-lg font-semibold outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
                            value={storeCreditInputString}
                            onChange={(e) =>
                              handlePaymentAmountChange(
                                "storeCredit",
                                e.target.value
                              )
                            }
                            placeholder={
                              selectedStoreCredit
                                ? "Enter Amount"
                                : "Select Store Credit First"
                            }
                            min="0"
                            step="0.01"
                            max={getMaxStoreCreditAmount()}
                            disabled={!selectedStoreCredit}
                          />
                        </div>
                        <Select
                          value={selectedStoreCredit?.shopId?.toString() ?? ""}
                          onValueChange={handleStoreCreditSelection}
                        >
                          <SelectTrigger className="h-[50px] min-w-[150px]">
                            <SelectValue placeholder="Select Store">
                              {(value) => {
                                const credit = availableStoreCredits.find(
                                  (c) => c.shopId.toString() === value
                                );
                                if (!credit) return "Select Store";
                                const currencySymbol =
                                  currencySymbols[credit.currencyCode] || "$";
                                return `${credit.shopName} (${currencySymbol}${credit.runningAmount.toFixed(
                                  2
                                )})`;
                              }}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {availableStoreCredits.map((credit) => {
                              const currencySymbol =
                                currencySymbols[credit.currencyCode] || "$";
                              return (
                                <SelectItem
                                  key={credit.shopId}
                                  value={credit.shopId.toString()}
                                >
                                  {credit.shopName} ({currencySymbol}
                                  {credit.runningAmount.toFixed(2)})
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                      <p className="text-xs font-medium text-green-600">
                        {selectedStoreCredit
                          ? `Available: ${getMaxStoreCreditAmount().toFixed(
                              2
                            )} at ${selectedStoreCredit.shopName}`
                          : `Total Available Credits: ${availableStoreCredits.length} locations`}
                      </p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <AmountField
                      value={cashInputString}
                      onFocus={() => {
                        if (!splitMode && !cashInputString)
                          handlePaymentAmountChange(
                            "cash",
                            totalAmount.toFixed(2)
                          );
                      }}
                      onChange={(e) =>
                        handlePaymentAmountChange("cash", e.target.value)
                      }
                      placeholder="Enter Amount"
                      suffix="Cash"
                    />
                    {!splitMode && cashDenominations.length > 0 && (
                      <div className="flex gap-2">
                        {cashDenominations.map((d) => (
                          <button
                            key={d}
                            type="button"
                            onClick={() =>
                              handlePaymentAmountChange("cash", String(d))
                            }
                            className="flex-1 rounded-lg border border-border bg-muted py-2 text-sm font-semibold transition-colors hover:bg-primary/10"
                          >
                            ${d}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {isPaymentMethodEnabled("cashlessATM", shopPreferences) && (
                    <AmountField
                      value={cashlessATMInputString}
                      onFocus={() => {
                        if (!splitMode && !cashlessATMInputString)
                          handlePaymentAmountChange(
                            "cashlessATM",
                            totalAmount.toFixed(2)
                          );
                      }}
                      onChange={(e) =>
                        handlePaymentAmountChange("cashlessATM", e.target.value)
                      }
                      placeholder="Enter Amount"
                      suffix={
                        processingFees.cashlessATM !== 0
                          ? feeSuffix(processingFees.cashlessATM, "Cashless ATM")
                          : "Bleaum Digital Debit"
                      }
                    />
                  )}

                  {isPaymentMethodEnabled("creditCard", shopPreferences) && (
                    <AmountField
                      value={cardInputString}
                      onFocus={() => {
                        if (!splitMode && !cardInputString)
                          handlePaymentAmountChange(
                            "card",
                            totalAmount.toFixed(2)
                          );
                      }}
                      onChange={(e) =>
                        handlePaymentAmountChange("card", e.target.value)
                      }
                      placeholder="Enter Amount"
                      suffix={feeSuffix(processingFees.creditCard, "Credit Card")}
                    />
                  )}

                  {isPaymentMethodEnabled("debitCard", shopPreferences) && (
                    <AmountField
                      value={debitCardInputString}
                      onFocus={() => {
                        if (!splitMode && !debitCardInputString)
                          handlePaymentAmountChange(
                            "debitCard",
                            totalAmount.toFixed(2)
                          );
                      }}
                      onChange={(e) =>
                        handlePaymentAmountChange("debitCard", e.target.value)
                      }
                      placeholder="Enter Amount"
                      suffix={feeSuffix(processingFees.debitCard, "Debit Card")}
                    />
                  )}

                  {isPaymentMethodEnabled("ach", shopPreferences) && (
                    <AmountField
                      value={bleaumACHInputString}
                      onFocus={() => {
                        if (!splitMode && !bleaumACHInputString)
                          handlePaymentAmountChange(
                            "bleaumACH",
                            totalAmount.toFixed(2)
                          );
                      }}
                      onChange={(e) =>
                        handlePaymentAmountChange("bleaumACH", e.target.value)
                      }
                      placeholder="Enter Amount"
                      suffix={feeSuffix(processingFees.ach, "Bleaum ACH")}
                    />
                  )}

                  {shopPreferences &&
                    !isPaymentMethodEnabled("cash", shopPreferences) &&
                    !isPaymentMethodEnabled("cashlessATM", shopPreferences) &&
                    !isPaymentMethodEnabled("creditCard", shopPreferences) &&
                    !isPaymentMethodEnabled("debitCard", shopPreferences) &&
                    !isPaymentMethodEnabled("ach", shopPreferences) &&
                    availableStoreCredits.length === 0 && (
                      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-center dark:border-yellow-900 dark:bg-yellow-950">
                        <p className="text-sm text-yellow-700 dark:text-yellow-400">
                          No payment methods are currently enabled. Please enable
                          payment methods in shop preferences.
                        </p>
                      </div>
                    )}

                  {enabledMethodsCount > 1 && (
                    <div
                      className={`flex cursor-pointer items-center gap-3 rounded-lg border-2 p-4 transition-all ${
                        splitMode
                          ? "border-primary bg-primary/10"
                          : "border-border bg-muted hover:border-primary/40"
                      }`}
                      onClick={() => {
                        const newSplitMode = !splitMode;
                        setSplitModeInternal(newSplitMode);
                        setSplitMode?.(newSplitMode);
                        setCashAmountInternal(0);
                        setCashInputString("");
                        setCashAmount?.(0);
                        setStoreCreditAmountInternal(0);
                        setStoreCreditInputString("");
                        setStoreCreditAmount?.(0);
                        setCashlessATMAmountInternal(0);
                        setCashlessATMInputString("");
                        setCashlessATMAmount?.(0);
                        setCardPaymentAmountInternal(0);
                        setCardInputString("");
                        setCardPaymentAmount?.(0);
                        setDebitCardAmountInternal(0);
                        setDebitCardInputString("");
                        setDebitCardAmount?.(0);
                        setBleaumACHAmountInternal(0);
                        setBleaumACHInputString("");
                        setBleaumACHAmount?.(0);
                        if (availableStoreCredits.length > 1) {
                          setSelectedStoreCredit(null);
                        }
                        setTimeout(() => calculateChange(), 0);
                      }}
                    >
                      <div
                        className={`flex size-5 items-center justify-center rounded-full border-2 transition-colors ${
                          splitMode
                            ? "border-primary bg-primary"
                            : "border-muted-foreground"
                        }`}
                      >
                        {splitMode && (
                          <div className="size-2 rounded-full bg-white" />
                        )}
                      </div>
                      <span
                        className={`font-medium ${
                          splitMode ? "text-primary" : ""
                        }`}
                      >
                        Split Payment
                      </span>
                      {splitMode && (
                        <span className="ml-auto text-green-600">✓</span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-border p-6">
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold">
                    Change Amount: ${getChangeAmount().toFixed(2)}
                  </h3>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-semibold text-muted-foreground">
                        $
                      </span>
                      <input
                        type="number"
                        className="h-[50px] w-full rounded-lg border border-input bg-transparent pl-7 pr-3 text-lg font-semibold outline-none"
                        value={getChangeAmount().toFixed(2)}
                        readOnly
                      />
                    </div>
                    <Select
                      value={
                        changeMethod === "CASH" ||
                        changeMethod === "STORE_CREDIT"
                          ? changeMethod
                          : "CASH"
                      }
                      onValueChange={(value) => setChangeMethod?.(value)}
                    >
                      <SelectTrigger className="h-[50px] min-w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CASH">Cash</SelectItem>
                        <SelectItem value="STORE_CREDIT">
                          Store Credit
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="rounded-xl border border-border p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Tip (Optional)</h3>
                    <button
                      onClick={() => setVisibleTip(true)}
                      className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/80"
                    >
                      Add
                    </button>
                  </div>

                  {tipAmount > 0 ? (
                    <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950">
                      <div className="mb-3 flex items-center justify-between">
                        <span className="font-medium text-green-700 dark:text-green-400">
                          Selected Tip
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="rounded-md bg-green-100 px-2 py-1 text-sm font-semibold text-green-800 dark:bg-green-900 dark:text-green-200">
                            ${tipAmount.toFixed(2)}
                          </span>
                          <button
                            onClick={handleRemoveTip}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Minus className="size-4" />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-green-700 dark:text-green-400">
                          Payment Method:
                        </span>
                        <span className="rounded-md bg-green-100 px-2 py-1 text-xs font-semibold text-green-800 dark:bg-green-900 dark:text-green-200">
                          {tipPaymentMethod === "CASH" ? "Cash" : "Virtual"}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-border bg-muted p-4 text-center">
                      <p className="text-sm text-muted-foreground">
                        No tip selected. Click &quot;Add&quot; to add a tip.
                      </p>
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-border p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-semibold">
                      Additional Charges
                    </h3>
                    <button
                      onClick={onAddMiscCharge}
                      className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/80"
                    >
                      Add
                    </button>
                  </div>

                  {getOrderSummary?.data?.miscCharges?.length > 0 ? (
                    <div className="space-y-3">
                      {getOrderSummary.data.miscCharges.map((charge, index) => (
                        <div
                          key={index}
                          className="flex items-start justify-between rounded-lg border border-border bg-muted p-3"
                        >
                          <div className="flex-1">
                            <span className="font-medium">{charge.notes}</span>
                            <div className="mt-1 text-xs text-muted-foreground">
                              (${charge.initialUnitPrice} x {charge.quantity})
                            </div>
                            {charge.snapShotData?.taxesApplied?.length > 0 && (
                              <div className="mt-1 text-xs text-muted-foreground">
                                Taxes:{" "}
                                {charge.snapShotData.taxesApplied
                                  .map(
                                    (tax) => `${tax.name} (${tax.taxRate}%)`
                                  )
                                  .join(", ")}
                              </div>
                            )}
                          </div>
                          <div className="ml-2 flex items-center gap-2">
                            <span className="rounded-md bg-green-100 px-2 py-1 text-sm font-semibold text-green-800 dark:bg-green-900 dark:text-green-200">
                              +${charge.finalTotalPrice.toFixed(2)}
                            </span>
                            <button
                              onClick={() => onRemoveMiscCharge?.(index)}
                              className="p-1 text-red-500 hover:text-red-700"
                              title="Delete Miscellaneous Charge"
                            >
                              <Trash2 className="size-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-border bg-muted p-4 text-center">
                      <p className="text-sm text-muted-foreground">
                        No additional charges. Click &quot;Add&quot; to add
                        charges.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-border p-6">
                <h3 className="mb-4 text-lg font-semibold">Notes (Optional)</h3>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes?.(e.target.value)}
                  placeholder="Add payment notes..."
                  rows={3}
                  maxLength={200}
                  className="w-full resize-none rounded-lg border border-input bg-transparent px-4 py-3 outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  {notes.length}/200 characters
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-border bg-card p-6">
            {(cashAmountInternal > 0 ||
              storeCreditAmount > 0 ||
              cashlessATMAmount > 0 ||
              cardPaymentAmount > 0 ||
              debitCardAmount > 0 ||
              bleaumACHAmount > 0) && (
              <div className="mb-4 rounded-lg bg-muted p-4">
                <div className="mb-2 text-sm font-medium">
                  Payment Breakdown:
                </div>
                <div className="space-y-1 text-sm text-muted-foreground">
                  {cashAmountInternal > 0 && (
                    <div className="flex justify-between">
                      <span>Cash:</span>
                      <span className="font-semibold">
                        ${cashAmountInternal.toFixed(2)}
                      </span>
                    </div>
                  )}
                  {storeCreditAmount > 0 && (
                    <div className="flex justify-between">
                      <span>Store Credit:</span>
                      <span className="font-semibold">
                        ${storeCreditAmount.toFixed(2)}
                      </span>
                    </div>
                  )}
                  {cashlessATMAmount > 0 && (
                    <div className="flex justify-between">
                      <span>Cashless ATM:</span>
                      <span className="font-semibold">
                        ${cashlessATMAmount.toFixed(2)}
                      </span>
                    </div>
                  )}
                  {cardPaymentAmount > 0 && (
                    <div className="flex justify-between">
                      <span>Credit Card:</span>
                      <span className="font-semibold">
                        ${cardPaymentAmount.toFixed(2)}
                      </span>
                    </div>
                  )}
                  {debitCardAmount > 0 && (
                    <div className="flex justify-between">
                      <span>Debit Card:</span>
                      <span className="font-semibold">
                        ${debitCardAmount.toFixed(2)}
                      </span>
                    </div>
                  )}
                  {bleaumACHAmount > 0 && (
                    <div className="flex justify-between">
                      <span>ACH:</span>
                      <span className="font-semibold">
                        ${bleaumACHAmount.toFixed(2)}
                      </span>
                    </div>
                  )}
                  <div className="mt-2 flex justify-between border-t border-border pt-2 font-bold">
                    <span>Total Paid:</span>
                    <span>
                      $
                      {(
                        cashAmountInternal +
                        storeCreditAmount +
                        cashlessATMAmount +
                        cardPaymentAmount +
                        debitCardAmount +
                        bleaumACHAmount
                      ).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {quoteError && (
              <div className="mb-2 rounded border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-red-600">
                    {quoteError.message}
                  </p>
                  <button
                    onClick={onClearQuoteError}
                    className="flex-shrink-0 text-xs leading-none text-red-400 hover:text-red-600"
                  >
                    ✕
                  </button>
                </div>
                {quoteError.requestId && (
                  <p className="mt-1 font-mono text-xs text-red-400">
                    Request ID: {quoteError.requestId}
                  </p>
                )}
              </div>
            )}

            {processError && (
              <div className="mb-2 rounded border border-red-200 bg-red-50 p-2 text-sm text-red-500 dark:border-red-900 dark:bg-red-950">
                {processError}
              </div>
            )}

            <button
              onClick={handleProcess}
              disabled={!isPaymentComplete() || loading}
              className={`w-full rounded-xl px-6 py-4 text-lg font-semibold transition-all ${
                isPaymentComplete() && !loading
                  ? "bg-blue-600 text-white shadow-lg hover:bg-blue-700 hover:shadow-xl"
                  : "cursor-not-allowed bg-muted text-muted-foreground"
              }`}
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="size-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Processing...
                </div>
              ) : isPaymentComplete() ? (
                `Process Payment $${grandTotal.toFixed(2)}`
              ) : (
                `Need $${calculateRemaining().toFixed(2)} more`
              )}
            </button>
          </div>
        </div>
      </div>

      {visibleTip && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setVisibleTip(false)}
          />
          <div className="relative w-full max-w-lg rounded-xl bg-card p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Add Tip</h3>
              <button
                onClick={() => setVisibleTip(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium">
                  Payment Method for Tip
                </label>
                <div className="flex gap-4">
                  {["CASH", "VIRTUAL"].map((m) => (
                    <label
                      key={m}
                      className="flex cursor-pointer items-center"
                    >
                      <input
                        type="radio"
                        name="tipPaymentMethod"
                        value={m}
                        checked={tipPaymentMethod === m}
                        onChange={(e) => setTipPaymentMethod(e.target.value)}
                        className="size-4"
                      />
                      <span className="ml-2 text-sm font-medium">
                        {m === "CASH" ? "Cash" : "Virtual"}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {tipPercentages.map((percentage) => {
                  const tipDollarAmount = (totalAmount * percentage) / 100;
                  return (
                    <button
                      key={percentage}
                      onClick={() => calculateTipAmount(percentage)}
                      className={`flex size-[130px] flex-col items-center justify-center rounded-lg text-lg font-medium transition-colors ${
                        quickTipAmount === percentage
                          ? "bg-primary/20 text-primary"
                          : "bg-muted hover:bg-primary/10"
                      }`}
                    >
                      <span className="text-xl font-bold">{percentage}%</span>
                      <span className="mt-2 text-sm font-semibold">
                        ${tipDollarAmount.toFixed(2)}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium">
                  Custom Amount
                </label>
                <div className="relative">
                  <input
                    type="number"
                    className="w-full rounded-lg border border-input bg-transparent px-4 py-3 pr-12 outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                    placeholder="Enter custom tip amount"
                    min="0"
                    step="0.01"
                    onChange={(e) => {
                      const value = Number.parseFloat(e.target.value) || 0;
                      setTipAmount?.(value);
                      setQuickTipAmount(null);
                    }}
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 font-semibold text-muted-foreground">
                    $
                  </div>
                </div>
              </div>

              <button
                onClick={handleApplyTip}
                className="w-full rounded-lg bg-blue-600 py-3 font-medium text-white transition-colors hover:bg-blue-700"
              >
                Apply Tip
              </button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}
