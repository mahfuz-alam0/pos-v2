"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { fetchShopsData } from "@/services/shops/list";
import { PUBLIC_PATHS } from "@/components/auth/AuthGuard";
import { getCurrentUser } from "@/util/use-current-user";

const ShopContext = createContext(null);

function readStoredShop() {
  if (typeof window === "undefined") return { id: null, details: null };
  try {
    return {
      id: JSON.parse(localStorage.getItem("shopId")),
      details: JSON.parse(localStorage.getItem("shopDetails")),
    };
  } catch {
    return { id: null, details: null };
  }
}

function persistShop(shop) {
  localStorage.setItem("shopId", JSON.stringify(shop.value));
  localStorage.setItem("shopDetails", JSON.stringify(shop));
}

export function ShopProvider({ children }) {
  const pathname = usePathname();
  const isPublicPath = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  const [shopId, setShopId] = useState(null);
  const [shopDetails, setShopDetails] = useState(null);
  const [shopReady, setShopReady] = useState(isPublicPath);
  const [showShopModal, setShowShopModal] = useState(false);
  const [availableShops, setAvailableShops] = useState([]);
  const [loading, setLoading] = useState(false);
  const initialized = useRef(false);

  useEffect(() => {
    if (isPublicPath || initialized.current) return;
    initialized.current = true;

    const userInfo = getCurrentUser();
    if (!userInfo) {
      // AuthGuard will redirect to /signin — nothing to initialize.
      setShopReady(true);
      return;
    }

    (async () => {
      setLoading(true);
      try {
        const result = await fetchShopsData();
        const modifiedData = (result.data || []).map((shop) => ({
          value: shop.id,
          label: shop.name,
          location: shop.locationString,
          priority: shop.countryCode,
          logo: shop.logo,
          phone: shop.phone,
          email: shop.shopEmail,
          ...shop,
        }));

        const associatedShopIds = userInfo?.associatedShopIds || [];
        const userAssociatedShops =
          associatedShopIds.length > 0
            ? modifiedData.filter((shop) => associatedShopIds.includes(shop.value))
            : modifiedData;

        if (userAssociatedShops.length === 0) {
          console.warn("User has no accessible shops.");
          setShopReady(true);
          return;
        }

        // Always surface the full shop list to the topbar switcher so the
        // dropdown stays openable across reloads — not just on first run.
        if (userAssociatedShops.length > 1) {
          setAvailableShops(userAssociatedShops);
        }

        const stored = readStoredShop();
        const shopExists =
          stored.id && userAssociatedShops.some((shop) => shop.value === stored.id);

        if (shopExists && stored.details) {
          setShopId(stored.id);
          setShopDetails(stored.details);
          setShopReady(true);
          return;
        }

        if (userAssociatedShops.length === 1) {
          const singleShop = userAssociatedShops[0];
          persistShop(singleShop);
          setShopId(singleShop.value);
          setShopDetails(singleShop);
          setShopReady(true);
          return;
        }

        setAvailableShops(userAssociatedShops);
        setShowShopModal(true);
        setShopReady(false);
      } catch (error) {
        console.error("Error initializing shop data:", error);
        setShopReady(true);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function selectShop(shop) {
    persistShop(shop);
    setShopId(shop.value);
    setShopDetails(shop);
    setShowShopModal(false);
    setShopReady(true);
  }

  const value = {
    shopId,
    shopDetails,
    shopReady,
    showShopModal,
    availableShops,
    loading,
    selectShop,
  };

  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;
}

export function useShop() {
  const ctx = useContext(ShopContext);
  if (!ctx) throw new Error("useShop must be used within a ShopProvider");
  return ctx;
}
