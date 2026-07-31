"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  ChevronDown,
  History,
  LogIn,
  LogOut,
  MessageCircle,
  Repeat,
  UserRound,
  View,
} from "lucide-react";
import { logout } from "@/util/use-auth";
import { useLiveShift } from "@/hooks/useLiveShift";
import { useShareMode } from "@/hooks/useShareMode";
import { cn } from "@/lib/utils";
import PinPadModal from "./PinPadModal";
import TurnOffShareModeModal from "./TurnOffShareModeModal";

const PANEL_WIDTH = 340;

function readUser() {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(localStorage.getItem("userInfo"));
  } catch {
    return null;
  }
}

function NotificationsPopover({ open, anchorRef, onClose }) {
  const panelRef = useRef(null);
  const [pos, setPos] = useState(null);

  useEffect(() => {
    if (open && anchorRef.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 8, left: Math.min(rect.left, window.innerWidth - 320 - 8) });
    }
  }, [open, anchorRef]);

  useEffect(() => {
    if (!open) return;
    function handleOutside(e) {
      const clickedAnchor = anchorRef.current?.contains(e.target);
      const clickedPanel = panelRef.current?.contains(e.target);
      if (!clickedAnchor && !clickedPanel) onClose();
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open, anchorRef, onClose]);

  if (!open || !pos || typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={panelRef}
      style={{
        position: "fixed",
        top: pos.top,
        left: pos.left,
        width: 320,
        zIndex: 1060,
        boxShadow: "0 8px 32px 0 rgba(31, 38, 135, 0.45)",
      }}
      className="overflow-hidden rounded-2xl border border-primary/30 bg-linear-to-br from-sidebar-bg/95 to-sidebar-bg/70 backdrop-blur-md"
    >
      <div className="flex items-center justify-between border-b border-primary/20 px-4 py-3">
        <span className="text-sm font-semibold text-sidebar-text">Notifications</span>
      </div>
      <div className="flex h-40 items-center justify-center text-sm text-sidebar-text/70">
        No Notifications Found
      </div>
    </div>,
    document.body
  );
}

export default function UserProfile({ collapsed }) {
  const router = useRouter();
  const buttonRef = useRef(null);
  const panelRef = useRef(null);
  const notifyButtonRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [panelPos, setPanelPos] = useState({ top: 0, left: 0 });
  const [panelEntered, setPanelEntered] = useState(false);
  const [hasOpenedOnce, setHasOpenedOnce] = useState(false);
  const [user, setUser] = useState(null);

  const [clockModalOpen, setClockModalOpen] = useState(false);
  const [shareOnModalOpen, setShareOnModalOpen] = useState(false);
  const [shareOffModalOpen, setShareOffModalOpen] = useState(false);

  const liveShift = useLiveShift();
  const shareMode = useShareMode();

  useEffect(() => {
    setMounted(true);
    setUser(readUser());
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
        Math.max(8, rect.right - PANEL_WIDTH),
        window.innerWidth - PANEL_WIDTH - 8
      );
      setPanelPos({ top: rect.bottom + 8, left });
      setHasOpenedOnce(true);
    }
    setOpen((v) => !v);
  }

  function handleLogout() {
    setOpen(false);
    logout();
    router.replace("/signin");
  }

  async function handleClockSubmit(pin) {
    const ok = liveShift.liveShiftData ? await liveShift.endShift(pin) : await liveShift.startShift(pin);
    if (ok) setClockModalOpen(false);
  }

  const [shareOnError, setShareOnError] = useState("");
  const [shareOffError, setShareOffError] = useState("");
  const [shareOnSubmitting, setShareOnSubmitting] = useState(false);
  const [shareOffSubmitting, setShareOffSubmitting] = useState(false);

  async function submitShareOn(pin) {
    setShareOnSubmitting(true);
    setShareOnError("");
    try {
      const res = await shareMode.turnOn(pin);
      if (res.success) setShareOnModalOpen(false);
      else setShareOnError(res.message);
    } catch (err) {
      setShareOnError(err.message || "Something went wrong");
    } finally {
      setShareOnSubmitting(false);
    }
  }

  async function submitShareOff(password) {
    setShareOffSubmitting(true);
    setShareOffError("");
    try {
      const res = await shareMode.turnOff(password);
      if (res.success) setShareOffModalOpen(false);
      else setShareOffError(res.message);
    } catch (err) {
      setShareOffError(err.message || "Something went wrong");
    } finally {
      setShareOffSubmitting(false);
    }
  }

  const menuOptions = [
    {
      icon: LogIn,
      label: liveShift.liveShiftData ? "Clock Out" : "Clock In",
      danger: Boolean(liveShift.liveShiftData),
      onClick: () => {
        setOpen(false);
        setClockModalOpen(true);
      },
    },
    {
      icon: UserRound,
      label: "Profile",
      href: "/social-apps/profile",
    },
    {
      icon: Repeat,
      label: shareMode.active ? "Turn Off Share Mode" : "Turn On Share Mode",
      danger: shareMode.active,
      onClick: () => {
        setOpen(false);
        if (shareMode.active) setShareOffModalOpen(true);
        else setShareOnModalOpen(true);
      },
    },
    {
      icon: LogOut,
      label: "Logout",
      onClick: handleLogout,
    },
  ];

  return (
    <div className="flex justify-center">
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        title={collapsed ? user?.name || "Account" : undefined}
        className={cn(
          "inline-flex cursor-pointer items-center justify-center rounded-full border border-primary/30 bg-primary/20 backdrop-blur-sm",
          collapsed ? "h-9 w-9" : "h-9 max-w-55 gap-2 px-3"
        )}
      >
        <img
          src={user?.avatarUrl || "/images/avatar.png"}
          alt="avatar"
          className="pointer-events-none size-5.5 shrink-0 rounded-full object-cover"
        />
        {!collapsed && (
          <>
            <span className="pointer-events-none min-w-0 flex-1 truncate text-sm font-medium text-sidebar-text">
              {user?.name || "Account"}
            </span>
            <ChevronDown className="pointer-events-none size-3 shrink-0 text-sidebar-text/70" />
          </>
        )}
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
              width: PANEL_WIDTH,
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
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-primary/20 px-5 py-4">
              <img
                src={user?.avatarUrl || "/images/avatar.png"}
                alt=""
                className="size-10 shrink-0 rounded-full object-cover"
              />
              <div className="min-w-0">
                <div className="truncate text-base font-bold text-sidebar-text">
                  {user?.name || "Account"}
                </div>
                {user?.type && (
                  <div className="truncate text-xs text-sidebar-text/70">
                    {user.type.replaceAll("_", " ")}
                  </div>
                )}
              </div>
            </div>

            {/* Quick actions row ported from old app's AppsNavigation.
                Chat page (/in-built-apps/chat) is not built yet — icon is
                wired up ahead of the page landing. */}
            <div className="flex items-center justify-center gap-2 border-b border-primary/20 px-3 py-3">
              <Link
                href="/in-built-apps/chat"
                title="Chat"
                onClick={() => setOpen(false)}
                className="flex size-9 items-center justify-center rounded-lg text-sidebar-text/70 transition-colors hover:bg-sidebar-bg-hover/50 hover:text-sidebar-text"
              >
                <MessageCircle className="size-4.5" />
              </Link>
              <button
                ref={notifyButtonRef}
                type="button"
                onClick={() => setNotifyOpen((v) => !v)}
                className="flex size-9 cursor-pointer items-center justify-center rounded-lg text-sidebar-text/70 transition-colors hover:bg-sidebar-bg-hover/50 hover:text-sidebar-text"
                title="Notifications"
              >
                <Bell className="size-4.5" />
              </button>
              <a
                href="https://support.bleaum.io/"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setOpen(false)}
                className="flex size-9 items-center justify-center rounded-lg text-sidebar-text/70 transition-colors hover:bg-sidebar-bg-hover/50 hover:text-sidebar-text"
                title="Support"
              >
                <View className="size-4.5" />
              </a>
              <Link
                href="/admin/activity-log"
                title="Activity Logs"
                onClick={() => setOpen(false)}
                className="flex size-9 items-center justify-center rounded-lg text-sidebar-text/70 transition-colors hover:bg-sidebar-bg-hover/50 hover:text-sidebar-text"
              >
                <History className="size-4.5" />
              </Link>
            </div>

            {/* Account actions */}
            <ul className="py-2">
              {menuOptions.map((option) => (
                option.href ? (
                  <li key={option.label}>
                    <Link
                      href={option.href}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-sidebar-bg-hover/50"
                    >
                      <span className="flex items-center text-base text-sidebar-text">
                        <option.icon className="size-4" />
                      </span>
                      <span className="text-sm font-medium text-sidebar-text">{option.label}</span>
                    </Link>
                  </li>
                ) : (
                  <li
                    key={option.label}
                    className="flex cursor-pointer items-center gap-3 px-5 py-3 transition-colors hover:bg-sidebar-bg-hover/50"
                    onClick={option.onClick}
                  >
                    <span
                      className={cn(
                        "flex items-center text-base",
                        option.danger ? "text-red-500" : "text-sidebar-text"
                      )}
                    >
                      <option.icon className="size-4" />
                    </span>
                    <span
                      className={cn(
                        "text-sm font-medium",
                        option.danger ? "text-red-500" : "text-sidebar-text"
                      )}
                    >
                      {option.label}
                    </span>
                  </li>
                )
              ))}
            </ul>
          </div>,
          document.body
        )}

      <NotificationsPopover open={notifyOpen} anchorRef={notifyButtonRef} onClose={() => setNotifyOpen(false)} />

      <PinPadModal
        open={clockModalOpen}
        title={liveShift.liveShiftData ? "Enter PIN to Clock Out" : "Enter PIN to Clock In"}
        submitLabel={liveShift.liveShiftData ? "Clock Out" : "Clock In"}
        error={liveShift.error}
        submitting={liveShift.starting || liveShift.ending}
        onSubmit={handleClockSubmit}
        onClose={() => {
          setClockModalOpen(false);
          liveShift.clearError();
        }}
      />

      <PinPadModal
        open={shareOnModalOpen}
        title="Turn On Share Mode"
        submitLabel="Turn On Share Mode"
        error={shareOnError}
        submitting={shareOnSubmitting}
        onSubmit={submitShareOn}
        onClose={() => {
          setShareOnModalOpen(false);
          setShareOnError("");
        }}
      />

      <TurnOffShareModeModal
        open={shareOffModalOpen}
        error={shareOffError}
        submitting={shareOffSubmitting}
        onSubmit={submitShareOff}
        onClose={() => {
          setShareOffModalOpen(false);
          setShareOffError("");
        }}
      />
    </div>
  );
}
