"use client";

import { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { Minus, Plus, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import SkeletonLoader from "@/components/pos/SkeletonLoader";
import { getSingleProduct } from "@/services/products/getSingleProduct";

const defaultImage = "/images/placeholders/product.svg";
// Big, unmissable touch targets — the shadcn "icon" size defaults to a
// smaller ~32px, and even the previous 40px was called out as too small to
// reliably hit on a tablet.
const STEPPER_BTN = "size-16";

function relativeTime(dateStr) {
  if (!dateStr) return "-";
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diffMs / 86400000);
  if (days <= 0) return "today";
  if (days === 1) return "1 day ago";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months > 1 ? "s" : ""} ago`;
  const years = Math.floor(months / 12);
  return `${years} year${years > 1 ? "s" : ""} ago`;
}

function StatBlock({ label, value, color = undefined }: any) {
  return (
    <div className="rounded-xl border border-border bg-muted px-3 py-2.5">
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p
        className="m-0 text-sm font-bold"
        style={color ? { color } : undefined}>
        {value}
      </p>
    </div>
  );
}

function QuantityStepper({
  pkg,
  quantity,
  isDecimalAllowed,
  exceeds,
  onDelta,
  onInput,
  size = "default",
}) {
  const btnSize = size === "lg" ? "size-16" : STEPPER_BTN;
  const iconSize = size === "lg" ? "size-6" : "size-5";
  const inputClass =
    size === "lg"
      ? "h-16 w-24 text-center text-2xl font-bold"
      : "h-16 w-20 text-center text-lg font-semibold";
  return (
    <div className="flex items-center justify-end gap-2">
      <Button
        size="icon"
        variant="secondary"
        className={btnSize}
        onClick={() => onDelta(pkg.id, isDecimalAllowed ? -0.25 : -1)}>
        <Minus className={iconSize} />
      </Button>
      <Input
        value={quantity}
        onFocus={(e) => e.target.select()}
        onChange={(e) => onInput(pkg.id, e.target.value)}
        inputMode={isDecimalAllowed ? "decimal" : "numeric"}
        className={`${inputClass} ${exceeds ? "border-destructive" : ""}`}
      />
      <Button
        size="icon"
        variant="secondary"
        className={btnSize}
        onClick={() => onDelta(pkg.id, isDecimalAllowed ? 0.25 : 1)}>
        <Plus className={iconSize} />
      </Button>
    </div>
  );
}

/**
 * Full-panel product detail — ported from PosTabletMode/ProductDetailsPage.jsx.
 * Replaces the grid/list in place (filter bar above stays mounted) rather
 * than opening in a side drawer: image + THC/CBD badges, a Price/Total
 * QTY/Sellable QTY/Weight stat row, strains, a package table with
 * per-location quantity columns, a quantity control (single stepper for one
 * package, a per-row column when there are several — matching the old
 * `columns2` table), stock-exceeds warnings, an "already in cart" banner,
 * and a full-width "Add to Cart · $total" button.
 */
export default function ProductDetailPanel({
  product,
  packagesData,
  locationColumns,
  isLoading,
  selectedRowKeys,
  setSelectedRowKeys,
  quantities,
  setQuantities,
  onQuantityDelta,
  onQuantityInput,
  onBack,
  onAddToCart,
}) {
  const cart = useSelector((state: any) => state?.cart?.cart) || [];
  const [productDetails, setProductDetails] = useState(null);
  const [showAllStrains, setShowAllStrains] = useState(false);
  const [hasAddedPackages, setHasAddedPackages] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    setProductDetails(null);
    setShowAllStrains(false);
    setHasAddedPackages(false);
    if (!product?.productId) return;
    getSingleProduct(product.productId)
      .then((res) => {
        if (!mountedRef.current) return;
        setProductDetails(res?.data?.data?.product || null);
      })
      .catch(() => {});
  }, [product?.productId]);

  // Auto-select the only package, matching the old page's behaviour.
  useEffect(() => {
    if (packagesData.length === 1) {
      const pkg = packagesData[0];
      setSelectedRowKeys([pkg.key]);
      setQuantities((prev) =>
        prev[pkg.key] ? prev : { ...prev, [pkg.key]: 1 },
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [packagesData]);

  const toggleSelect = (pkg) =>
    setSelectedRowKeys((keys) =>
      keys.includes(pkg.key)
        ? keys.filter((k) => k !== pkg.key)
        : [...keys, pkg.key],
    );

  const packageUnitPrice = Number(packagesData?.[0]?.price);
  const fallbackUnitPrice = Number(product?.unitPrice ?? 0);
  const effectiveUnitPrice =
    Number.isFinite(packageUnitPrice) && packageUnitPrice > 0
      ? packageUnitPrice
      : fallbackUnitPrice;
  const conversionRate = Number(product?.projectQtyConversionRate);
  const displayPrice =
    Number.isFinite(conversionRate) && conversionRate > 0
      ? conversionRate * effectiveUnitPrice
      : effectiveUnitPrice;

  const totalQtyText =
    conversionRate > 0
      ? `${(product.totalQuantity / conversionRate).toFixed(2)} ${product.projectQtyUomShortForm} (${product.totalQuantity} ${product.sellableUoMShortForm})`
      : `${Number(product?.totalQuantity ?? 0).toFixed(2)} ${product?.sellableUoMShortForm ?? ""}`;

  const sellableQtyText =
    (conversionRate > 0
      ? (product.totalQuantity / conversionRate).toFixed(2)
      : Number(product?.totalActiveQuantity ?? 0).toFixed(2)) +
    " " +
    (conversionRate > 0
      ? product.projectQtyUomShortForm
      : (product?.sellableUoMShortForm ?? ""));

  const thcValue = product?.productInfo?.cannabisProductData?.thcData?.value;
  const cbdValue = product?.productInfo?.cannabisProductData?.cbdData?.value;
  const imgUrl =
    product?.productInfo?.images?.[0]?.url ||
    (typeof product?.images?.[0] === "string"
      ? product.images[0]
      : product?.images?.[0]?.url);

  const strains = productDetails?.strains ?? [];
  const visibleStrains = showAllStrains ? strains : strains.slice(0, 6);

  const selectedRecord = packagesData.find(
    (item) => item.key === selectedRowKeys[0],
  );
  const isMultiPackage = packagesData.length >= 2;

  const calculateTotalPrice = () =>
    selectedRowKeys.reduce((total, key) => {
      const pkg = packagesData.find((item) => item.key === key);
      const qty = quantities[key] ?? 1;
      return total + (pkg ? (Number(pkg.price) || 0) * qty : 0);
    }, 0);

  const existingPackages = packagesData.filter((pkg) =>
    cart.some((item) => item.id === pkg.id),
  );

  const handleAddClick = () => {
    const allSelectedAlreadyInCart =
      selectedRowKeys.length > 0 &&
      selectedRowKeys.every((key) => {
        const pkg = packagesData.find((item) => item.key === key);
        return pkg && cart.some((item) => item.id === pkg.id);
      });
    if (allSelectedAlreadyInCart) setHasAddedPackages(true);
    onAddToCart();
  };

  const statBlocks = [
    {
      label: "Price",
      value: `$${displayPrice.toFixed(2)}`,
      color: "var(--color-primary)",
    },
    { label: "Total QTY", value: totalQtyText },
    { label: "Sellable QTY", value: sellableQtyText },
    {
      label: "Weight",
      value: productDetails?.unitWeight
        ? `${productDetails.unitWeight} ${productDetails?.unitWeightUom?.shortForm ?? ""}`
        : "-",
    },
  ];

  return (
    <div className="pb-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <h2 className="text-lg font-semibold leading-tight md:text-xl">
          {product?.productName ?? "-"}
        </h2>
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
      </div>

      {hasAddedPackages && existingPackages.length > 0 && (
        <div className="mb-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          Already in cart:{" "}
          {existingPackages.map((p) => p.name || p.advertisedId).join(", ")}
        </div>
      )}

      <div className="mb-4 flex flex-col gap-4 md:flex-row">
        <div className="relative h-[220px] w-full shrink-0 overflow-hidden rounded-xl border border-border md:h-[260px] md:w-[260px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imgUrl || defaultImage}
            alt={product?.productName || ""}
            className="h-full w-full object-cover"
            onError={(e) => {
              e.currentTarget.src = defaultImage;
            }}
          />
          <div className="absolute left-2.5 top-2.5 flex gap-1.5">
            {thcValue > 0 && (
              <span className="rounded-md bg-green-600 px-2 py-1 text-[11px] font-bold text-white">
                THC: {thcValue}
              </span>
            )}
            {cbdValue > 0 && (
              <span className="rounded-md bg-blue-600 px-2 py-1 text-[11px] font-bold text-white">
                CBD: {cbdValue}
              </span>
            )}
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div
            className={`grid grid-cols-2 gap-2 sm:grid-cols-3 ${strains.length > 0 ? "xl:grid-cols-5" : "xl:grid-cols-4"}`}>
            {statBlocks.map((b) => (
              <StatBlock key={b.label} {...b} />
            ))}

            {strains.length > 0 && (
              <div className="rounded-xl border border-border bg-muted px-3 py-2.5">
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Strains
                </p>
                <div className="flex flex-wrap gap-1">
                  {visibleStrains.map((s, i) => (
                    <Badge key={i} variant="secondary">
                      {s.name}
                    </Badge>
                  ))}
                </div>
                {strains.length > 6 && (
                  <button
                    type="button"
                    className="mt-1.5 text-xs font-semibold text-primary"
                    onClick={() => setShowAllStrains((v) => !v)}>
                    {showAllStrains
                      ? "Show less"
                      : `+${strains.length - 6} more — Show all`}
                  </button>
                )}
              </div>
            )}
          </div>

          {packagesData.length === 1 &&
            selectedRecord &&
            (() => {
              const qty = quantities[selectedRecord.key] ?? 1;
              const exceeds =
                selectedRecord?.quantityLeft != null &&
                qty > selectedRecord.quantityLeft;
              const unitPrice = Number(selectedRecord.price) || 0;
              const lineTotal = unitPrice * qty;
              return (
                <div className="rounded-xl border border-border bg-muted px-4 py-3.5">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Quantity
                      </p>
                      <p className="m-0 text-sm text-muted-foreground">
                        ${unitPrice.toFixed(2)} each
                      </p>
                    </div>

                    <QuantityStepper
                      pkg={selectedRecord}
                      quantity={qty}
                      isDecimalAllowed={
                        selectedRecord?.shouldAllowDecimalValue ?? false
                      }
                      exceeds={exceeds}
                      onDelta={onQuantityDelta}
                      onInput={onQuantityInput}
                      size="lg"
                    />

                    <div className="text-right">
                      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Line Total
                      </p>
                      <p
                        className="m-0 text-xl font-bold"
                        style={{ color: "var(--color-primary)" }}>
                        ${lineTotal.toFixed(2)}
                      </p>
                    </div>
                  </div>
                  {exceeds && (
                    <p className="mt-2 text-xs font-medium text-destructive">
                      Exceeds available stock ({selectedRecord.quantityLeft}{" "}
                      left)
                    </p>
                  )}
                </div>
              );
            })()}

          <Button
            className="h-16 w-full text-lg font-bold"
            size="lg"
            disabled={selectedRowKeys.length === 0}
            onClick={handleAddClick}>
            <ShoppingCart className="mr-2 size-5" />
            Add to Cart · ${calculateTotalPrice().toFixed(2)}
          </Button>
        </div>
      </div>

      <div className="my-4 border-t border-border" />

      {isLoading ? (
        <SkeletonLoader rows={3} />
      ) : (
        <div className="mb-4 overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left text-muted-foreground">
              <tr>
                <th className="w-8 px-2 py-2" />
                <th className="px-2 py-2">Package ID</th>
                {isMultiPackage && (
                  <th className="px-2 py-2 text-right">Quantity</th>
                )}
                <th className="px-2 py-2">Expiry</th>
                <th className="px-2 py-2">Created At</th>
                {locationColumns.map((loc) => (
                  <th key={loc.id} className="px-2 py-2">
                    {loc.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {packagesData.map((pkg) => {
                const selected = selectedRowKeys.includes(pkg.key);
                const qty = quantities[pkg.key] ?? 1;
                const exceeds =
                  pkg?.quantityLeft != null && qty > pkg.quantityLeft;
                return (
                  <tr key={pkg.key} className="border-t border-border">
                    <td className="px-2 py-2">
                      <input
                        type="checkbox"
                        checked={selected}
                        disabled={packagesData.length === 1 && selected}
                        onChange={() => toggleSelect(pkg)}
                      />
                    </td>
                    <td className="px-2 py-2">{pkg.advertisedId}</td>
                    {isMultiPackage && (
                      <td className="px-2 py-2">
                        {selected && (
                          <QuantityStepper
                            pkg={pkg}
                            quantity={qty}
                            isDecimalAllowed={
                              pkg?.shouldAllowDecimalValue ?? false
                            }
                            exceeds={exceeds}
                            onDelta={onQuantityDelta}
                            onInput={onQuantityInput}
                          />
                        )}
                      </td>
                    )}
                    <td className="px-2 py-2">
                      {pkg.expiry
                        ? new Date(pkg.expiry).toLocaleDateString()
                        : "-"}
                    </td>
                    <td className="px-2 py-2">{relativeTime(pkg.createdAt)}</td>
                    {locationColumns.map((loc) => {
                      // Per-package breakdown is a plain { [locationId]: quantity }
                      // map (ListAllPackagesQuery), not an array like the
                      // inventory-level breakdown used for locationColumns' names.
                      const locQty = (pkg.storageLocationBreakdown || {})[
                        loc.id
                      ];
                      return (
                        <td key={loc.id} className="px-2 py-2">
                          {Number(locQty ?? 0).toFixed(2)}{" "}
                          {pkg.sellableUomShortForm ??
                            pkg.sellableUoMShortForm ??
                            ""}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
              {packagesData.length === 0 && (
                <tr>
                  <td
                    colSpan={
                      4 + (isMultiPackage ? 1 : 0) + locationColumns.length
                    }
                    className="px-2 py-4 text-center text-muted-foreground">
                    No packages available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
