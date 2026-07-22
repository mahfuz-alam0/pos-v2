"use client";

import { usePathname } from "next/navigation";
import { useShop } from "@/context/shop-context";
import { PUBLIC_PATHS } from "@/components/auth/AuthGuard";
import ShopSelectionModal from "@/components/shop/ShopSelectionModal";
import InitializingScreen from "@/components/InitializingScreen";

export default function ShopGate({ children }) {
  const pathname = usePathname();
  const { shopReady, showShopModal, loading } = useShop();

  const isPublicPath = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  if (isPublicPath) return children;

  return (
    <>
      {(loading || (!shopReady && !showShopModal)) && <InitializingScreen />}

      <ShopSelectionModal />

      {shopReady && children}
    </>
  );
}
