"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import Drawer from "@/components/ui/Drawer";
import ScanInput from "@/components/pos/ScanInput";
import ProductSearchDropdown from "@/components/pos/ProductSearchDropdown";
import ProductList from "@/components/pos/ProductList";
import ProductsCart from "@/components/pos/ProductsCart";
import CustomerCartSidebar from "@/components/pos/CustomerCartSidebar";

// Ported from posModule/components/products-cart.js's top search bar — the
// original POS never had a "Barcode Mode / Product Mode" toggle; the scan
// input and the product typeahead are both always visible side by side,
// next to "Manage Cart Items". (That toggle was this port's own invention
// and has been removed to match.)
export default function ProductSearch({
  setAddSelected,
  setMiscallenousType,
  setNotes,
  notes,
  discountTypes = [],
}) {
  const [manageCartOpen, setManageCartOpen] = useState(false);
  const [autoOpenProduct, setAutoOpenProduct] = useState(null);
  const [cartPanelOpen, setCartPanelOpen] = useState(false);
  // Drawer keeps its children mounted (CSS-only slide), so ProductList never
  // remounts on its own between opens. Passed to ProductList as
  // `refreshSignal` — bumping it re-fetches stock in place (no unmount, so
  // no flash/flicker while the drawer is sliding in) instead of showing
  // whatever quantities were fetched the first time it was opened.
  const [manageCartOpenCount, setManageCartOpenCount] = useState(0);
  const openManageCart = () => {
    setManageCartOpen(true);
    setManageCartOpenCount((c) => c + 1);
  };
  const saleDetail = useSelector((state: any) => state?.saleData) || {};
  const isLocked = Object.keys(saleDetail).length > 0;

  return (
    <div>
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <ScanInput setAddSelected={setAddSelected} />
        </div>
        <div className="flex-1">
          <ProductSearchDropdown
            disabled={isLocked}
            onSelectProduct={(product) => {
              if (isLocked) return;
              setAutoOpenProduct(product);
              openManageCart();
            }}
          />
        </div>
        <Button
          className="h-[39px] min-w-[170px] bg-[#3390DE] px-6 hover:bg-[#3390DE]/90"
          disabled={isLocked}
          onClick={openManageCart}
        >
          Manage Cart Items
        </Button>
      </div>

      {/* Unmounted while "Manage Cart Items" is open — that drawer covers the
          full viewport and (via CustomerCartSidebar) mounts its own
          ProductsCart, so keeping this one alive too just left two live
          instances with diverging local UI state (expanded row, selection). */}
      {!manageCartOpen && (
        <div className="mt-2">
          <ProductsCart />
        </div>
      )}

      <Drawer
        open={manageCartOpen}
        onClose={() => {
          setManageCartOpen(false);
          setAutoOpenProduct(null);
        }}
        side="right"
        size="100vw"
      >
        <div className="flex h-full flex-col p-4">
          <div className="flex flex-1 gap-4 overflow-hidden">
            <div className="min-w-0 flex-1 overflow-hidden">
              <ProductList
                refreshSignal={manageCartOpenCount}
                setAddSelected={setAddSelected}
                setMiscallenousType={setMiscallenousType}
                setNotes={setNotes}
                notes={notes}
                discountTypes={discountTypes}
                initialView="grid"
                autoOpenProduct={autoOpenProduct}
                showFooterActions={false}
                onClose={() => setManageCartOpen(false)}
              />
            </div>
            {/* Cart, collapsed by default — same as the old "View Products" drawer's ProductsPopupSideBar toggle */}
            <button
              type="button"
              onClick={() => setCartPanelOpen((v) => !v)}
              title={cartPanelOpen ? "Hide cart" : "Show cart"}
              className="flex w-6 shrink-0 items-center justify-center rounded-lg border border-white/20 bg-[#00152B] text-white hover:bg-[#038FDE]"
            >
              {cartPanelOpen ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </button>
            {cartPanelOpen && (
              <div
                data-mode="dark"
                className="w-[320px] shrink-0 overflow-auto rounded-lg p-3 text-white xl:w-105"
                style={{ background: "#00152A", border: "1px solid rgba(1,144,221,0.18)" }}
              >
                <CustomerCartSidebar />
              </div>
            )}
          </div>
        </div>
      </Drawer>
    </div>
  );
}
