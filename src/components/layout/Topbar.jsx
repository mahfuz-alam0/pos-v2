"use client";

import { useState } from "react";
import { Menu, ChevronDown, Monitor } from "lucide-react";
import { useSidebar } from "@/context/sidebar-context";
import { useShop } from "@/context/shop-context";
import UserProfile from "./UserProfile";
import { cn } from "@/lib/utils";

function ShopSwitcher() {
  const { shopId, shopDetails, availableShops, selectShop } = useShop();
  const [open, setOpen] = useState(false);
  const shops = availableShops?.length ? availableShops : shopDetails ? [shopDetails] : [];
  const canSwitch = shops.length > 1;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => canSwitch && setOpen((v) => !v)}
        className="inline-flex h-9 items-center justify-center gap-2 rounded-full border border-primary/30 bg-gradient-to-r from-primary/20 to-primary/10 px-3 backdrop-blur-sm"
      >
        <span className="size-2 shrink-0 rounded-full bg-emerald-400" />
        <span className="max-w-[140px] truncate text-sm font-medium text-sidebar-text">
          {shopDetails?.label || "Select Shop"}
        </span>
        {canSwitch && <ChevronDown className="size-4 shrink-0 text-primary" />}
      </button>

      {open && canSwitch && (
        <div className="absolute right-0 top-full z-50 mt-1 w-[280px] overflow-hidden rounded-xl border border-primary/20 bg-accent shadow-2xl">
          {shops.map((shop) => (
            <div
              key={shop.value}
              onClick={() => {
                selectShop(shop);
                setOpen(false);
              }}
              className={cn(
                "cursor-pointer px-4 py-2.5 transition-colors",
                shop.value === shopId ? "border-l-4 border-emerald-400 bg-primary/10" : "hover:bg-sidebar-bg-hover"
              )}
            >
              <div className="truncate text-sm font-semibold text-white">{shop.label}</div>
              {shop.location && <div className="truncate text-xs text-sidebar-text">{shop.location}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RegisterSwitcher() {
  // Register/drawer selection isn't wired to hardware yet — visual placeholder only.
  return (
    <button
      type="button"
      className="inline-flex h-9 items-center justify-center gap-2 rounded-full border border-primary/30 bg-gradient-to-r from-primary/20 to-primary/10 px-3 backdrop-blur-sm"
    >
      <Monitor className="size-3.5 text-primary" />
      <span className="text-xs font-medium text-sidebar-text">Select Register</span>
    </button>
  );
}

export default function Topbar() {
  const { isMobile, toggleMobile } = useSidebar();

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-white/10 bg-accent px-4">
      {isMobile && (
        <button
          type="button"
          onClick={toggleMobile}
          className="flex size-8 items-center justify-center rounded-lg text-sidebar-text hover:bg-sidebar-bg-hover hover:text-white"
          aria-label="Open menu"
        >
          <Menu className="size-5" />
        </button>
      )}

      <div className="ml-auto flex items-center gap-3">
        <RegisterSwitcher />
        <ShopSwitcher />
        {isMobile && <UserProfile collapsed />}
      </div>
    </header>
  );
}
