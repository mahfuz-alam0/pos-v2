"use client";

import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AlertTriangle, Minus, Plus } from "lucide-react";
import { toast } from "sonner";

import Drawer from "@/components/ui/Drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import SkeletonLoader from "@/components/pos/SkeletonLoader";

import { addToCart } from "@/store/slices/cartSlice";
import { addLineItemsAction } from "@/store/slices/lineItemsSlice";
import { updateSalesDetail } from "@/store/slices/salesDetailSlice";
import { getQuoteForSale } from "@/store/slices/quoteForSaleSlice";
import { getQuoteForSales } from "@/services/sales/getQuoteforSales";
import { getInventorySellableViaAdvertisedId } from "@/services/sales/inventorySellableViaAdvertisedId";
import { getShopPreferences } from "@/services/sales/getShopPreferences";
import { listMinimalPackages } from "@/services/packages/listMinimal";
import { getSingleProduct } from "@/services/products/getSingleProduct";
import { quoteApiManager } from "@/utils/quoteApiManager";
import { useShop } from "@/context/shop-context";

const defaultImage = "/images/placeholders/product.svg";

// Ported from ScanInput.js — hardware-barcode scan input driving the
// sellable-package lookup by advertisedId.
//
// The old file listened for rapid keystrokes that a USB/HID barcode scanner
// emits (no camera library) and debounced them; that pattern is preserved
// exactly (300ms debounce, min-5-char trigger, paste handler). No scanning
// dependency is needed — a HID scanner types into this text input like a
// keyboard. Preserved business logic: sellable lookup, scan-only-cart auto-add
// / quantity-increment, decimal (0.25) quantity math, dedup vs cart, and the
// quote refresh via the shared quoteApiManager.
//
// NOT ported (out of the product/cart scope, and depend on unported services):
// matrix product resolution. The breakdown-package fallback
// (listPackagesMinimal) IS implemented — see fetchSellablePackages' fallback
// branch below — but the old app's inline within-store transfer Drawer isn't;
// "Transfer" instead opens the Add Transfer page in a new tab, pre-filled.
export default function ScanInput({
  placeholder = "Scan barcode / package ID",
  className = "",
  // A code captured externally (e.g. a camera-based barcode/QR scan — see
  // BarcodeScanDialog) to feed into this field exactly like a HID scanner
  // keystroke would. Pass { value, nonce } with a fresh nonce per scan (a
  // timestamp works) so scanning the same code twice in a row still fires —
  // a plain string prop wouldn't re-trigger the effect on an unchanged value.
  scannedCode,
}: {
  placeholder?: string;
  className?: string;
  scannedCode?: { value: string; nonce: number } | null;
}) {
  const dispatch = useDispatch();
  const { shopId } = useShop();
  const cart = useSelector((state: any) => state?.cart?.cart) || [];
  const quoteBody = useSelector((state: any) => state?.salesDetail);
  const saleDetail = useSelector((state: any) => state?.saleData) || {};

  const [inputValue, setInputValue] = useState("");
  const [packagesData, setPackagesData] = useState([]);
  const [packagesLoading, setPackagesLoading] = useState(false);
  const [inventoryData, setInventoryData] = useState(null);
  const [visible, setVisible] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [counters, setCounters] = useState({});
  const [scannedPackageId, setScannedPackageId] = useState(null);
  const [shouldEnableScanOnlyCart, setShouldEnableScanOnlyCart] = useState(false);
  // true — every scan/add always creates its own new cart line.
  // false (default, matches the shop preference's default) — scanning/adding
  // a package already in the cart bumps that line's quantity instead of
  // creating a duplicate, preserving its existing appMaintainedId.
  const [shouldAddNewLineItemOnScan, setShouldAddNewLineItemOnScan] = useState(false);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  // Populated when nothing sellable matched the scanned code — every
  // non-finished package on the same product, so the cashier can see what's
  // in stock and transfer one into a sellable location instead of a dead end.
  const [breakdownPackages, setBreakdownPackages] = useState([]);
  // Full product record (image, strains, THC/CBD, weight) for that same
  // "package not found" panel — inventoryData alone doesn't carry these.
  const [breakdownProductDetails, setBreakdownProductDetails] = useState(null);

  const searchInputRef = useRef(null);
  const debounceTimerRef = useRef(null);

  const isLocked = Object.keys(saleDetail).length > 0;

  // Shop preference gates the "scan a single package → straight to cart" flow.
  useEffect(() => {
    getShopPreferences()
      .then((response) => {
        if (response?.data?.success && response?.data?.data?.preference) {
          const pref = response.data.data.preference;
          setShouldEnableScanOnlyCart(pref.shouldEnableScanOnlyCart || false);
          setShouldAddNewLineItemOnScan(pref.shouldAddNewLineItemOnScan === true);
        }
      })
      .catch((error) => console.error("Error fetching shop preferences:", error));
  }, []);

  // Keep the scanner focused so the next scan lands here.
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);
  useEffect(() => {
    if (!packagesLoading) searchInputRef.current?.focus();
  }, [packagesLoading]);

  // Decimal support comes from the inventory's measurement policy.
  const isDecimalAllowed = () =>
    (
      inventoryData?.inventoryInfo?.projectQtyMeasurementPolicy ??
      inventoryData?.inventoryInfo?.measurementPolicy
    )?.shouldAllowDecimalValue === true;

  const handleQuantityChange = (packageItem, value) => {
    if (!packageItem) return;
    setCounters((c) => ({ ...c, [packageItem.id]: value }));
  };

  const handleIncrement = (packageItem) => {
    if (!packageItem) return;
    const currentValue = counters[packageItem.id] || 1;
    const newValue = isDecimalAllowed()
      ? Math.round((parseFloat(currentValue) + 0.25) * 100) / 100
      : Math.round(parseFloat(currentValue)) + 1;
    handleQuantityChange(packageItem, newValue.toString());
  };

  const handleDecrement = (packageItem) => {
    if (!packageItem) return;
    const currentValue = counters[packageItem.id] || 1;
    const newValue = isDecimalAllowed()
      ? Math.max(0.25, Math.round((parseFloat(currentValue) - 0.25) * 100) / 100)
      : Math.max(1, Math.round(parseFloat(currentValue)) - 1);
    handleQuantityChange(packageItem, newValue.toString());
  };

  const resetModalState = () => {
    setPackagesData([]);
    setPackagesLoading(false);
    setInventoryData(null);
    setVisible(false);
    setSelectedRowKeys([]);
    setScannedPackageId(null);
    setCounters({});
    setInputValue("");
    setBreakdownPackages([]);
    setBreakdownProductDetails(null);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
  };

  // Auto-select: one package -> select + qty 1; many -> select the scanned one.
  useEffect(() => {
    if (packagesData.length === 1) {
      const pkg = packagesData[0];
      setSelectedRowKeys([pkg.key]);
      setCounters({ [pkg.id]: 1 });
    } else if (packagesData.length > 1 && scannedPackageId) {
      const scanned = packagesData.find(
        (pkg) =>
          pkg.advertisedId === scannedPackageId ||
          pkg.advertisedId?.endsWith(scannedPackageId)
      );
      if (scanned) {
        setSelectedRowKeys([scanned.key]);
        const updated = { [scanned.id]: 1 };
        packagesData.forEach((pkg) => {
          if (pkg.id !== scanned.id) updated[pkg.id] = 0;
        });
        setCounters(updated);
      }
    }
  }, [packagesData, scannedPackageId]);

  // Enforce single selection when there are multiple packages.
  const toggleSelect = (pkg) => {
    if (packagesData.length > 1) {
      setSelectedRowKeys([pkg.key]);
      const updated = {};
      packagesData.forEach((p) => {
        updated[p.id] = p.key === pkg.key ? counters[p.id] || 1 : 0;
      });
      setCounters(updated);
    } else {
      setSelectedRowKeys((keys) =>
        keys.includes(pkg.key) ? keys.filter((k) => k !== pkg.key) : [...keys, pkg.key]
      );
    }
  };

  const refreshQuote = (updatedLineItems, source) =>
    quoteApiManager.call(
      getQuoteForSales,
      { ...quoteBody, lineItems: updatedLineItems },
      source
    );

  // Adds each item to the cart per the shouldAddNewLineItemOnScan preference:
  // true -> always its own new line, fresh appMaintainedId (old behaviour).
  // false -> a package already in the cart gets its existing line's quantity
  // bumped instead of a duplicate line, preserving that line's own
  // appMaintainedId (matches the old app's scan-only-cart merge behaviour).
  const mergeIntoCart = (
    currentCart,
    itemsToAdd,
    conversionRate,
    uomInfo: { projectQtyUomShortForm?: any; sellableUoMShortForm?: any } = {}
  ) => {
    let nextCart = [...currentCart];
    itemsToAdd.forEach(({ item, baseQuantity }) => {
      const addQty = conversionRate ? conversionRate * baseQuantity : baseQuantity;
      if (!shouldAddNewLineItemOnScan) {
        const idx = nextCart.findIndex((c) => c.id === item.id);
        if (idx !== -1) {
          nextCart = nextCart.map((c, i) =>
            i === idx ? { ...c, purchaseQuantity: (c.purchaseQuantity || 0) + addQty } : c
          );
          return;
        }
      }
      const lineId = crypto.randomUUID();
      nextCart = [
        ...nextCart,
        {
          ...item,
          key: lineId,
          appMaintainedId: lineId,
          inventoryId: item.inventoryId,
          packageId: item.id,
          purchaseQuantity: addQty,
          disabledDiscountSources: [],
          shouldAllowDecimalValue: item.shouldAllowDecimalValue,
          projectQtyConversionRate: conversionRate,
          projectQtyUomShortForm: uomInfo.projectQtyUomShortForm,
          sellableUoMShortForm: uomInfo.sellableUoMShortForm,
        },
      ];
    });
    return nextCart;
  };

  const handleAddToState = async () => {
    if (isAddingToCart) return;
    try {
      setIsAddingToCart(true);
      const selectedPackagesData = packagesData.filter((p) =>
        selectedRowKeys.includes(p.key)
      );

      const packagesWithQuantity = selectedPackagesData.filter((p) => {
        let quantity = counters[p.id];
        if (quantity === undefined && selectedRowKeys.includes(p.key)) quantity = 1;
        else if (quantity === undefined) quantity = 0;
        return quantity > 0;
      });

      if (packagesWithQuantity.length === 0) {
        toast.error("Please select at least one package with quantity greater than 0.");
        setIsAddingToCart(false);
        return;
      }

      const conversionRate = inventoryData?.inventoryInfo?.projectQtyConversionRate;
      const itemsToAdd = packagesWithQuantity.map((item) => ({
        item,
        baseQuantity: counters[item.id] !== undefined ? counters[item.id] : 1,
      }));
      const updatedLineItems = mergeIntoCart(cart, itemsToAdd, conversionRate, {
        projectQtyUomShortForm: inventoryData?.inventoryInfo?.projectQtyUomShortForm,
        sellableUoMShortForm: inventoryData?.inventoryInfo?.sellableUomShortForm,
      });
      dispatch(addToCart(updatedLineItems));
      dispatch(addLineItemsAction(updatedLineItems));
      dispatch(updateSalesDetail({ lineItems: updatedLineItems }));

      const res = await refreshQuote(updatedLineItems, "scanInput-addToCart");
      if (res?.data) {
        dispatch(getQuoteForSale(res.data));
        resetModalState();
      }
    } catch (error) {
      console.error("[ScanInput] Error adding to cart:", error);
      toast.error("Failed to add item to cart. Please try again.");
    } finally {
      setIsAddingToCart(false);
    }
  };

  // Opens the Add Transfer page (within-storage-locations) in a new tab,
  // pre-filled with this package and its highest-stocked location — keeps
  // the current sale/cart untouched instead of navigating away from it.
  const handleTransfer = (pkg) => {
    const entries = Object.entries(pkg.storageLocationBreakdown || {});
    const sourceId = entries.length
      ? entries.reduce((best, cur) => (cur[1] > best[1] ? cur : best))[0]
      : undefined;
    const params = new URLSearchParams({
      transferType: "within-storage-locations",
      packageIds: pkg.id,
      ...(sourceId ? { sourceLocationId: sourceId } : {}),
    });
    window.open(`/inventory-management/transfers/add-transfer?${params.toString()}`, "_blank");
  };

  const mapPackages = (inventory) =>
    (inventory?.packagesInfo || []).map((item) => ({
      ...item,
      id: item?.id,
      key: item?.id,
      productId: inventory?.inventoryInfo?.productId,
      productName: inventory?.inventoryInfo?.productNameSnapShot,
      inventoryId: inventory?.inventoryInfo?.id,
      price: inventory?.inventoryInfo?.unitPrice,
      sellableUomShortForm: inventory?.inventoryInfo?.sellableUomShortForm,
      shouldAllowDecimalValue:
        (
          inventory?.inventoryInfo?.projectQtyMeasurementPolicy ??
          inventory?.inventoryInfo?.measurementPolicy
        )?.shouldAllowDecimalValue !== undefined
          ? (
              inventory?.inventoryInfo?.projectQtyMeasurementPolicy ??
              inventory?.inventoryInfo?.measurementPolicy
            )?.shouldAllowDecimalValue
          : (() => {
              const value = localStorage.getItem("measurementPolicy");
              return value && value !== "undefined" ? JSON.parse(value) : false;
            })(),
      storageLocations: inventory?.inventoryInfo?.storageLocationBreakdown,
      projectQtyConversionRate: inventory?.inventoryInfo?.projectQtyConversionRate,
      projectQtyUomShortForm: inventory?.inventoryInfo?.projectQtyUomShortForm,
      sellableUoMShortForm: inventory?.inventoryInfo?.sellableUomShortForm,
    }));

  const fetchSellablePackages = (advertisedPackageId) => {
    if (!advertisedPackageId) return;
    setPackagesLoading(true);
    setScannedPackageId(advertisedPackageId);
    setBreakdownPackages([]);
    setBreakdownProductDetails(null);

    return getInventorySellableViaAdvertisedId(advertisedPackageId)
      .then((res) => {
        setInputValue("");
        const { inventory } = res.data.data;
        setInventoryData(inventory);

        const updatedPackagesInfo = mapPackages(inventory);

        // Nothing currently sellable for this code (packagesInfo missing OR
        // an empty array both land here) — look up every non-finished
        // package on the same product, so the cashier can see what's in
        // stock and transfer one into a sellable location.
        if (updatedPackagesInfo.length === 0) {
          setPackagesLoading(false);
          setVisible(true);
          const productId = inventory?.inventoryInfo?.productId;
          if (productId && shopId) {
            listMinimalPackages(shopId, productId, { limit: 30, page: 1 })
              .then((fbRes) => {
                setBreakdownPackages(fbRes?.data?.data?.packages || []);
              })
              .catch(() => setBreakdownPackages([]));
            getSingleProduct(productId)
              .then((pRes) => setBreakdownProductDetails(pRes?.data?.data?.product || null))
              .catch(() => setBreakdownProductDetails(null));
          }
          return;
        }

        // Scan-only single-package flow: skip the drawer, add straight to
        // cart. Whether rescanning the same package adds another line or
        // bumps the existing one's quantity is controlled by the
        // shouldAddNewLineItemOnScan shop preference (see mergeIntoCart).
        if (shouldEnableScanOnlyCart && updatedPackagesInfo.length === 1) {
          const scannedPackage =
            updatedPackagesInfo.find(
              (pkg) =>
                pkg.advertisedId === advertisedPackageId ||
                pkg.advertisedId?.endsWith(advertisedPackageId)
            ) || updatedPackagesInfo[0];
          const conversionRate = inventory?.inventoryInfo?.projectQtyConversionRate || 1;

          const updatedLineItems = mergeIntoCart(
            cart,
            [{ item: scannedPackage, baseQuantity: 1 }],
            conversionRate,
            {
              projectQtyUomShortForm: inventory?.inventoryInfo?.projectQtyUomShortForm,
              sellableUoMShortForm: inventory?.inventoryInfo?.sellableUomShortForm,
            }
          );
          dispatch(addToCart(updatedLineItems));
          dispatch(addLineItemsAction(updatedLineItems));
          dispatch(updateSalesDetail({ lineItems: updatedLineItems }));
          refreshQuote(updatedLineItems, "scanInput-scanOnly-addToCart")
            .then((quoteRes) => {
              dispatch(getQuoteForSale(quoteRes.data));
              toast.success(`${scannedPackage.productName} added to cart`);
            })
            .catch(() => toast.error("Failed to get quote. Please try again."))
            .finally(() => {
              setInputValue("");
              setScannedPackageId(null);
              setPackagesLoading(false);
            });
          return;
        }

        // Normal flow — open the selection drawer.
        setVisible(true);
        setPackagesData(updatedPackagesInfo);
        setPackagesLoading(false);
      })
      .catch((error) => {
        toast.error(error?.message || "Package lookup failed");
        setInputValue("");
        setScannedPackageId(null);
        setPackagesLoading(false);
      });
  };

  const handlePaste = (event) => {
    event.preventDefault();
    const pastedData = event.clipboardData.getData("Text").trim();
    setInputValue(pastedData);
    if (pastedData.length >= 5) {
      setTimeout(() => fetchSellablePackages(pastedData), 100);
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setInputValue(value);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    const trimmedValue = value.trim();
    if (trimmedValue && trimmedValue.length >= 5) {
      debounceTimerRef.current = setTimeout(() => {
        fetchSellablePackages(trimmedValue);
      }, 300);
    }
  };

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  // Externally-captured code (camera scan) — same handling as a pasted value.
  useEffect(() => {
    const value = scannedCode?.value?.trim();
    if (!value) return;
    setInputValue(value);
    if (value.length >= 5) {
      setTimeout(() => fetchSellablePackages(value), 100);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scannedCode?.nonce]);

  return (
    <div className="w-full">
      <Input
        ref={searchInputRef}
        className={className || "h-10"}
        value={inputValue}
        onChange={handleInputChange}
        onPaste={handlePaste}
        disabled={packagesLoading || isLocked}
        placeholder={placeholder}
        autoFocus
      />

      <Drawer
        open={visible}
        onClose={resetModalState}
        side="right"
        size={packagesData.length === 0 && breakdownPackages.length > 0 ? "min(1100px, 92vw)" : 420}
      >
        {packagesData.length === 0 && breakdownPackages.length > 0 ? (
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 className="truncate text-xl font-semibold">
                {inventoryData?.inventoryInfo?.productNameSnapShot ?? "Product Details"}
              </h2>
              <Button variant="destructive" onClick={resetModalState}>
                Cancel
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6">
              {(() => {
                const inv = inventoryData?.inventoryInfo;
                const conversionRate = inv?.projectQtyConversionRate;
                const qtyText = (val: any) =>
                  conversionRate > 0
                    ? `${(Number(val ?? 0) / conversionRate).toFixed(2)} ${inv?.projectQtyUomShortForm ?? ""}`
                    : `${Number(val ?? 0).toFixed(2)} ${inv?.sellableUomShortForm ?? ""}`;
                const strains = breakdownProductDetails?.strains ?? [];
                const thcValue = breakdownProductDetails?.cannabisProductData?.thcData?.value;
                const imgUrl = breakdownProductDetails?.images?.[0]?.url;

                return (
                  <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-stretch">
                    <div className="w-full shrink-0 overflow-hidden rounded-xl border border-border md:w-2/5">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imgUrl || defaultImage}
                        alt=""
                        className="h-full min-h-55 w-full object-cover"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = defaultImage;
                        }}
                      />
                    </div>

                    <div className="flex flex-1 flex-col gap-3">
                      <div className="rounded-xl border border-border bg-muted/30 p-4">
                        <p className="m-0 text-sm text-muted-foreground">Unit Price</p>
                        <p className="m-0 text-2xl font-bold">${Number(inv?.unitPrice ?? 0).toFixed(2)}</p>
                      </div>

                      <div className="flex-1 rounded-xl border border-border bg-muted/30 p-4">
                        <div className="flex items-center justify-between border-b border-border/60 py-2 text-sm first:pt-0">
                          <span className="text-muted-foreground">Total Quantity</span>
                          <span className="font-medium">{qtyText(inv?.sellableQuantityLeft)}</span>
                        </div>
                        <div className="flex items-center justify-between border-b border-border/60 py-2 text-sm">
                          <span className="text-muted-foreground">Sellable Quantity</span>
                          <span className="font-medium">{qtyText(inv?.sellableQuantityLeft)}</span>
                        </div>
                        <div className="flex items-center justify-between border-b border-border/60 py-2 text-sm">
                          <span className="text-muted-foreground">Strain</span>
                          <span className="font-medium">
                            {strains.length > 0 ? strains.map((s: any) => s.name).join(", ") : "-"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between border-b border-border/60 py-2 text-sm">
                          <span className="text-muted-foreground">THC</span>
                          <span className="font-medium">{thcValue ?? "0"}%</span>
                        </div>
                        <div className="flex items-center justify-between py-2 text-sm last:pb-0">
                          <span className="text-muted-foreground">Weight</span>
                          <span className="font-medium">
                            {breakdownProductDetails?.unitWeight ?? "-"}{" "}
                            {breakdownProductDetails?.unitWeightUom?.shortForm ?? ""}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div className="mb-4 flex gap-2.5 rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <div>
                  <p className="m-0 text-sm font-bold text-amber-900 dark:text-amber-200">
                    Package Not Found
                  </p>
                  <p className="m-0 text-sm text-amber-800/80 dark:text-amber-300/80">
                    No sellable packages were found for this item. The packages below make up this
                    inventory&apos;s stock but aren&apos;t currently sellable.
                  </p>
                </div>
              </div>

              <div className="overflow-hidden rounded-lg border border-border">
                <div className="border-b border-border bg-muted px-4 py-2.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Packages In Inventory
                </div>
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-left text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2">Package ID</th>
                      <th className="px-3 py-2">Package Name</th>
                      <th className="px-3 py-2">Quantity Left</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {breakdownPackages.map((pkg) => (
                      <tr key={pkg.id} className="border-t border-border">
                        <td className="px-3 py-2">{pkg.advertisedId}</td>
                        <td className="px-3 py-2">{pkg.name ?? "-"}</td>
                        <td className="px-3 py-2">{pkg.quantityLeft ?? "-"}</td>
                        <td className="px-3 py-2">{pkg.isActive ? "Active" : "Inactive"}</td>
                        <td className="px-3 py-2 text-center">
                          <Button size="sm" onClick={() => handleTransfer(pkg)}>
                            Transfer
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
        <div className="flex h-full flex-col p-4">
          <div className="mb-3 text-lg font-semibold">Add Line Items</div>

          {packagesLoading ? (
            <SkeletonLoader rows={4} />
          ) : packagesData.length === 0 ? (
            <p className="text-sm text-muted-foreground">No packages available</p>
          ) : (
            <div className="flex-1 space-y-2 overflow-y-auto">
              {packagesData.map((pkg) => {
                const selected = selectedRowKeys.includes(pkg.key);
                return (
                  <div
                    key={pkg.key}
                    className={`rounded-lg border p-3 ${selected ? "border-primary" : "border-border"}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleSelect(pkg)}
                        />
                        <div>
                          <div className="font-medium">{pkg.productName}</div>
                          <div className="text-xs text-muted-foreground">{pkg.advertisedId}</div>
                        </div>
                      </label>
                      <Badge variant="secondary">${pkg.price}</Badge>
                    </div>

                    {selected && (
                      <div className="mt-2 flex items-center justify-end gap-1">
                        <Button size="icon" variant="secondary" onClick={() => handleDecrement(pkg)}>
                          <Minus className="size-4" />
                        </Button>
                        <Input
                          value={
                            counters[pkg.id] !== undefined ? counters[pkg.id] : 1
                          }
                          onChange={(e) => handleQuantityChange(pkg, e.target.value)}
                          onFocus={(e) => e.target.select()}
                          inputMode={pkg.shouldAllowDecimalValue ? "decimal" : "numeric"}
                          className="w-16 text-center"
                        />
                        <Button size="icon" variant="secondary" onClick={() => handleIncrement(pkg)}>
                          <Plus className="size-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-3 flex justify-end gap-2">
            <Button variant="outline" onClick={resetModalState}>
              Cancel
            </Button>
            {selectedRowKeys.length > 0 && (
              <Button onClick={handleAddToState} disabled={isAddingToCart}>
                Add Selected Packages
              </Button>
            )}
          </div>
        </div>
        )}
      </Drawer>
    </div>
  );
}
