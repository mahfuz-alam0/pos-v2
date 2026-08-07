"use client";

import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Minus, Plus } from "lucide-react";
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
import { quoteApiManager } from "@/utils/quoteApiManager";

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
// within-store transfer drawer, breakdown-package fallback (listPackagesMinimal),
// matrix product resolution.
export default function ScanInput({
  setAddSelected,
  placeholder = "Scan barcode / package ID",
  className = "",
  // A code captured externally (e.g. a camera-based barcode/QR scan — see
  // BarcodeScanDialog) to feed into this field exactly like a HID scanner
  // keystroke would. Pass { value, nonce } with a fresh nonce per scan (a
  // timestamp works) so scanning the same code twice in a row still fires —
  // a plain string prop wouldn't re-trigger the effect on an unchanged value.
  scannedCode,
}: {
  setAddSelected?: (v: boolean) => void;
  placeholder?: string;
  className?: string;
  scannedCode?: { value: string; nonce: number } | null;
}) {
  const dispatch = useDispatch();
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
  const [isAddingToCart, setIsAddingToCart] = useState(false);

  const searchInputRef = useRef(null);
  const debounceTimerRef = useRef(null);

  const isLocked = Object.keys(saleDetail).length > 0;

  // Shop preference gates the "scan a single package → straight to cart" flow.
  useEffect(() => {
    getShopPreferences()
      .then((response) => {
        if (response?.data?.success && response?.data?.data?.preference) {
          setShouldEnableScanOnlyCart(
            response.data.data.preference.shouldEnableScanOnlyCart || false
          );
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

      // Always adds a new, independent cart line — scanning/selecting the
      // same package again (e.g. to ring up another unit as its own line)
      // is not merged or blocked; each line's own quote data stays distinct
      // via a fresh appMaintainedId (see lineItemMatching.ts).
      const conversionRate = inventoryData?.inventoryInfo?.projectQtyConversionRate;
      const packagesWithExtraFields = packagesWithQuantity.map((item) => {
        const baseQuantity = counters[item.id] !== undefined ? counters[item.id] : 1;
        const lineId = crypto.randomUUID();
        return {
          ...item,
          key: lineId,
          appMaintainedId: lineId,
          inventoryId: item.inventoryId,
          packageId: item.id,
          purchaseQuantity: conversionRate ? conversionRate * baseQuantity : baseQuantity,
          disabledDiscountSources: [],
          shouldAllowDecimalValue: item.shouldAllowDecimalValue,
          projectQtyConversionRate: inventoryData?.inventoryInfo?.projectQtyConversionRate,
          projectQtyUomShortForm: inventoryData?.inventoryInfo?.projectQtyUomShortForm,
          sellableUoMShortForm: inventoryData?.inventoryInfo?.sellableUomShortForm,
        };
      });

      const updatedLineItems = [...cart, ...packagesWithExtraFields];
      dispatch(addToCart(updatedLineItems));
      dispatch(addLineItemsAction(updatedLineItems));
      dispatch(updateSalesDetail({ lineItems: updatedLineItems }));
      setAddSelected?.(false);

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

    return getInventorySellableViaAdvertisedId(advertisedPackageId)
      .then((res) => {
        setInputValue("");
        const { inventory } = res.data.data;
        setInventoryData(inventory);
        if (!inventory?.packagesInfo) {
          setPackagesLoading(false);
          return;
        }

        const updatedPackagesInfo = mapPackages(inventory);

        // Scan-only single-package flow: skip the drawer, add straight to
        // cart as its own new line every time — rescanning the same package
        // adds another line rather than bumping an existing one's quantity,
        // same as everywhere else (see lineItemMatching.ts).
        if (shouldEnableScanOnlyCart && updatedPackagesInfo.length === 1) {
          const scannedPackage =
            updatedPackagesInfo.find(
              (pkg) =>
                pkg.advertisedId === advertisedPackageId ||
                pkg.advertisedId?.endsWith(advertisedPackageId)
            ) || updatedPackagesInfo[0];
          const conversionRate = inventory?.inventoryInfo?.projectQtyConversionRate || 1;
          const lineId = crypto.randomUUID();

          const packageWithExtraFields = {
            ...scannedPackage,
            key: lineId,
            appMaintainedId: lineId,
            inventoryId: scannedPackage.inventoryId,
            packageId: scannedPackage.id,
            purchaseQuantity: conversionRate * 1,
            disabledDiscountSources: [],
            shouldAllowDecimalValue: scannedPackage.shouldAllowDecimalValue,
            projectQtyConversionRate: conversionRate,
            projectQtyUomShortForm: inventory?.inventoryInfo?.projectQtyUomShortForm,
            sellableUoMShortForm: inventory?.inventoryInfo?.sellableUomShortForm,
          };
          const updatedLineItems = [...cart, packageWithExtraFields];
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

      <Drawer open={visible} onClose={resetModalState} side="right" size={420}>
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
      </Drawer>
    </div>
  );
}
