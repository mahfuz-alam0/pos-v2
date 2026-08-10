"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  ChevronDown,
  Leaf,
  MapPin,
  Megaphone,
  Menu,
  Monitor,
} from "lucide-react";
import { useSidebar } from "@/context/sidebar-context";
import { useShop } from "@/context/shop-context";
import { usePermission } from "@/util/use-permission";
import { chatLogin, getChatSessions } from "@/store/slices/chatSlice";
import UserProfile from "./UserProfile";
import AnnouncementDrawer from "./AnnouncementDrawer";
import LeaflyOrdersDrawer from "./LeaflyOrdersDrawer";
import RegisterDrawerModal from "@/components/pos/RegisterDrawerModal";
import { cn } from "@/lib/utils";

const SHOP_PANEL_WIDTH = 300;

function ShopSwitcher() {
  const { shopId, shopDetails, availableShops, selectShop } = useShop();
  const [open, setOpen] = useState(false);
  const [panelPos, setPanelPos] = useState({ top: 0, left: 0 });
  const [mounted, setMounted] = useState(false);
  const [hasOpenedOnce, setHasOpenedOnce] = useState(false);
  const [panelEntered, setPanelEntered] = useState(false);
  const buttonRef = useRef(null);
  const panelRef = useRef(null);
  const shops = availableShops?.length ? availableShops : shopDetails ? [shopDetails] : [];
  const canSwitch = shops.length > 1;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    function handleOutside(e) {
      const clickedButton = buttonRef.current?.contains(e.target);
      const clickedPanel = panelRef.current?.contains(e.target);
      if (!clickedButton && !clickedPanel) setOpen(false);
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  // Drive the left-to-right entrance animation for the dropdown panel
  useEffect(() => {
    if (open) {
      setPanelEntered(false);
      const raf = requestAnimationFrame(() => setPanelEntered(true));
      return () => cancelAnimationFrame(raf);
    }
    setPanelEntered(false);
  }, [open]);

  function handleToggle() {
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const left = Math.min(
        Math.max(8, rect.right - SHOP_PANEL_WIDTH),
        window.innerWidth - SHOP_PANEL_WIDTH - 8
      );
      setPanelPos({ top: rect.bottom + 8, left });
      setHasOpenedOnce(true);
    }
    setOpen((v) => !v);
  }

  return (
    <div className="flex justify-center">
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        title={canSwitch ? "Switch location" : undefined}
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn(
          "inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-full border border-primary/30 bg-primary/20 px-3 backdrop-blur-sm",
          canSwitch ? "" : "opacity-80"
        )}
      >
        <span className="flex items-center justify-center">
          <MapPin className="size-3.5 text-primary" />
        </span>
        <span className="pointer-events-none min-w-0 flex-1 truncate text-sm font-medium text-sidebar-text">
          {shopDetails?.label ? shopDetails.label : "Shop 1"}
        </span>
        {canSwitch && <ChevronDown className="pointer-events-none size-3 shrink-0 text-sidebar-text/70" />}
      </button>

      {mounted &&
        hasOpenedOnce &&
        createPortal(
          <div
            ref={panelRef}
            className="overflow-hidden rounded-2xl border border-primary/30 bg-linear-to-br from-sidebar-bg/95 to-sidebar-bg/70 shadow-2xl backdrop-blur-md"
            style={{
              position: "fixed",
              top: panelPos.top,
              left: panelPos.left,
              width: SHOP_PANEL_WIDTH,
              maxWidth: "calc(100vw - 16px)",
              zIndex: 1050,
              boxShadow: "0 8px 32px 0 rgba(31, 38, 135, 0.45)",
              transformOrigin: "top right",
              transform: panelEntered ? "scale(1)" : "scale(0.95) translateY(-6px)",
              opacity: panelEntered ? 1 : 0,
              pointerEvents: panelEntered ? "auto" : "none",
              transition: "transform 180ms ease, opacity 150ms ease",
            }}
          >
            <div className="flex items-center justify-between border-b border-primary/20 px-5 py-3">
              <span className="text-sm font-semibold text-sidebar-text">Switch Location</span>
            </div>
            <ul className="py-2">
              {shops.map((option) => (
                <li
                  key={option.value}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 px-5 py-3 transition-colors hover:bg-sidebar-bg-hover/50",
                    option.value === shopId && "bg-primary/10"
                  )}
                  onClick={() => {
                    selectShop(option);
                    setOpen(false);
                  }}
                >
                  <span className="flex items-center text-base text-sidebar-text">
                    <MapPin className="size-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-sidebar-text">
                      {option.label}
                    </span>
                    {option.location && (
                      <span className="block truncate text-xs text-sidebar-text/70">
                        {option.location}
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>,
          document.body
        )}
    </div>
  );
}

function RegisterSwitcher() {
  // Mirrors whatever RegisterDrawerModal (POS pages) last selected — it
  // persists to localStorage and broadcasts registerDrawerSelected /
  // registerDrawerClosed CustomEvents on window, same contract the POS
  // pages themselves listen to for their own register-ready state.
  const [registerName, setRegisterName] = useState("");
  const [drawerName, setDrawerName] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    setRegisterName(localStorage.getItem("registerName") || "");
    setDrawerName(localStorage.getItem("drawerName") || "");

    const handleSelected = (e: any) => {
      const { registerName: rn, drawerName: dn } = e.detail || {};
      if (rn !== undefined) setRegisterName(rn || "");
      if (dn !== undefined) setDrawerName(dn || "");
    };
    // RegisterDrawerModal only dispatches this when the closed drawer was
    // the active one, and it has already cleared drawerId/drawerName from
    // localStorage by the time it does — just re-sync from there.
    const handleClosed = () => {
      setDrawerName(localStorage.getItem("drawerName") || "");
    };
    window.addEventListener("registerDrawerSelected", handleSelected);
    window.addEventListener("registerDrawerClosed", handleClosed);
    return () => {
      window.removeEventListener("registerDrawerSelected", handleSelected);
      window.removeEventListener("registerDrawerClosed", handleClosed);
    };
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        title="Select register"
        className="inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-full border border-primary/30 bg-primary/20 px-3 backdrop-blur-sm"
      >
        <Monitor className="size-3.5 shrink-0 text-primary" />
        <span className="pointer-events-none min-w-0 flex-1 truncate text-sm font-medium text-sidebar-text">
          {registerName || "Select Register"}
        </span>
        {drawerName && (
          <span className="pointer-events-none shrink-0 text-[10px] font-medium text-sidebar-text/70">
            {drawerName}
          </span>
        )}
      </button>
      <RegisterDrawerModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}

export default function Topbar() {
  const { isMobile, toggleMobile } = useSidebar();
  const [isAnnouncementDrawerOpen, setIsAnnouncementDrawerOpen] = useState(false);
  const [isLeaflyDrawerOpen, setIsLeaflyDrawerOpen] = useState(false);
  const { user, checkPermission } = usePermission();
  const dispatch: any = useDispatch();
  const { token: chatToken } = useSelector((state: any) => state.chat);
  const canUseChat = checkPermission("ECOMM_CHAT");

  useEffect(() => {
    if (!canUseChat || !user) return;
    if (chatToken) {
      dispatch(getChatSessions());
    } else {
      dispatch(chatLogin({ user }));
    }
  }, [canUseChat, user, chatToken, dispatch]);

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
        <button
          type="button"
          onClick={() => setIsLeaflyDrawerOpen(true)}
          title="Leafly Orders"
          className="relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-white/30 hover:shadow-sm"
          aria-label="Open Leafly Orders"
        >
          <Leaf className="size-4.5 text-white" />
        </button>
        <RegisterSwitcher />
        <ShopSwitcher />
        {isMobile && <UserProfile collapsed />}
      </div>

      <AnnouncementDrawer
        open={isAnnouncementDrawerOpen}
        onClose={() => setIsAnnouncementDrawerOpen(false)}
      />
      <LeaflyOrdersDrawer
        open={isLeaflyDrawerOpen}
        onClose={() => setIsLeaflyDrawerOpen(false)}
      />
    </header>
  );
}
