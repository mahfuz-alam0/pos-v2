"use client";

import { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { ArrowLeft, CheckCircle2, Inbox, LayoutGrid, Monitor } from "lucide-react";
import { toast } from "sonner";
import Drawer from "@/components/ui/Drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { listRegisters } from "@/services/registers/listRegisters";
import { getAllPaginatedRegisterDrawer } from "@/services/registers/getRegisterDrawer";
import { getSingleDrawer } from "@/services/registers/getSingleDrawer";
import { startDrawer } from "@/services/registers/startDrawer";
import { discloseDrawer } from "@/services/registers/discloseDrawer";
import {
  getDrawerActiveSummary,
  getDrawerClosedSessionSummary,
} from "@/services/registers/getDrawerSummary";
import { depositDrawerCash, withdrawDrawerCash } from "@/services/registers/adjustDrawerCash";
import { getQuoteForSales } from "@/services/sales/getQuoteforSales";
import { quoteApiManager } from "@/utils/quoteApiManager";
import { updateSalesDetail } from "@/store/slices/salesDetailSlice";
import { getQuoteForSale } from "@/store/slices/quoteForSaleSlice";

// Bills (whole-dollar) + coin (cent) denominations counted when starting or
// closing a drawer. Matches the old openRegister.js/closeRegister.js set.
const BILL_DENOMINATIONS = [100, 50, 20, 10, 5, 2, 1];
const COIN_DENOMINATIONS = [25, 10, 5, 1];

function denominationTotalFrom(values) {
  let total = 0;
  BILL_DENOMINATIONS.forEach((d) => {
    total += (values[`$${d}`] || 0) * d;
  });
  COIN_DENOMINATIONS.forEach((d) => {
    total += (values[`${d}c`] || 0) * (d / 100);
  });
  return total;
}

function cashDenominationRecordFrom(values) {
  const record = [];
  BILL_DENOMINATIONS.forEach((d) => {
    const quantity = values[`$${d}`] || 0;
    if (quantity > 0) record.push({ denomination: d, quantity });
  });
  COIN_DENOMINATIONS.forEach((d) => {
    const quantity = values[`${d}c`] || 0;
    if (quantity > 0) record.push({ denomination: d / 100, quantity });
  });
  return record;
}

function DenominationGrid({ values, onChange }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Bills
        </p>
        <div className="space-y-1.5">
          {BILL_DENOMINATIONS.map((d) => (
            <div key={`$${d}`} className="flex items-center gap-2">
              <span className="w-9 shrink-0 text-sm font-semibold">${d}</span>
              <Input
                type="number"
                min="0"
                step="1"
                className="h-8"
                value={values[`$${d}`] || ""}
                onChange={(e) =>
                  onChange(`$${d}`, e.target.value ? parseFloat(e.target.value) : 0)
                }
              />
            </div>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Coins
        </p>
        <div className="space-y-1.5">
          {COIN_DENOMINATIONS.map((d) => (
            <div key={`${d}c`} className="flex items-center gap-2">
              <span className="w-9 shrink-0 text-sm font-semibold">{d}¢</span>
              <Input
                type="number"
                min="0"
                step="1"
                className="h-8"
                value={values[`${d}c`] || ""}
                onChange={(e) =>
                  onChange(`${d}c`, e.target.value ? parseFloat(e.target.value) : 0)
                }
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Register/drawer picker. Self-mounts on the `openRegisterModal` window
 * CustomEvent that `src/app/pos/page.js` dispatches when a drawer is mandatory
 * but unset — this closes the previously-flagged wiring gap. It can also be
 * driven directly via the optional `open`/`onClose` props.
 *
 * On drawer selection it persists ids to localStorage, updates salesDetail,
 * refreshes the quote (debounced through quoteApiManager) when the cart is
 * non-empty, and broadcasts a `registerDrawerSelected` CustomEvent so the page
 * can sync its own selectors.
 *
 * Start Drawer / Close Drawer (balance) are ported — cash/coin denomination
 * counting, adjustment-reason-when-mismatched, notes, and the disclose/start
 * API calls all match the old openRegister.js/closeRegister.js.
 *
 * Not ported (flagged): Deposit Cash / Withdraw Cash, the Drawer Transactions
 * tab, and the PDF balance receipt — those are separate cash-management/print
 * subsystems, not part of starting or closing a drawer. The printer-selection
 * modal is likewise out of scope (depends on usePrintClients).
 *
 * Props (all optional):
 *   open, onClose — external control; when omitted the component manages its
 *                   own visibility off the openRegisterModal event.
 */
export default function RegisterDrawerModal({ open: openProp, onClose }: any = {}) {
  const dispatch = useDispatch();
  const quoteBody = useSelector((state: any) => state?.salesDetail);
  const lineItems = useSelector((state: any) => state?.lineItems?.lineItems);

  const [selfOpen, setSelfOpen] = useState(false);
  const controlled = openProp !== undefined;
  const open = controlled ? openProp : selfOpen;

  const [step, setStep] = useState("register");
  const [registers, setRegisters] = useState([]);
  const [allDrawers, setAllDrawers] = useState([]);
  const [selectedRegister, setSelectedRegister] = useState(null);
  const [loading, setLoading] = useState(false);

  // Start Drawer flow
  const [startDrawerDetail, setStartDrawerDetail] = useState(null);
  const [startPrevSummary, setStartPrevSummary] = useState(null);
  const [startCountType, setStartCountType] = useState("cashDenominations");
  const [startDenomValues, setStartDenomValues] = useState({});
  const [startFlatCash, setStartFlatCash] = useState("");
  const [startNotes, setStartNotes] = useState("");
  const [starting, setStarting] = useState(false);

  // Close Drawer (balance) flow
  const [closeDrawerDetail, setCloseDrawerDetail] = useState(null);
  const [activeSummary, setActiveSummary] = useState(null);
  const [closeCountType, setCloseCountType] = useState("cashDenominations");
  const [closeDenomValues, setCloseDenomValues] = useState({});
  const [closeFlatCash, setCloseFlatCash] = useState("");
  const [closingVirtualBalance, setClosingVirtualBalance] = useState("0");
  const [cashAdjustmentReason, setCashAdjustmentReason] = useState("");
  const [virtualAdjustmentReason, setVirtualAdjustmentReason] = useState("");
  const [closeNotes, setCloseNotes] = useState("");
  const [closing, setClosing] = useState(false);
  const [closeBalanced, setCloseBalanced] = useState(false);

  // Deposit / Withdraw cash flow (step "deposit" | "withdraw", entered from Close Drawer)
  const [adjustCountType, setAdjustCountType] = useState("cashDenominations");
  const [adjustDenomValues, setAdjustDenomValues] = useState({});
  const [adjustFlatAmount, setAdjustFlatAmount] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [adjusting, setAdjusting] = useState(false);

  const close = useCallback(() => {
    if (controlled) onClose?.();
    else setSelfOpen(false);
  }, [controlled, onClose]);

  // Self-mount on the page's openRegisterModal event (only when uncontrolled).
  useEffect(() => {
    if (controlled) return;
    const handler = () => setSelfOpen(true);
    window.addEventListener("openRegisterModal", handler);
    return () => window.removeEventListener("openRegisterModal", handler);
  }, [controlled]);

  const fetchRegisters = useCallback(async () => {
    setLoading(true);
    try {
      const shopId = JSON.parse(localStorage.getItem("shopId"));
      const res = await listRegisters(shopId);
      const openRegs = (res?.data?.data?.registers || []).filter(
        (r) => r.isOpen === true
      );
      setRegisters(openRegs);
    } catch (err) {
      console.error("Error fetching registers:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      setStep("register");
      setSelectedRegister(null);
      setAllDrawers([]);
      fetchRegisters();
    }
  }, [open, fetchRegisters]);

  const handleSelectRegister = async (register) => {
    setSelectedRegister(register);
    setLoading(true);
    try {
      const res = await getAllPaginatedRegisterDrawer(50, 1, register.id);
      setAllDrawers(res?.data?.drawers || []);
      setStep("drawer");
    } catch (err) {
      console.error("Error fetching drawers:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDrawer = (drawer) => {
    const regName = selectedRegister?.name || "";
    const drawerName = drawer.name || "";

    dispatch(
      updateSalesDetail({
        registerId: selectedRegister.id,
        drawerId: drawer.id,
      })
    );

    if (lineItems?.length > 0) {
      const updatedBody = {
        ...quoteBody,
        registerId: selectedRegister.id,
        drawerId: drawer.id,
      };
      quoteApiManager
        .call(getQuoteForSales, updatedBody, "register-drawer-modal-select")
        .then((res) => dispatch(getQuoteForSale(res.data)))
        .catch(() => {});
    }

    broadcastDrawerSelected(selectedRegister.id, regName, drawer.id, drawerName);
    close();
  };

  const broadcastDrawerSelected = (registerId, registerName, drawerId, drawerName) => {
    localStorage.setItem("registerId", registerId);
    localStorage.setItem("registerName", registerName);
    localStorage.setItem("drawerId", drawerId);
    localStorage.setItem("drawerName", drawerName);
    window.dispatchEvent(
      new CustomEvent("registerDrawerSelected", {
        detail: { registerId, registerName, drawerId, drawerName },
      })
    );
  };

  const refreshDrawersForSelectedRegister = async () => {
    if (!selectedRegister) return;
    try {
      const res = await getAllPaginatedRegisterDrawer(50, 1, selectedRegister.id);
      setAllDrawers(res?.data?.drawers || []);
    } catch (err) {
      console.error("Error refreshing drawers:", err);
    }
  };

  const resetStartForm = () => {
    setStartDenomValues({});
    setStartFlatCash("");
    setStartNotes("");
    setStartCountType("cashDenominations");
  };

  const resetCloseForm = () => {
    setCloseDenomValues({});
    setCloseFlatCash("");
    setClosingVirtualBalance("0");
    setCashAdjustmentReason("");
    setVirtualAdjustmentReason("");
    setCloseNotes("");
    setCloseCountType("cashDenominations");
    setCloseBalanced(false);
  };

  const handleClickStartDrawer = async (drawer, e) => {
    e.stopPropagation();
    setLoading(true);
    try {
      const [detailRes, summaryRes] = await Promise.all([
        getSingleDrawer(drawer.id),
        getDrawerClosedSessionSummary(drawer.id),
      ]);
      setStartDrawerDetail(detailRes?.data?.data?.drawer);
      setStartPrevSummary(summaryRes?.data?.data);
      resetStartForm();
      setStep("start");
    } catch (err: any) {
      toast.error(err?.message || "Error fetching drawer detail");
    } finally {
      setLoading(false);
    }
  };

  const handleClickCloseDrawer = async (drawer, e) => {
    e.stopPropagation();
    setLoading(true);
    try {
      const [detailRes, summaryRes] = await Promise.all([
        getSingleDrawer(drawer.id),
        getDrawerActiveSummary(drawer.id),
      ]);
      setCloseDrawerDetail(detailRes?.data?.data?.drawer);
      const summary = summaryRes?.data?.data;
      setActiveSummary(summary);
      const expectedVirtual =
        (summary?.virtualAmountStartedWith || 0) +
        (summary?.totalVirtualCredit || 0) -
        (summary?.totalVirtualDebit || 0);
      resetCloseForm();
      setClosingVirtualBalance(expectedVirtual.toFixed(2));
      setStep("close");
    } catch (err: any) {
      toast.error(err?.message || "Error fetching drawer detail");
    } finally {
      setLoading(false);
    }
  };

  const startTotal =
    startCountType === "cashDenominations"
      ? denominationTotalFrom(startDenomValues)
      : parseFloat(startFlatCash) || 0;

  const handleSubmitStartDrawer = async () => {
    if (startTotal <= 0) {
      toast.error("Please enter the counted cash balance in order to start the drawer");
      return;
    }
    setStarting(true);
    try {
      const body = {
        startingCashBalance: startTotal,
        startingVirtualBalance: 0,
        startingNotes: startNotes || undefined,
        shopId: JSON.parse(localStorage.getItem("shopId")),
        id: startDrawerDetail.id,
        version: startDrawerDetail.version,
      };
      const res = await startDrawer(body, startDrawerDetail.id);
      if (!res?.data?.success) throw new Error("An error occurred while starting the drawer");

      toast.success("Drawer started successfully");
      dispatch(
        updateSalesDetail({
          registerId: startDrawerDetail?.registerInfo?.id || selectedRegister?.id,
          drawerId: startDrawerDetail?.id,
        })
      );
      broadcastDrawerSelected(
        startDrawerDetail?.registerInfo?.id || selectedRegister?.id,
        selectedRegister?.name || "",
        startDrawerDetail?.id,
        startDrawerDetail?.name || ""
      );
      close();
    } catch (err: any) {
      toast.error(err?.message || err?.error || "An unexpected error occurred");
    } finally {
      setStarting(false);
    }
  };

  const expectedCashAmount =
    (activeSummary?.cashAmountStartedWith || 0) +
    (activeSummary?.totalCashCredit || 0) -
    (activeSummary?.totalCashDebit || 0);
  const expectedVirtualAmount =
    (activeSummary?.virtualAmountStartedWith || 0) +
    (activeSummary?.totalVirtualCredit || 0) -
    (activeSummary?.totalVirtualDebit || 0);
  const closeCashTotal =
    closeCountType === "cashDenominations"
      ? denominationTotalFrom(closeDenomValues)
      : parseFloat(closeFlatCash) || 0;
  const closeVirtualTotal = parseFloat(closingVirtualBalance) || 0;
  const cashMismatch = Math.abs(closeCashTotal - expectedCashAmount) > 0.001;
  const virtualMismatch = Math.abs(closeVirtualTotal - expectedVirtualAmount) > 0.001;

  const handleSubmitCloseDrawer = async () => {
    if (cashMismatch && !cashAdjustmentReason.trim()) {
      toast.error("Please provide a reason for the cash adjustment");
      return;
    }
    if (virtualMismatch && !virtualAdjustmentReason.trim()) {
      toast.error("Please provide a reason for the virtual adjustment");
      return;
    }
    setClosing(true);
    try {
      const body = {
        closingCashBalance: closeCashTotal,
        closingVirtualBalance: closeVirtualTotal,
        closingNotes: closeNotes || undefined,
        cashAdjustment: parseFloat((closeCashTotal - expectedCashAmount).toFixed(2)),
        virtualAdjustment: parseFloat((closeVirtualTotal - expectedVirtualAmount).toFixed(2)),
        cashAdjustmentReason: cashMismatch ? cashAdjustmentReason : null,
        virtualAdjustmentReason: virtualMismatch ? virtualAdjustmentReason : null,
        shopId: JSON.parse(localStorage.getItem("shopId")),
        id: closeDrawerDetail.id,
        version: closeDrawerDetail.version,
      };
      await discloseDrawer(body, closeDrawerDetail.id);
      toast.success("Drawer disclosed successfully");
      await refreshDrawersForSelectedRegister();
      setCloseBalanced(true);

      // If the drawer just closed is the one currently active for checkout,
      // clear it everywhere so the page stops treating the register as ready.
      if (String(localStorage.getItem("drawerId")) === String(closeDrawerDetail.id)) {
        localStorage.removeItem("drawerId");
        localStorage.removeItem("drawerName");
        window.dispatchEvent(
          new CustomEvent("registerDrawerClosed", {
            detail: { drawerId: closeDrawerDetail.id },
          })
        );
      }
    } catch (err: any) {
      toast.error(err?.message || err?.error || "An unexpected error occurred");
    } finally {
      setClosing(false);
    }
  };

  const adjustTotal =
    adjustCountType === "cashDenominations"
      ? denominationTotalFrom(adjustDenomValues)
      : parseFloat(adjustFlatAmount) || 0;

  const openAdjustForm = (kind) => {
    setAdjustCountType("cashDenominations");
    setAdjustDenomValues({});
    setAdjustFlatAmount("");
    setAdjustReason("");
    setStep(kind);
  };

  const handleSubmitAdjust = async (kind) => {
    if (adjustTotal <= 0) {
      toast.error(`Please enter a valid ${kind} amount`);
      return;
    }
    if (!adjustReason.trim()) {
      toast.error("Please input reason!");
      return;
    }
    setAdjusting(true);
    try {
      const body = {
        amount: adjustTotal,
        reason: adjustReason,
        id: closeDrawerDetail.id,
        shopId: JSON.parse(localStorage.getItem("shopId")),
        cashDenominationRecord:
          adjustCountType === "cashDenominations"
            ? cashDenominationRecordFrom(adjustDenomValues)
            : [],
      };
      const call = kind === "deposit" ? depositDrawerCash : withdrawDrawerCash;
      await call(body, closeDrawerDetail.id);
      toast.success(kind === "deposit" ? "Cash deposit successfully" : "Cash withdraw successfully");

      const summaryRes = await getDrawerActiveSummary(closeDrawerDetail.id);
      setActiveSummary(summaryRes?.data?.data);
      setStep("close");
    } catch (err: any) {
      toast.error(err?.message || err?.error || "An unexpected error occurred");
    } finally {
      setAdjusting(false);
    }
  };

  const currentRegisterId =
    typeof window !== "undefined" ? localStorage.getItem("registerId") : null;
  const currentDrawerId =
    typeof window !== "undefined" ? localStorage.getItem("drawerId") : null;

  return (
    <Drawer open={open} onClose={close} side="right" size={560} zIndex={10000}>
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          {step !== "register" && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() =>
                setStep(
                  step === "drawer"
                    ? "register"
                    : step === "deposit" || step === "withdraw"
                    ? "close"
                    : "drawer"
                )
              }
            >
              <ArrowLeft />
            </Button>
          )}
          <span className="text-[15px] font-semibold">
            {step === "register" && "Select Register"}
            {step === "drawer" && `Select Drawer — ${selectedRegister?.name}`}
            {step === "start" && `Start Drawer — ${startDrawerDetail?.name || ""}`}
            {step === "deposit" && "Deposit Cash"}
            {step === "withdraw" && "Withdraw Cash"}
            {step === "close" && `Close Drawer — ${closeDrawerDetail?.name || ""}`}
          </span>
        </div>

        {/* Live-total gradient banner — matches the old openRegister.js
            "Opening Drawer" header exactly (icon + label left, running
            total right, updates as denominations/flat cash are entered). */}
        {step === "start" && (
          <div className="flex shrink-0 items-center justify-between bg-linear-to-r from-blue-500 to-blue-600 px-4 py-2.5 text-white">
            <div className="flex items-center gap-2">
              <LayoutGrid className="size-3.5 text-white/80" />
              <span className="text-xs font-medium uppercase tracking-wider text-white/80">
                Opening Drawer
              </span>
            </div>
            <div className="text-xl font-bold tracking-tight">
              ${startTotal.toFixed(2)}
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-3">
          {loading && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Loading...
            </p>
          )}

          {!loading && step === "register" && (
            <>
              {registers.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No open registers found
                </p>
              )}
              <ul className="space-y-2">
                {registers.map((register) => {
                  const isActive =
                    String(register.id) === String(currentRegisterId);
                  return (
                    <li key={register.id}>
                      <button
                        onClick={() => handleSelectRegister(register)}
                        className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
                          isActive
                            ? "border-primary/30 bg-primary/10"
                            : "border-border bg-surface hover:bg-muted"
                        }`}
                      >
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted">
                          <Monitor className="size-4 text-muted-foreground" />
                        </span>
                        <span className="min-w-0 flex-1 truncate font-medium text-foreground">
                          {register.name}
                        </span>
                        <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                          Open
                        </Badge>
                        {isActive && (
                          <CheckCircle2 className="size-4 text-primary" />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>
          )}

          {!loading && step === "drawer" && (
            <>
              {allDrawers.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No drawers found for this register
                </p>
              )}
              <ul className="space-y-2">
                {allDrawers.map((drawer) => {
                  const isOpen = drawer.isOpen === true;
                  const isActive =
                    String(drawer.id) === String(currentDrawerId);
                  return (
                    <li key={drawer.id}>
                      {/* A plain div, not a <button> — it wraps the
                          Start/Close Drawer <Button>s below, and a disabled
                          <button disabled> blocks pointer events on all its
                          descendants, which silently ate every click on
                          "Start Drawer" for closed rows (disabled={!isOpen}
                          is true exactly when that button shows). */}
                      <div
                        role={isOpen ? "button" : undefined}
                        tabIndex={isOpen ? 0 : undefined}
                        onClick={() => isOpen && handleSelectDrawer(drawer)}
                        onKeyDown={(e) => {
                          if (isOpen && (e.key === "Enter" || e.key === " ")) {
                            handleSelectDrawer(drawer);
                          }
                        }}
                        className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
                          isOpen && isActive
                            ? "cursor-pointer border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-950"
                            : isOpen
                            ? "cursor-pointer border-border bg-surface hover:bg-muted"
                            : "cursor-default border-destructive/30 bg-destructive/5"
                        }`}
                      >
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted">
                          <Inbox
                            className={`size-4 ${
                              isOpen
                                ? "text-muted-foreground"
                                : "text-destructive"
                            }`}
                          />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium text-foreground">
                            {drawer.name}
                          </span>
                          {!isOpen && (
                            <span className="mt-0.5 block text-xs text-destructive">
                              Drawer is closed — start it to continue
                            </span>
                          )}
                        </span>
                        {isOpen ? (
                          <>
                            <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                              Open
                            </Badge>
                            {isActive && (
                              <CheckCircle2 className="size-4 text-green-600" />
                            )}
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={(e) => handleClickCloseDrawer(drawer, e)}
                            >
                              Close Drawer
                            </Button>
                          </>
                        ) : (
                          <Button
                            size="sm"
                            onClick={(e) => handleClickStartDrawer(drawer, e)}
                          >
                            Start Drawer
                          </Button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          )}

          {step === "start" && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted/50 p-3 text-xs">
                <p className="mb-1 font-semibold text-muted-foreground">
                  Previous Session
                </p>
                <div className="flex gap-4">
                  <span>
                    Cash:{" "}
                    <span className="font-semibold">
                      ${(startPrevSummary?.closingCashBalance ?? 0).toFixed(2)}
                    </span>
                  </span>
                  <span>
                    Virtual:{" "}
                    <span className="font-semibold">
                      ${(startPrevSummary?.closingVirtualBalance ?? 0).toFixed(2)}
                    </span>
                  </span>
                </div>
              </div>

              <div className="flex gap-2 rounded-lg bg-muted p-0.5">
                <button
                  type="button"
                  onClick={() => setStartCountType("cashDenominations")}
                  className={`flex-1 rounded-[7px] py-1.5 text-sm font-semibold transition-colors ${
                    startCountType === "cashDenominations"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-background/60"
                  }`}
                >
                  Cash Denominations
                </button>
                <button
                  type="button"
                  onClick={() => setStartCountType("flatUpdate")}
                  className={`flex-1 rounded-[7px] py-1.5 text-sm font-semibold transition-colors ${
                    startCountType === "flatUpdate"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-background/60"
                  }`}
                >
                  Flat Update
                </button>
              </div>

              {startCountType === "cashDenominations" ? (
                <DenominationGrid
                  values={startDenomValues}
                  onChange={(k, v) => setStartDenomValues((p) => ({ ...p, [k]: v }))}
                />
              ) : (
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={startFlatCash}
                  onChange={(e) => setStartFlatCash(e.target.value)}
                />
              )}

              <div className="flex items-center justify-between rounded-lg bg-foreground px-4 py-3 text-background">
                <span className="text-sm font-semibold">Total Opening Amount</span>
                <span className="text-lg font-bold">${startTotal.toFixed(2)}</span>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">
                  Notes (Optional)
                </label>
                <textarea
                  rows={3}
                  className="w-full resize-none rounded-md border border-input bg-transparent p-2 text-sm"
                  placeholder="Add any notes about starting the drawer…"
                  value={startNotes}
                  onChange={(e) => setStartNotes(e.target.value)}
                />
              </div>

              <Button
                className="w-full"
                disabled={starting}
                onClick={handleSubmitStartDrawer}
              >
                {starting ? "Starting…" : "Start Drawer"}
              </Button>
            </div>
          )}

          {step === "close" && !closeBalanced && (
            <div className="space-y-4">
              <div className="flex justify-end gap-2">
                <Button
                  size="sm"
                  className="bg-emerald-600 text-white hover:bg-emerald-700"
                  onClick={() => openAdjustForm("deposit")}
                >
                  Deposit Cash
                </Button>
                <Button
                  size="sm"
                  className="bg-amber-600 text-white hover:bg-amber-700"
                  onClick={() => openAdjustForm("withdraw")}
                >
                  Withdraw Cash
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="mb-1 font-semibold text-muted-foreground">Expected Cash</p>
                  <p className="text-base font-bold">${expectedCashAmount.toFixed(2)}</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="mb-1 font-semibold text-muted-foreground">Expected Virtual</p>
                  <p className="text-base font-bold">${expectedVirtualAmount.toFixed(2)}</p>
                </div>
              </div>

              <div className="flex gap-2 rounded-lg bg-muted p-0.5">
                <button
                  type="button"
                  onClick={() => setCloseCountType("cashDenominations")}
                  className={`flex-1 rounded-[7px] py-1.5 text-sm font-semibold transition-colors ${
                    closeCountType === "cashDenominations"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-background/60"
                  }`}
                >
                  Cash Denominations
                </button>
                <button
                  type="button"
                  onClick={() => setCloseCountType("flatUpdate")}
                  className={`flex-1 rounded-[7px] py-1.5 text-sm font-semibold transition-colors ${
                    closeCountType === "flatUpdate"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-background/60"
                  }`}
                >
                  Flat Update
                </button>
              </div>

              {closeCountType === "cashDenominations" ? (
                <DenominationGrid
                  values={closeDenomValues}
                  onChange={(k, v) => setCloseDenomValues((p) => ({ ...p, [k]: v }))}
                />
              ) : (
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={closeFlatCash}
                  onChange={(e) => setCloseFlatCash(e.target.value)}
                />
              )}

              <div className="flex items-center justify-between rounded-lg bg-foreground px-4 py-3 text-background">
                <span className="text-sm font-semibold">Cash Counted</span>
                <span className="text-lg font-bold">${closeCashTotal.toFixed(2)}</span>
              </div>
              {cashMismatch && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-destructive">
                    Cash Adjustment Reason (required)
                  </label>
                  <textarea
                    rows={2}
                    className="w-full resize-none rounded-md border border-input bg-transparent p-2 text-sm"
                    placeholder="Reason for cash adjustment…"
                    value={cashAdjustmentReason}
                    onChange={(e) => setCashAdjustmentReason(e.target.value)}
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">
                  Virtual Counted
                </label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={closingVirtualBalance}
                  onChange={(e) => setClosingVirtualBalance(e.target.value)}
                />
              </div>
              {virtualMismatch && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-destructive">
                    Virtual Adjustment Reason (required)
                  </label>
                  <textarea
                    rows={2}
                    className="w-full resize-none rounded-md border border-input bg-transparent p-2 text-sm"
                    placeholder="Reason for virtual adjustment…"
                    value={virtualAdjustmentReason}
                    onChange={(e) => setVirtualAdjustmentReason(e.target.value)}
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">
                  Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  className="w-full resize-none rounded-md border border-input bg-transparent p-2 text-sm"
                  placeholder="Add any additional notes about the drawer balance…"
                  value={closeNotes}
                  onChange={(e) => setCloseNotes(e.target.value)}
                />
              </div>

              <Button
                className="w-full"
                disabled={closing}
                onClick={handleSubmitCloseDrawer}
              >
                {closing ? "Balancing Drawer…" : "Balance Drawer"}
              </Button>
            </div>
          )}

          {step === "close" && closeBalanced && (
            <div className="space-y-4 py-6 text-center">
              <CheckCircle2 className="mx-auto size-10 text-green-600" />
              <p className="text-sm font-semibold">
                Drawer has been balanced successfully.
              </p>
              <Button onClick={() => setStep("drawer")}>Done</Button>
            </div>
          )}
        </div>
      </div>
    </Drawer>
  );
}
