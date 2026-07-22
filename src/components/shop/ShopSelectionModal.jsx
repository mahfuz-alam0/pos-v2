"use client";

import { MapPin, Phone, Store } from "lucide-react";
import { useShop } from "@/context/shop-context";

export default function ShopSelectionModal() {
  const { showShopModal, availableShops, loading, selectShop } = useShop();

  if (!showShopModal) return null;

  return (
    <div className="fixed inset-0 z-9999 flex justify-end bg-black/40 backdrop-blur-sm">
      <div className="flex h-full w-full max-w-md flex-col bg-sidebar-bg shadow-2xl animate-in slide-in-from-right duration-300">
        <div className="border-b border-white/10 bg-white/5 px-6 py-5">
          <h2 className="text-lg font-semibold text-white">Select Your Shop</h2>
          <p className="mt-1 text-sm text-white/50">
            Choose a shop to continue — you must pick one to proceed.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="py-12 text-center">
              <div className="mx-auto h-10 w-10 animate-spin rounded-full border-b-2 border-white" />
              <p className="mt-3 text-sm text-white/70">Loading shops...</p>
            </div>
          ) : availableShops.length === 0 ? (
            <div className="py-12 text-center">
              <Store className="mx-auto h-16 w-16 text-white/30" strokeWidth={1.5} />
              <h3 className="mt-4 font-medium text-white">No Shops Available</h3>
              <p className="mt-2 text-sm text-white/50">
                You don't have access to any shops yet.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {availableShops.map((shop) => (
                <button
                  key={shop.value}
                  type="button"
                  onClick={() => selectShop(shop)}
                  className="group flex w-full items-center rounded-xl border border-white/10 bg-white/5 p-4 text-left transition-all duration-200 hover:-translate-x-1 hover:border-primary/50 hover:bg-white/10 hover:shadow-lg"
                >
                  <div className="min-w-0 flex-1">
                    <h4 className="mb-1 truncate text-[17px] font-semibold text-white">
                      {shop.label}
                    </h4>
                    {shop.location && (
                      <p className="mb-1 flex items-center gap-1 truncate text-sm text-white/65">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        {shop.location}
                      </p>
                    )}
                    {shop.phone && (
                      <p className="flex items-center gap-1 text-xs text-white/50">
                        <Phone className="h-3 w-3 shrink-0" />
                        {shop.phone}
                      </p>
                    )}
                  </div>
                  <div className="ml-4 flex shrink-0 flex-col items-end gap-2">
                    <div className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span className="rounded-md bg-primary px-4 py-2 text-xs font-medium text-on-primary transition-all group-hover:brightness-110">
                      Select
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
