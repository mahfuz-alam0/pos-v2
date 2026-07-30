"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { Info, ChevronLeft, ChevronRight } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import { getQuoteForSales } from "@/services/sales/getQuoteforSales";
import { getInventorySellable } from "@/services/sales/inventorySellable";
import { quoteApiManager } from "@/utils/quoteApiManager";
import { updateSalesDetail } from "@/store/slices/salesDetailSlice";
import { getQuoteForSale } from "@/store/slices/quoteForSaleSlice";
import { addBogoItemAction } from "@/store/slices/bogoLineItemsSlice";
import { addLineItemsAction } from "@/store/slices/lineItemsSlice";
import { addToCart } from "@/store/slices/cartSlice";
import useDiscountTypes from "@/hooks/useDiscountTypes";
import Drawer from "@/components/ui/Drawer";
import DealDetails from "./DealDetails";
import BogoDealDrawer from "./BogoDealDrawer";

const API_CALL_DEBOUNCE_MS = 1000;

/**
 * Per-product BOGO deal carousel. Opens BogoDealDrawer to construct the deal,
 * then bundles the selected buy/get products into `bundledLineItems`
 * (parent=BUY / child=GET) and re-quotes. Also enforces mutual exclusivity:
 * a product can only carry one BOGO deal / no BOGO if another discount applies.
 *
 * Props:
 *   bogoDeals     — array of applicable BOGO deal objects for the product.
 *   productRecord — the cart product this card is attached to (id, productId,
 *                   inventoryId, price, name, packageData fields...).
 *
 * Self-contained: reads salesDetail / quoteForSale / lineItems from Redux.
 */
function BogoDealCard({ bogoDeals, productRecord }) {
  const [dealStates, setDealStates] = useState({});
  const [dealDetailsVisible, setDealDetailsVisible] = useState(false);
  const [deal, setDealDetails] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [bogoDrawerVisible, setBogoDrawerVisible] = useState(false);
  const [selectedBogoItem, setSelectedBogoItem] = useState(null);
  const [drawerLoading, setDrawerLoading] = useState(false);

  const dispatch = useDispatch();
  const quoteBody = useSelector((state: any) => state?.salesDetail);
  const { discountTypes } = useDiscountTypes();

  const appliedBogoDeals = useSelector(
    (state: any) => state?.salesDetail?.applicableBogoDeals || []
  );
  const getOrderSummary = useSelector(
    (state: any) => state?.quoteForSale?.lineItems || []
  );
  const appliedDiscounts = useSelector(
    (state: any) => state?.salesDetail?.appliedDiscounts || []
  );
  const currentLineItems = useSelector(
    (state: any) => state?.lineItems?.lineItems || []
  );

  // Refs to avoid stale closures and to debounce/guard the quote calls.
  const apiCallInProgress = useRef(false);
  const quoteBodyRef = useRef(quoteBody);
  const lastApiCallTime = useRef(0);
  const apiTimeoutRef = useRef(null);

  useEffect(() => {
    quoteBodyRef.current = quoteBody;
  }, [quoteBody]);

  useEffect(() => {
    return () => {
      if (apiTimeoutRef.current) clearTimeout(apiTimeoutRef.current);
    };
  }, []);

  // Discount source enabled? (old code named this `isDisabled` but it is the
  // "enabled" flag — preserved verbatim to keep downstream logic identical.)
  const isDisabled = useMemo(
    () => discountTypes.includes("BOGO_DEAL"),
    [discountTypes]
  );

  const hasAppliedBogoForProduct = useMemo(() => {
    if (!productRecord?.productId) return false;

    const hasAppliedBogo = appliedBogoDeals.some(
      (d) => d.productId === productRecord.productId
    );
    const hasBogoInTrace = getOrderSummary.data?.bogoDealUsageTrace?.some(
      (trace) => {
        const correspondingDeal = bogoDeals?.find((d) => d.dealId === trace.id);
        return (
          correspondingDeal?.productId === productRecord.productId &&
          trace.timesApplied > 0
        );
      }
    );
    return hasAppliedBogo || hasBogoInTrace;
  }, [
    appliedBogoDeals,
    getOrderSummary.data?.bogoDealUsageTrace,
    productRecord?.productId,
    bogoDeals,
  ]);

  const hasOtherDiscountForProduct = useMemo(() => {
    if (!productRecord?.productId) return false;
    return appliedDiscounts.some(
      (discount) =>
        discount.productId === productRecord.productId &&
        discount.type !== "BOGO_DEAL"
    );
  }, [appliedDiscounts, productRecord?.productId]);

  const bogoUsageTrace = useMemo(
    () => getOrderSummary.data?.bogoDealUsageTrace || [],
    [getOrderSummary.data?.bogoDealUsageTrace]
  );

  const memoizedDealStates = useMemo(() => {
    const dealStatesMap = {};
    if (!bogoDeals || !Array.isArray(bogoDeals)) return dealStatesMap;

    bogoDeals.forEach((d) => {
      const { dealId, packageId, productId } = d;
      if (!dealId || !packageId || !productId) return;

      const isAppliedInList = appliedBogoDeals.some(
        (ad) =>
          ad.dealId === dealId &&
          ad.packageId === packageId &&
          ad.productId === productId
      );
      const isAppliedInTrace = bogoUsageTrace.some(
        (trace) => trace.id === dealId && trace.timesApplied > 0
      );
      const timesApplied =
        bogoUsageTrace.find((trace) => trace.id === dealId)?.timesApplied || 0;

      const isApplied = isAppliedInList || isAppliedInTrace;

      // Mutual exclusivity: block if another BOGO is on this product (and this
      // one isn't), or any non-BOGO discount is on this product.
      const isDealDisabled =
        (hasAppliedBogoForProduct && !isApplied) || hasOtherDiscountForProduct;

      dealStatesMap[dealId] = {
        applied: isApplied,
        dealInfo: d,
        timesApplied,
        appliedInTrace: isAppliedInTrace,
        appliedInList: isAppliedInList,
        disabled: isDealDisabled,
      };
    });
    return dealStatesMap;
  }, [
    bogoDeals,
    appliedBogoDeals,
    bogoUsageTrace,
    hasAppliedBogoForProduct,
    hasOtherDiscountForProduct,
  ]);

  useEffect(() => {
    setDealStates((prevStates) => {
      const hasChanges = Object.keys(memoizedDealStates).some((dealId) => {
        const prev = prevStates[dealId];
        const current = memoizedDealStates[dealId];
        return (
          !prev ||
          prev.applied !== current.applied ||
          prev.timesApplied !== current.timesApplied ||
          prev.appliedInTrace !== current.appliedInTrace ||
          prev.disabled !== current.disabled
        );
      });
      return hasChanges ? { ...prevStates, ...memoizedDealStates } : prevStates;
    });
  }, [memoizedDealStates]);

  const visibleDeals = useMemo(() => {
    if (!bogoDeals || !Array.isArray(bogoDeals)) return [];
    return bogoDeals.slice(currentIndex, currentIndex + 2);
  }, [bogoDeals, currentIndex]);

  const handleCancelDealDetails = useCallback(() => {
    setDealDetailsVisible(false);
    setDealDetails(null);
  }, []);

  const handleBogoDrawerClose = useCallback(() => {
    setBogoDrawerVisible(false);
    setSelectedBogoItem(null);
    setDrawerLoading(false);
  }, []);

  const handleShowDealDetails = useCallback((item) => {
    setDealDetails(item);
    setDealDetailsVisible(true);
  }, []);

  const handleNext = useCallback(() => {
    if (currentIndex + 2 < bogoDeals.length) setCurrentIndex((p) => p + 2);
  }, [currentIndex, bogoDeals]);

  const handlePrev = useCallback(() => {
    if (currentIndex - 2 >= 0) setCurrentIndex((p) => p - 2);
  }, [currentIndex]);

  const getBogoDescription = useCallback((item) => {
    if (!item?.bogoDealInfo) return "Limited time BOGO offer!";
    const info = item.bogoDealInfo;
    const buyQuantity = info.buyMinimumExactQuantity || 1;
    const getQuantity = info.getProductQuantity || 1;
    const discountRate = info.discountRate || 0;
    const discountType = info.discountType || "PERCENTAGE";
    return `Buy ${buyQuantity}, Get ${getQuantity} ${discountRate}${
      discountType === "PERCENTAGE" ? "%" : "$"
    } off! Limited time offer.`;
  }, []);

  const getDisabledTooltipMessage = useCallback(
    (dealState) => {
      if (isDisabled) {
        return "This discount source is disabled. You have to enable it from the settings section.";
      }
      if (dealState?.appliedInTrace) {
        return `This BOGO deal has already been applied ${dealState.timesApplied} time(s) and is in your cart.`;
      }
      if (dealState?.disabled) {
        return hasOtherDiscountForProduct
          ? "Cannot apply BOGO deal. Another discount is already applied to this product."
          : "Cannot apply this BOGO deal. Another BOGO deal is already applied to this product.";
      }
      return "";
    },
    [isDisabled, hasOtherDiscountForProduct]
  );

  // Builds the buy/get product candidates fed to the drawer. SELF => same
  // product; OTHER_DEFINED => fetch each getProductId via inventory-sellable.
  const fetchBogoDealProducts = async (dealItem) => {
    try {
      setDrawerLoading(true);

      const bogoDealInfo = dealItem.bogoDealInfo;
      const getProductType = bogoDealInfo?.getProductType;
      const getProductIds = bogoDealInfo?.getProductIds || [];

      const makeCurrentProduct = (quantity) => ({
        productId: productRecord.productId,
        productName: productRecord.productName,
        packageId: productRecord.id,
        advertisedId: productRecord.advertisedId,
        price: productRecord.price || productRecord.deals?.price || 0,
        quantity,
        inventoryId: productRecord.inventoryId,
        packageName: productRecord.name || productRecord.deals?.packageName,
        sellableUomShortForm: productRecord.sellableUomShortForm || "ea",
        packageData: {
          id: productRecord.id,
          advertisedId: productRecord.advertisedId,
          name: productRecord.name || productRecord.deals?.packageName,
          quantityLeft: productRecord.quantityLeft || 0,
          sellableUomShortForm: productRecord.sellableUomShortForm || "ea",
          expiry: productRecord.expiry,
          createdAt: productRecord.createdAt,
          storageLocations: productRecord.storageLocations || [],
        },
      });

      // Buy products: for PRODUCTS/CATEGORIES scopes and the default, the old
      // code used the current product as the buy product.
      const buyProducts = [
        makeCurrentProduct(bogoDealInfo?.buyMinimumExactQuantity || 1),
      ];

      let getProducts = [];

      if (getProductType === "SELF") {
        getProducts = [
          makeCurrentProduct(bogoDealInfo?.getProductQuantity || 1),
        ];
      } else if (getProductType === "OTHER_DEFINED" && getProductIds.length > 0) {
        try {
          const responses = await Promise.all(
            getProductIds.map((productId) => getInventorySellable(productId))
          );
          getProducts = responses
            .map((response) => {
              const { inventory } = response.data?.data || {};
              const inventoryInfo = inventory?.inventoryInfo;
              const packagesInfo = inventory?.packagesInfo || [];
              if (!inventoryInfo) return null;

              const firstPackage = packagesInfo[0] || {
                id: `pkg_${inventoryInfo?.id}_default`,
                advertisedId: `adv_${inventoryInfo?.id}_default`,
                name: inventoryInfo?.productNameSnapShot
                  ? `${inventoryInfo.productNameSnapShot} (Default Package)`
                  : "Default Package",
                quantityLeft: 0,
                sellableUomShortForm:
                  inventoryInfo?.sellableUomShortForm || "ea",
                expiry: null,
                createdAt: new Date().toISOString(),
              };

              return {
                productId: inventoryInfo?.productId,
                productName: inventoryInfo?.productNameSnapShot || "Product",
                packageId: firstPackage.id,
                advertisedId: firstPackage.advertisedId,
                price: inventoryInfo?.unitPrice || 0,
                quantity: bogoDealInfo?.getProductQuantity || 1,
                inventoryId: inventoryInfo?.id,
                packageName: firstPackage.name,
                sellableUomShortForm: firstPackage.sellableUomShortForm || "ea",
                packageData: {
                  id: firstPackage.id,
                  advertisedId: firstPackage.advertisedId,
                  name: firstPackage.name,
                  quantityLeft: firstPackage.quantityLeft || 0,
                  sellableUomShortForm:
                    firstPackage.sellableUomShortForm || "ea",
                  expiry: firstPackage.expiry,
                  createdAt: firstPackage.createdAt,
                  storageLocations: inventoryInfo?.storageLocationData || [],
                },
                availablePackages: packagesInfo.map((pkg) => ({
                  ...pkg,
                  productId: inventoryInfo?.productId,
                  productName: inventoryInfo?.productNameSnapShot,
                  inventoryId: inventoryInfo?.id,
                  price: inventoryInfo?.unitPrice,
                  sellableUomShortForm: inventoryInfo?.sellableUomShortForm,
                  deals: {
                    name: inventoryInfo?.productNameSnapShot,
                    price: inventoryInfo?.unitPrice,
                    packageName: pkg.name,
                    packageId: pkg.advertisedId,
                  },
                  storageLocations: inventoryInfo?.storageLocationData || [],
                })),
              };
            })
            .filter((product) => product !== null);
        } catch (error) {
          toast.warning(
            "Some get products could not be loaded. Please try again."
          );
          getProducts = getProductIds.map((productId) => ({
            productId,
            productName: `Product ${productId}`,
            packageId: `pkg_${productId}_fallback`,
            advertisedId: `adv_${productId}_fallback`,
            price: 0,
            quantity: bogoDealInfo?.getProductQuantity || 1,
            inventoryId: `inv_${productId}_fallback`,
            packageName: `Package for Product ${productId}`,
            sellableUomShortForm: "ea",
            packageData: {
              id: `pkg_${productId}_fallback`,
              advertisedId: `adv_${productId}_fallback`,
              name: `Package for Product ${productId}`,
              quantityLeft: 0,
              sellableUomShortForm: "ea",
              expiry: null,
              createdAt: new Date().toISOString(),
              storageLocations: [],
            },
            availablePackages: [],
            isPlaceholder: true,
          }));
        }
      } else if (
        getProductType === "OTHER_DEFINED" &&
        (bogoDealInfo?.getProductCategoryIds?.length > 0 ||
          bogoDealInfo?.getProductBrandIds?.length > 0)
      ) {
        toast.info("Category/Brand-based get products will be available soon");
        getProducts = [];
      } else {
        getProducts = [];
      }

      setSelectedBogoItem({
        dealId: dealItem.dealId,
        dealName: dealItem.dealName,
        dealDescription: dealItem.dealDescription || dealItem.description,
        bogoDealInfo: dealItem.bogoDealInfo,
        buyProducts,
        getProducts,
      });
    } catch (error) {
      toast.error("Failed to load deal products");
    } finally {
      setDrawerLoading(false);
    }
  };

  const handleRemoveBogoDeal = useCallback(
    async (item) => {
      const dealId = item.dealId;
      const now = Date.now();

      if (
        dealStates[dealId]?.removing ||
        apiCallInProgress.current ||
        now - lastApiCallTime.current < API_CALL_DEBOUNCE_MS
      ) {
        return;
      }

      setDealStates((prev) => ({
        ...prev,
        [dealId]: { ...prev[dealId], removing: true },
      }));

      const removeDeal = {
        packageId: item.packageId,
        productId: item.productId,
        dealId: item.dealId,
      };
      const currentQuoteBody = quoteBodyRef.current;
      const updatedApplicableBogoDeals =
        currentQuoteBody?.applicableBogoDeals?.filter(
          (d) =>
            !(
              d.dealId === removeDeal.dealId &&
              d.productId === removeDeal.productId
            )
        ) || [];

      try {
        apiCallInProgress.current = true;
        lastApiCallTime.current = now;
        apiTimeoutRef.current = setTimeout(() => {
          apiCallInProgress.current = false;
        }, 30000);

        dispatch(
          updateSalesDetail({ applicableBogoDeals: updatedApplicableBogoDeals })
        );

        const res = await quoteApiManager.call(
          getQuoteForSales,
          { ...currentQuoteBody, applicableBogoDeals: updatedApplicableBogoDeals },
          "bogo-card-remove"
        );
        dispatch(getQuoteForSale(res.data));

        setDealStates((prev) => ({
          ...prev,
          [dealId]: { ...prev[dealId], removing: false, applied: false },
        }));
        toast.success("BOGO Deal removed successfully");
      } catch (error) {
        setDealStates((prev) => ({
          ...prev,
          [dealId]: { ...prev[dealId], removing: false, applied: true },
        }));
        toast.error("Error removing BOGO deal");
      } finally {
        if (apiTimeoutRef.current) clearTimeout(apiTimeoutRef.current);
        apiCallInProgress.current = false;
      }
    },
    [dealStates, dispatch]
  );

  const handleApplyBogoDeal = useCallback(
    (item) => {
      const dealState = dealStates[item.dealId];

      if (dealState?.disabled && !dealState?.applied) {
        const message = hasOtherDiscountForProduct
          ? "Cannot apply BOGO deal. Another discount is already applied to this product."
          : "Cannot apply this BOGO deal. Another BOGO deal is already applied to this product.";
        toast.warning(message);
        return;
      }

      if (dealState?.applied) {
        handleRemoveBogoDeal(item);
        return;
      }

      setSelectedBogoItem(item);
      setBogoDrawerVisible(true);
      setDrawerLoading(true);
      fetchBogoDealProducts(item);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dealStates, productRecord, hasOtherDiscountForProduct, handleRemoveBogoDeal]
  );

  // *** Core BOGO bundling: parent=BUY, child=GET, bundledLineItems[] ***
  const handleApplyDealFromDrawer = useCallback(
    async (dealApplication) => {
      const now = Date.now();

      if (
        drawerLoading ||
        apiCallInProgress.current ||
        now - lastApiCallTime.current < API_CALL_DEBOUNCE_MS
      ) {
        return;
      }

      try {
        setDrawerLoading(true);
        apiCallInProgress.current = true;
        lastApiCallTime.current = now;
        apiTimeoutRef.current = setTimeout(() => {
          apiCallInProgress.current = false;
          setDrawerLoading(false);
        }, 30000);

        const { dealId, dealName, buyProducts, getProducts, bogoDealInfo } =
          dealApplication;

        const currentQuoteBody = quoteBodyRef.current;

        // Remove the original cart line item for this product (robust match
        // across id / packageId / inventoryId / productId / nested pkg).
        const matches = (i) =>
          i.id === productRecord.id ||
          i.packageId === productRecord.id ||
          i.inventoryId === productRecord.inventoryId ||
          i.productId === productRecord.productId ||
          (i.pkg &&
            (i.pkg.id === productRecord.id ||
              i.pkg.productId === productRecord.productId ||
              i.pkg.inventoryId === productRecord.inventoryId));

        const updatedLineItems = currentLineItems.filter((i) => !matches(i));
        const filteredQuoteBodyLineItems = (
          currentQuoteBody?.lineItems || []
        ).filter((i) => !matches(i));

        dispatch(addLineItemsAction(updatedLineItems));
        dispatch(addToCart(updatedLineItems));
        dispatch(updateSalesDetail({ lineItems: updatedLineItems }));

        // Parent (BUY) line items.
        const parentLineItems = buyProducts.map((product) => ({
          inventoryId: product.inventoryId || product.id,
          packageId: product.packageId,
          purchaseQuantity: product.quantity,
          disabledDiscountSources: [],
          itemType: "BUY",
          pkg: {
            id: product.packageId,
            advertisedId:
              product.advertisedId || product.packageData?.advertisedId,
            expiry: product.packageData?.expiry || null,
            createdAt:
              product.packageData?.createdAt || new Date().toISOString(),
            name: product.packageName || product.packageData?.name,
            quantityLeft: product.packageData?.quantityLeft || 0,
            key: product.packageId,
            productId: product.productId,
            productName: product.productName,
            inventoryId: product.inventoryId || product.id,
            price: product.price,
            sellableUomShortForm:
              product.sellableUomShortForm ||
              product.packageData?.sellableUomShortForm ||
              "ea",
            deals: {
              name: product.productName,
              price: product.price,
              packageName: product.packageName || product.packageData?.name,
              packageId:
                product.advertisedId || product.packageData?.advertisedId,
            },
            storageLocations:
              product.packageData?.storageLocations ||
              product.storageLocations ||
              [],
          },
        }));

        // Child (GET) line items.
        const childLineItems = getProducts.map((product) => ({
          inventoryId: product.inventoryId || product.id,
          packageId: product.packageId,
          purchaseQuantity: product.quantity,
          disabledDiscountSources: [],
          itemType: "GET",
          pkg: {
            id: product.packageId,
            advertisedId:
              product.advertisedId || product.packageData?.advertisedId,
            expiry: product.packageData?.expiry || null,
            createdAt:
              product.packageData?.createdAt || new Date().toISOString(),
            name: product.packageName || product.packageData?.name,
            quantityLeft: product.packageData?.quantityLeft || 0,
            key: product.packageId,
            productId: product.productId,
            productName: product.productName,
            inventoryId: product.inventoryId || product.id,
            price: product.price,
            sellableUomShortForm:
              product.sellableUomShortForm ||
              product.packageData?.sellableUomShortForm ||
              "ea",
            deals: {
              name: product.productName,
              price: product.price,
              packageName: product.packageName || product.packageData?.name,
              packageId:
                product.advertisedId || product.packageData?.advertisedId,
            },
            storageLocations:
              product.packageData?.storageLocations ||
              product.storageLocations ||
              [],
          },
        }));

        const bundledLineItems = [
          {
            parentLineItems,
            childLineItems,
            type: "BOGO_DEAL",
            bogoDealId: dealId,
            dealName,
            discountRate:
              bogoDealInfo?.discountRate || bogoDealInfo?.discountPercent || 0,
          },
        ];

        const lineItems = [...buyProducts, ...getProducts];

        dispatch(
          addBogoItemAction({
            lineItems,
            dealName: dealName || `BOGO Deal ${dealId}`,
            dealId,
            bundledLineItems,
            bogoType: bogoDealInfo?.bogoType || "BOGO",
            discountRate: bogoDealInfo?.discountPercent || 0,
          })
        );

        const dealToAdd = {
          dealId,
          productId: productRecord.productId,
          packageId: productRecord.id,
          buyProducts,
          getProducts,
          bogoDealInfo,
        };
        const updatedApplicableBogoDeals = [
          ...(currentQuoteBody?.applicableBogoDeals || []),
          dealToAdd,
        ];

        dispatch(
          updateSalesDetail({
            applicableBogoDeals: updatedApplicableBogoDeals,
            bundledLineItems,
          })
        );

        const updatedQuoteBody = {
          ...currentQuoteBody,
          lineItems: filteredQuoteBodyLineItems,
          applicableBogoDeals: updatedApplicableBogoDeals,
          bundledLineItems,
        };

        const res = await quoteApiManager.call(
          getQuoteForSales,
          updatedQuoteBody,
          "bogo-card-apply"
        );
        dispatch(getQuoteForSale(res.data));

        toast.success("BOGO deal applied successfully!");
        handleBogoDrawerClose();
      } catch (error) {
        toast.error("Failed to apply BOGO deal");
      } finally {
        if (apiTimeoutRef.current) clearTimeout(apiTimeoutRef.current);
        setDrawerLoading(false);
        apiCallInProgress.current = false;
      }
    },
    [productRecord, dispatch, handleBogoDrawerClose, currentLineItems, drawerLoading]
  );

  if (!bogoDeals || !Array.isArray(bogoDeals) || bogoDeals.length === 0) {
    return (
      <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
        No BOGO deals available
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-start">
        <button
          onClick={handlePrev}
          disabled={currentIndex === 0}
          aria-label="Previous BOGO deals"
          className="flex items-center text-[#ff9f43] hover:text-[#ff6b35] disabled:cursor-not-allowed disabled:text-neutral-300"
        >
          <ChevronLeft className="size-5" />
        </button>

        <div className="flex gap-4">
          {visibleDeals.map((item) => {
            if (!item?.dealId) return null;
            const dealState = dealStates[item.dealId] || {};
            const {
              loading,
              applied,
              removing,
              timesApplied,
              appliedInTrace,
              disabled: dealDisabled,
            } = dealState;
            const isProcessing = loading || removing;
            const isButtonDisabled =
              isDisabled ||
              isProcessing ||
              appliedInTrace ||
              (dealDisabled && !applied);
            const tooltipMessage = getDisabledTooltipMessage(dealState);

            return (
              <div
                key={item.dealId}
                className={`relative flex min-w-45 max-w-55 flex-col overflow-hidden rounded-lg bg-[#ff9f434a] p-3 shadow-md ${
                  dealDisabled && !applied ? "border-2 border-neutral-300 opacity-60" : ""
                }`}
              >
                <span
                  className={`absolute right-2 top-2 rounded-full px-1.5 py-[3px] text-[9px] font-semibold ${
                    applied ? "bg-[#FF6B35] text-white" : "bg-[#ff9f43] text-black"
                  }`}
                >
                  {applied
                    ? appliedInTrace
                      ? `Applied (${timesApplied}x)`
                      : "Applied"
                    : dealDisabled
                      ? "Blocked"
                      : "Not Applied"}
                </span>

                <div className="flex items-center">
                  <h4
                    className="ml-1 w-24 overflow-hidden text-ellipsis whitespace-nowrap text-sm font-medium text-[#ff9f43]"
                    title={item.dealName}
                  >
                    {item?.dealName || "BOGO Deal"}
                  </h4>
                </div>

                <h5 className="text-[11px] font-normal text-[#555]">
                  {getBogoDescription(item)}
                  <span
                    className="ml-2 cursor-pointer"
                    title="Click here to get more info about this BOGO deal"
                    onClick={() => handleShowDealDetails(item)}
                  >
                    <Info className="inline size-3" />
                  </span>
                </h5>

                <button
                  onClick={() => handleApplyBogoDeal(item)}
                  disabled={isButtonDisabled}
                  title={tooltipMessage || undefined}
                  className={`mt-2.5 flex w-[52%] items-center justify-center rounded px-1 py-1 text-[10px] font-semibold ${
                    isButtonDisabled
                      ? "cursor-not-allowed bg-neutral-300 text-neutral-500"
                      : "bg-[#ff9f43] text-black"
                  }`}
                >
                  {isProcessing
                    ? removing
                      ? "Removing..."
                      : "Applying..."
                    : applied
                      ? appliedInTrace
                        ? "Applied in Cart"
                        : "Remove Deal"
                      : dealDisabled
                        ? "Deal Blocked"
                        : "Apply Deal"}
                  {(isButtonDisabled || tooltipMessage) && (
                    <Info
                      className="ml-2 size-3"
                      style={{
                        color: appliedInTrace
                          ? "green"
                          : dealDisabled
                            ? "orange"
                            : "red",
                      }}
                    />
                  )}
                </button>
              </div>
            );
          })}
        </div>

        <button
          onClick={handleNext}
          disabled={currentIndex + 2 >= bogoDeals.length}
          aria-label="Next BOGO deals"
          className="flex items-center text-[#ff9f43] hover:text-[#ff6b35] disabled:cursor-not-allowed disabled:text-neutral-300"
        >
          <ChevronRight className="size-5" />
        </button>
      </div>

      {/* Deal Details Drawer */}
      <Drawer
        open={dealDetailsVisible}
        onClose={handleCancelDealDetails}
        side="right"
        size={500}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h3 className="text-base font-semibold">
              {deal?.dealName || "BOGO Deal Details"}
            </h3>
            <button
              onClick={handleCancelDealDetails}
              className="text-muted-foreground"
            >
              ✕
            </button>
          </div>
          <div className="flex-1 overflow-auto">
            {deal && <DealDetails deal={deal} />}
          </div>
        </div>
      </Drawer>

      {/* BOGO Deal Construction Drawer */}
      <BogoDealDrawer
        visible={bogoDrawerVisible}
        onClose={handleBogoDrawerClose}
        dealData={selectedBogoItem}
        onApplyDeal={handleApplyDealFromDrawer}
        loading={drawerLoading}
      />
    </>
  );
}

export default React.memo(BogoDealCard);
