"use client";

import { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { ArrowLeft, CheckCircle2, Inbox, Monitor } from "lucide-react";
import Drawer from "@/components/ui/Drawer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { listRegisters } from "@/services/registers/listRegisters";
import { getAllPaginatedRegisterDrawer } from "@/services/registers/getRegisterDrawer";
import { getQuoteForSales } from "@/services/sales/getQuoteforSales";
import { quoteApiManager } from "@/utils/quoteApiManager";
import { updateSalesDetail } from "@/store/slices/salesDetailSlice";
import { getQuoteForSale } from "@/store/slices/quoteForSaleSlice";

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
 * Not ported (flagged): the Start Drawer / Close Drawer flows and the printer
 * selection modal depend on unmigrated subtrees (openRegister/closeRegister,
 * PrinterSelectionModal, usePrintClients). Closed drawers therefore show a
 * hint instead of an inline Start button.
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

    localStorage.setItem("registerId", selectedRegister.id);
    localStorage.setItem("registerName", regName);
    localStorage.setItem("drawerId", drawer.id);
    localStorage.setItem("drawerName", drawerName);

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

    window.dispatchEvent(
      new CustomEvent("registerDrawerSelected", {
        detail: {
          registerId: selectedRegister.id,
          registerName: regName,
          drawerId: drawer.id,
          drawerName,
        },
      })
    );

    close();
  };

  const currentRegisterId =
    typeof window !== "undefined" ? localStorage.getItem("registerId") : null;
  const currentDrawerId =
    typeof window !== "undefined" ? localStorage.getItem("drawerId") : null;

  return (
    <Drawer open={open} onClose={close} side="right" size={560} zIndex={10000}>
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          {step === "drawer" && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setStep("register")}
            >
              <ArrowLeft />
            </Button>
          )}
          <span className="text-[15px] font-semibold">
            {step === "register"
              ? "Select Register"
              : `Select Drawer — ${selectedRegister?.name}`}
          </span>
        </div>

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
                            : "border-transparent bg-muted hover:bg-muted/70"
                        }`}
                      >
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-background">
                          <Monitor className="size-4 text-muted-foreground" />
                        </span>
                        <span className="min-w-0 flex-1 truncate font-medium">
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
                      <button
                        onClick={() => isOpen && handleSelectDrawer(drawer)}
                        disabled={!isOpen}
                        className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
                          isOpen && isActive
                            ? "border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-950"
                            : isOpen
                            ? "border-transparent bg-muted hover:bg-muted/70"
                            : "cursor-default border-destructive/30 bg-destructive/5"
                        }`}
                      >
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-background">
                          <Inbox
                            className={`size-4 ${
                              isOpen
                                ? "text-muted-foreground"
                                : "text-destructive"
                            }`}
                          />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">
                            {drawer.name}
                          </span>
                          {!isOpen && (
                            <span className="mt-0.5 block text-xs text-destructive">
                              Drawer is closed — open it from Registers to
                              continue
                            </span>
                          )}
                        </span>
                        {isOpen && (
                          <>
                            <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                              Open
                            </Badge>
                            {isActive && (
                              <CheckCircle2 className="size-4 text-green-600" />
                            )}
                          </>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>
      </div>
    </Drawer>
  );
}
