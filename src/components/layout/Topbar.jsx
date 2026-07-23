"use client";

import { useEffect, useRef, useState } from "react";
import { Menu, Megaphone, Monitor } from "lucide-react";
import { useSidebar } from "@/context/sidebar-context";
import { useShop } from "@/context/shop-context";
import UserProfile from "./UserProfile";
import AnnouncementDrawer from "./AnnouncementDrawer";
import { cn } from "@/lib/utils";

function ShopSwitcher() {
  const { shopId, shopDetails, availableShops, selectShop } = useShop();
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);
  const shops = availableShops?.length ? availableShops : shopDetails ? [shopDetails] : [];
  const canSwitch = shops.length > 1;

  useEffect(() => {
    if (!open) return;
    function handleOutside(e) {
      if (!boxRef.current?.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  return (
    <div ref={boxRef} className="relative" onClick={() => canSwitch && setOpen((v) => !v)}>
      <div className="relative ml-auto inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-full border border-blue-400/30 bg-linear-to-r from-blue-500/20 to-cyan-500/20 px-3 backdrop-blur-sm">
        <div className="h-2 w-2 self-center rounded-full bg-green-400" />
        <span className="flex items-center truncate text-sm font-medium text-blue-200">
          {shopDetails?.label ? shopDetails.label : "Shop 1"}
        </span>
        {canSwitch && (
          <svg
            className="ml-2 h-5 w-5 shrink-0 text-blue-400"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </div>

      {open && canSwitch && (
        <div
          className="absolute top-full right-0 z-50 mt-1 w-70 overflow-hidden rounded-xl border border-blue-400/30 bg-linear-to-br from-blue-900/90 to-cyan-900/70 backdrop-blur-md"
          style={{ boxShadow: "0 8px 32px 0 rgba(31, 38, 135, 0.37)" }}
        >
          {shops.map((option) => (
            <div
              key={option.value}
              className={cn(
                "group flex cursor-pointer flex-col gap-0.5 px-5 py-3 transition-all duration-150",
                option.value === shopId
                  ? "border-l-4 border-green-400 bg-linear-to-r from-green-400/10 to-blue-400/10"
                  : "hover:bg-blue-800/60"
              )}
              onClick={(e) => {
                e.stopPropagation();
                selectShop(option);
                setOpen(false);
              }}
            >
              <span className="truncate text-base font-bold text-blue-100 group-hover:text-green-300">
                {option.label}
              </span>
              {option.location && (
                <span className="block truncate text-xs text-blue-200 group-hover:text-green-200">
                  {option.location}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RegisterSwitcher() {
  // Register/drawer selection isn't wired to hardware yet — visual placeholder only.
  const registerName = "";
  const drawerName = "";

  return (
    <button
      type="button"
      className="inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-full border border-blue-400/30 bg-linear-to-r from-blue-500/20 to-cyan-500/20 px-3 backdrop-blur-sm"
    >
      <Monitor className="size-3.5 text-blue-400" />
      <div className="flex flex-col items-start justify-center gap-0 leading-none">
        <span className="text-xs leading-tight font-medium text-blue-200">
          {registerName || "Select Register"}
        </span>
        {drawerName && (
          <span className="text-[9px] leading-tight text-blue-300">{drawerName}</span>
        )}
      </div>
    </button>
  );
}

export default function Topbar() {
  const { isMobile, toggleMobile } = useSidebar();
  const [isAnnouncementDrawerOpen, setIsAnnouncementDrawerOpen] = useState(false);

  return (
    <header className="flex h-18 shrink-0 items-center gap-3 bg-accent px-4">
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
        <button
          type="button"
          onClick={() => setIsAnnouncementDrawerOpen(true)}
          title="Announcements"
          className="relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-white/30 hover:shadow-sm"
          aria-label="Open Announcements"
        >
          <Megaphone className="size-4.5 text-white" />
        </button>
        <RegisterSwitcher />
        <ShopSwitcher />
        {isMobile && <UserProfile collapsed />}
      </div>

      <AnnouncementDrawer
        open={isAnnouncementDrawerOpen}
        onClose={() => setIsAnnouncementDrawerOpen(false)}
      />
    </header>
  );
}
