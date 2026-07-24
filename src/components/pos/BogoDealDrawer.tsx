"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  ShoppingCart,
  Gift,
  ChevronLeft,
  Minus,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Drawer from "@/components/ui/Drawer";

/**
 * BOGO deal construction drawer. The user picks Buy product(s) and Get
 * product(s) with quantities; the deal can only be applied when the selected
 * buy/get quantities EXACTLY match the deal's required buy/get quantities
 * (buyMinimumExactQuantity / getProductQuantity). On Continue it calls back with
 * { dealId, dealName, buyProducts, getProducts, bogoDealInfo } — BogoDealCard
 * turns that into the bundledLineItems.
 *
 * Props:
 *   visible     — open state.
 *   onClose     — close handler.
 *   dealData    — { dealId, dealName, bogoDealInfo, buyProducts[], getProducts[] }.
 *   onApplyDeal — receives the deal application payload above.
 *   loading     — disables Continue and shows a loading state.
 *
 * ponytail: the old drawer also discovered buy/get products by category/brand
 * scope via GetInventories + ProductsPopupProductCard/ProductDetailsPage. Those
 * services and card components are not in this project, so product discovery
 * renders directly from the buy/get candidates BogoDealCard already resolves
 * (SELF + OTHER_DEFINED by id). Add category/brand discovery when GetInventories
 * and the product-card subtree are ported.
 */
export default function BogoDealDrawer({
  visible,
  onClose,
  dealData,
  onApplyDeal,
  loading = false,
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBuyProducts, setSelectedBuyProducts] = useState([]);
  const [selectedGetProducts, setSelectedGetProducts] = useState([]);
  const [buyQuantities, setBuyQuantities] = useState({});
  const [getQuantities, setGetQuantities] = useState({});

  // Reset selection whenever the drawer opens/closes.
  useEffect(() => {
    if (!visible) {
      setSearchTerm("");
      setSelectedBuyProducts([]);
      setSelectedGetProducts([]);
      setBuyQuantities({});
      setGetQuantities({});
    }
  }, [visible]);

  const isSelfDeal = dealData?.bogoDealInfo?.getProductType === "SELF";

  // Candidate lists. For SELF deals the "get" options mirror the products the
  // user has added to buy (old behavior).
  const buyCandidates = useMemo(
    () =>
      (dealData?.buyProducts || []).filter((p) =>
        (p.productName || "")
          .toLowerCase()
          .includes(searchTerm.toLowerCase())
      ),
    [dealData, searchTerm]
  );

  const getCandidates = useMemo(() => {
    if (isSelfDeal) {
      return selectedBuyProducts
        .filter((p) =>
          (p.productName || "").toLowerCase().includes(searchTerm.toLowerCase())
        )
        .map((p) => ({ ...p, isDealGetProduct: true, isDealBuyProduct: false }));
    }
    return (dealData?.getProducts || []).filter((p) =>
      (p.productName || "").toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [isSelfDeal, selectedBuyProducts, dealData, searchTerm]);

  const handleBuyProductSelect = useCallback((product, quantity = 1) => {
    setSelectedBuyProducts((prev) => {
      const exists = prev.find((p) => p.productId === product.productId);
      if (exists) {
        const newQuantity = exists.quantity + quantity;
        return prev.map((p) =>
          p.productId === product.productId
            ? { ...p, quantity: newQuantity }
            : p
        );
      }
      return [...prev, { ...product, quantity }];
    });
    setBuyQuantities((prev) => ({
      ...prev,
      [product.productId]: (prev[product.productId] || 0) + quantity,
    }));
    toast.success(`Added ${product.productName} to buy products`);
  }, []);

  const handleGetProductSelect = useCallback((product, quantity = 1) => {
    setSelectedGetProducts((prev) => {
      const exists = prev.find((p) => p.productId === product.productId);
      if (exists) {
        const newQuantity = exists.quantity + quantity;
        return prev.map((p) =>
          p.productId === product.productId
            ? { ...p, quantity: newQuantity }
            : p
        );
      }
      return [...prev, { ...product, quantity }];
    });
    setGetQuantities((prev) => ({
      ...prev,
      [product.productId]: (prev[product.productId] || 0) + quantity,
    }));
    toast.success(`Added ${product.productName} to get products`);
  }, []);

  const handleApply = useCallback(() => {
    if (selectedBuyProducts.length === 0 || selectedGetProducts.length === 0) {
      return;
    }
    onApplyDeal?.({
      dealId: dealData?.dealId,
      dealName: dealData?.dealName,
      buyProducts: selectedBuyProducts,
      getProducts: selectedGetProducts,
      bogoDealInfo: dealData?.bogoDealInfo,
    });
  }, [selectedBuyProducts, selectedGetProducts, dealData, onApplyDeal]);

  // Exact-match gate: selected buy/get totals must equal the deal's required
  // quantities (not just meet a minimum).
  const canApplyDeal = () => {
    const requiredBuyQuantity =
      dealData?.bogoDealInfo?.buyMinimumExactQuantity || 1;
    const requiredGetQuantity =
      dealData?.bogoDealInfo?.getProductQuantity || 1;

    const totalBuyQuantity = selectedBuyProducts.reduce(
      (sum, p) => sum + p.quantity,
      0
    );
    const totalGetQuantity = selectedGetProducts.reduce(
      (sum, p) => sum + p.quantity,
      0
    );

    return (
      selectedBuyProducts.length > 0 &&
      selectedGetProducts.length > 0 &&
      totalBuyQuantity === requiredBuyQuantity &&
      totalGetQuantity === requiredGetQuantity
    );
  };

  const updateQty = (setter) => (productId, packageId, delta, absolute?) => {
    setter((prev) =>
      prev.map((p) =>
        p.productId === productId && p.packageId === packageId
          ? {
              ...p,
              quantity:
                absolute != null
                  ? absolute
                  : Math.max(1, p.quantity + delta),
            }
          : p
      )
    );
  };
  const updateBuyQty = updateQty(setSelectedBuyProducts);
  const updateGetQty = updateQty(setSelectedGetProducts);

  const removeFrom = (setter) => (productId, packageId) =>
    setter((prev) =>
      prev.filter((p) => !(p.productId === productId && p.packageId === packageId))
    );

  const info = dealData?.bogoDealInfo;
  const normalizedDiscountType = String(info?.discountType || "").toUpperCase();
  const rawRate = Number(info?.discountRate ?? 0);
  const discountRate = Number.isFinite(rawRate) ? rawRate : 0;
  const formattedRate = Number.isInteger(discountRate)
    ? discountRate
    : discountRate.toFixed(2);
  const discountDisplayText =
    normalizedDiscountType === "PERCENTAGE"
      ? `${formattedRate}% OFF`
      : `$${formattedRate} OFF`;

  const requirementBanner = (selected, required, noun) => {
    const currentTotalQty = selected.reduce((sum, p) => sum + p.quantity, 0);
    const met = currentTotalQty >= required;
    return (
      <div
        className={`mb-3 rounded-md px-3 py-2 text-xs font-medium text-white ${
          met ? "bg-[#52c41a]" : "bg-[#faad14]"
        }`}
      >
        {met ? "✓" : "⚠"} {currentTotalQty}/{required} {noun} required
        {!met && (
          <div className="mt-0.5 text-[10px] opacity-80">
            Add {required - currentTotalQty} more product(s) or increase quantity
          </div>
        )}
      </div>
    );
  };

  const ProductGridCard = ({ product, color, label, Icon, onAdd }) => (
    <div className="relative rounded-lg border border-border bg-white p-3 text-sm shadow-sm">
      <div className="mb-1 truncate font-medium" title={product.productName}>
        {product.productName}
      </div>
      <div className="text-xs text-muted-foreground">
        ${Number(product.price || product.unitPrice || 0).toFixed(2)}
      </div>
      <button
        onClick={onAdd}
        className="mt-2 flex items-center gap-1 rounded px-2 py-1 text-xs font-semibold text-white"
        style={{ background: color }}
      >
        <Icon className="size-3" />
        {label}
      </button>
    </div>
  );

  const CartRow = ({ product, index, onDec, onInc, onSet, onRemove }) => {
    const totalPrice = (product.quantity * (product.price || 0)).toFixed(2);
    return (
      <div
        key={`${product.productId}_${product.packageId || index}`}
        className="mb-2 rounded-lg bg-[#00152A] p-3 text-white"
      >
        <div className="flex items-center justify-between">
          <div className="flex max-w-[70%] flex-col" title={product.productName}>
            <span className="w-[200px] truncate">{product.productName}</span>
            <span className="text-sm text-gray-400">
              Quantity:{" "}
              <span className="text-white">
                {product.quantity} x ${product.price?.toFixed(2) || "0.00"} = $
                {totalPrice}
              </span>
            </span>
          </div>
          <span className="font-semibold">${totalPrice}</span>
        </div>
        <div className="mt-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-white">
              <b>Quantity:</b>
            </span>
            <button
              onClick={onDec}
              className="flex size-8 items-center justify-center rounded bg-[#434343]"
            >
              <Minus className="size-3 text-white" />
            </button>
            <Input
              value={product.quantity}
              onChange={(e) => onSet(parseInt(e.target.value) || 1)}
              onFocus={(e) => e.target.select()}
              inputMode="numeric"
              className="w-[55px] bg-transparent text-center text-white"
            />
            <button
              onClick={onInc}
              className="flex size-8 items-center justify-center rounded bg-[#434343]"
            >
              <Plus className="size-3 text-white" />
            </button>
          </div>
          <button
            onClick={onRemove}
            className="flex size-8 items-center justify-center rounded bg-[#DC2627]"
          >
            <Trash2 className="size-3 text-white" />
          </button>
        </div>
        {product.packageName && (
          <div className="mt-1 text-sm text-gray-400">
            Package: {product.packageName}
          </div>
        )}
      </div>
    );
  };

  return (
    <Drawer open={visible} onClose={onClose} side="right" size={900} className="max-w-[95vw]">
      <div className="flex h-full flex-col">
        {/* Header */}
        <div
          className="flex flex-shrink-0 items-center justify-between px-4 py-3"
          style={{ background: "#00152A" }}
        >
          <div className="flex flex-1 items-center gap-6">
            <Input
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-[300px] bg-white"
            />
            <div className="rounded-lg border border-white/30 bg-white/20 px-4 py-2 text-lg font-bold text-white">
              {dealData?.dealName || "BOGO Deal"}
            </div>
          </div>

          <div className="flex items-center gap-6">
            {info && (
              <div className="flex items-center gap-3 rounded-xl border border-blue-500 px-4 py-3 text-sm">
                <span className="flex items-center gap-2 font-medium text-green-700">
                  <span className="size-3 rounded-full bg-green-500" />
                  Buy {info.buyMinimumExactQuantity || 1}
                </span>
                <span className="text-gray-400">•</span>
                <span className="flex items-center gap-2 font-medium text-orange-700">
                  <span className="size-3 rounded-full bg-orange-500" />
                  Get {info.getProductQuantity || 1}
                </span>
                <span className="text-gray-400">•</span>
                <span className="rounded-lg bg-red-100 px-2 py-1 text-xs font-semibold text-red-700">
                  {discountDisplayText} ({normalizedDiscountType || "FLAT"})
                </span>
                <span className="text-gray-400">•</span>
                <span className="rounded-lg bg-purple-100 px-2 py-1 text-xs font-medium text-purple-700">
                  {info.getProductType}
                </span>
              </div>
            )}
            <button
              onClick={onClose}
              className="flex items-center justify-center rounded bg-[#038FDE] px-3 py-2"
            >
              <ChevronLeft className="size-4 text-white" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left: product grids */}
          <div className="flex-1 overflow-y-auto bg-[#f5f5f5] p-4">
            {loading && (
              <div className="my-4 rounded-lg bg-white p-5 text-center text-muted-foreground">
                Loading product data...
              </div>
            )}

            {/* Buy section */}
            <div className="mb-6 rounded-xl border-l-4 border-green-500 bg-gradient-to-r from-green-50 to-green-100 p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-green-500 p-2">
                  <ShoppingCart className="size-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-green-700">
                    Choose Buy Product(s)
                  </h3>
                  <p className="text-sm text-green-600">
                    Select products you need to purchase to qualify for this deal
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-4">
              {buyCandidates.map((product) => (
                <ProductGridCard
                  key={product.productId}
                  product={product}
                  color="#52c41a"
                  label="Buy"
                  Icon={ShoppingCart}
                  onAdd={() =>
                    handleBuyProductSelect(
                      { ...product, price: product.price || product.unitPrice || 0 },
                      buyQuantities[product.productId] || 1
                    )
                  }
                />
              ))}
            </div>

            {/* Get section */}
            <div className="mb-6 mt-8 rounded-xl border-l-4 border-orange-500 bg-gradient-to-r from-orange-50 to-orange-100 p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-orange-500 p-2">
                  <Gift className="size-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-orange-700">
                    {isSelfDeal
                      ? "Same Products (Get Discount)"
                      : "Available Discounted Products (Get)"}
                  </h3>
                  <p className="text-sm text-orange-600">
                    {isSelfDeal
                      ? "Select from the products you've added to buy above to get them at a discount"
                      : "Select products you'll get at a discount with this deal"}
                  </p>
                </div>
              </div>
            </div>

            {getCandidates.length === 0 && isSelfDeal && (
              <div className="py-8 text-center text-gray-500">
                <p className="mb-2 text-lg">No products available for discount yet</p>
                <p className="text-sm">
                  Add products to your purchase above first, then they will appear
                  here for you to select for discount
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-4">
              {getCandidates.map((product) => (
                <ProductGridCard
                  key={product.productId}
                  product={product}
                  color="#ff9f43"
                  label="Get"
                  Icon={Gift}
                  onAdd={() =>
                    handleGetProductSelect(
                      { ...product, price: product.price || product.unitPrice || 0 },
                      getQuantities[product.productId] || 1
                    )
                  }
                />
              ))}
            </div>
          </div>

          {/* Right: cart sidebar */}
          <div
            className="flex w-[360px] flex-col overflow-y-auto"
            style={{ background: "#001529" }}
          >
            {/* Buy products */}
            <div className="border-b border-white/10 p-4">
              <div className="mb-4 flex items-center">
                <ShoppingCart className="mr-2 size-4 text-white" />
                <span className="text-lg font-bold text-white">Buy Products</span>
              </div>
              {info &&
                requirementBanner(
                  selectedBuyProducts,
                  info.buyMinimumExactQuantity || 1,
                  "products"
                )}
              {selectedBuyProducts.length > 0 ? (
                selectedBuyProducts.map((product, index) => (
                  <CartRow
                    key={`${product.productId}_${product.packageId || index}`}
                    product={product}
                    index={index}
                    onDec={() =>
                      updateBuyQty(product.productId, product.packageId, -1)
                    }
                    onInc={() =>
                      updateBuyQty(product.productId, product.packageId, 1)
                    }
                    onSet={(v) =>
                      updateBuyQty(product.productId, product.packageId, 0, v)
                    }
                    onRemove={() =>
                      removeFrom(setSelectedBuyProducts)(
                        product.productId,
                        product.packageId
                      )
                    }
                  />
                ))
              ) : (
                <div className="py-5 text-center text-gray-500">
                  No products selected for purchase
                </div>
              )}
            </div>

            {/* Get products */}
            <div className="border-b border-white/10 p-4">
              <div className="mb-4 flex items-center">
                <Gift className="mr-2 size-4 text-white" />
                <span className="text-lg font-bold text-white">Get Products</span>
              </div>
              {info &&
                requirementBanner(
                  selectedGetProducts,
                  info.getProductQuantity || 1,
                  "discounted products"
                )}
              {selectedGetProducts.length > 0 ? (
                selectedGetProducts.map((product, index) => (
                  <CartRow
                    key={`${product.productId}_${product.packageId || index}`}
                    product={product}
                    index={index}
                    onDec={() =>
                      updateGetQty(product.productId, product.packageId, -1)
                    }
                    onInc={() =>
                      updateGetQty(product.productId, product.packageId, 1)
                    }
                    onSet={(v) =>
                      updateGetQty(product.productId, product.packageId, 0, v)
                    }
                    onRemove={() =>
                      removeFrom(setSelectedGetProducts)(
                        product.productId,
                        product.packageId
                      )
                    }
                  />
                ))
              ) : (
                <div className="py-5 text-center text-gray-500">
                  No discounted products selected
                </div>
              )}
            </div>

            {/* Continue */}
            <div className="p-4">
              <Button
                onClick={handleApply}
                disabled={!canApplyDeal() || loading}
                className="h-10 w-full text-base font-bold"
              >
                Continue
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Drawer>
  );
}
