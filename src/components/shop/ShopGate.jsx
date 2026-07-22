"use client";

import { usePathname } from "next/navigation";
import { useShop } from "@/context/shop-context";
import { PUBLIC_PATHS } from "@/components/auth/AuthGuard";
import ShopSelectionModal from "@/components/shop/ShopSelectionModal";
import InitializingScreen from "@/components/InitializingScreen";
import Sidebar from "@/components/layout/Sidebar";

export default function ShopGate({ children }) {
  const pathname = usePathname();
  const { shopReady, showShopModal, loading } = useShop();

  const isPublicPath = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  if (isPublicPath) return children;

  return (
    <>
      {(loading || (!shopReady && !showShopModal)) && <InitializingScreen />}

      <ShopSelectionModal />

      {shopReady && (
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 min-w-0 bg-surface">{children}</main>
        </div>
      )}
    </>
  );
}
