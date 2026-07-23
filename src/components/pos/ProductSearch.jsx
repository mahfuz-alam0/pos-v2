"use client";

import { useState } from "react";
import { useSelector } from "react-redux";

import { Button } from "@/components/ui/button";
import Drawer from "@/components/ui/Drawer";
import ScanInput from "@/components/pos/ScanInput";
import ProductSearchDropdown from "@/components/pos/ProductSearchDropdown";
import ProductList from "@/components/pos/ProductList";
import ProductsCart from "@/components/pos/ProductsCart";

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
  const saleDetail = useSelector((state) => state?.saleData) || {};
  const isLocked = Object.keys(saleDetail).length > 0;

  return (
    <div className="px-0">
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
              setManageCartOpen(true);
            }}
          />
        </div>
        <Button
          className="h-10 min-w-[180px] px-6"
          disabled={isLocked}
          onClick={() => setManageCartOpen(true)}
        >
          Manage Cart Items
        </Button>
      </div>

      <div className="mt-2">
        <ProductsCart />
      </div>

      <Drawer
        open={manageCartOpen}
        onClose={() => {
          setManageCartOpen(false);
          setAutoOpenProduct(null);
        }}
        side="right"
        size="min(90vw, 1100px)"
      >
        <div className="flex h-full flex-col p-4">
          <div className="mb-3 text-lg font-semibold">Manage Cart Items</div>
          <div className="flex-1 overflow-auto">
            <ProductList
              setAddSelected={setAddSelected}
              setMiscallenousType={setMiscallenousType}
              setNotes={setNotes}
              notes={notes}
              discountTypes={discountTypes}
              initialView="grid"
              autoOpenProduct={autoOpenProduct}
              showFooterActions={false}
            />
          </div>
        </div>
      </Drawer>
    </div>
  );
}
