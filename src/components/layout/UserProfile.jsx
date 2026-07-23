"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  Bell,
  ChevronDown,
  History,
  LogIn,
  LogOut,
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
      style={{ position: "fixed", top: pos.top, left: pos.left, width: 320, zIndex: 1050 }}
      className="overflow-hidden rounded-2xl border border-primary/20 bg-accent shadow-2xl"
    >
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <span className="text-sm font-semibold text-white">Notifications</span>
      </div>
      <div className="flex h-[160px] items-center justify-center text-sm text-sidebar-text">
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

  function handleToggle() {
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const width = 260;
      const estimatedPanelHeight = 260;
      const left = Math.min(Math.max(8, rect.left), window.innerWidth - width - 8);
      const openUpward = window.innerHeight - rect.bottom < estimatedPanelHeight + 16 && rect.top > estimatedPanelHeight + 16;
      const top = openUpward ? rect.top - estimatedPanelHeight - 8 : rect.bottom + 8;
      setPanelPos({ top, left });
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
      onClick: () => {
        setOpen(false);
        router.push("/social-apps/profile");
      },
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
    <div>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        title={collapsed ? user?.name || "Account" : undefined}
        className={cn(
          "flex w-full items-center gap-2.5 rounded-xl border border-primary/30 bg-gradient-to-r from-primary/20 to-primary/10 backdrop-blur-sm transition-colors hover:from-primary/25 hover:to-primary/15",
          collapsed ? "h-10 w-10 justify-center px-0" : "px-2.5 py-2"
        )}
      >
        <img
          src={user?.avatarUrl || "/images/avatar.png"}
          alt=""
          className="size-8 shrink-0 rounded-full object-cover"
        />
        {!collapsed && (
          <>
            <span className="min-w-0 flex-1 text-left">
              <span className="block truncate text-sm font-medium text-white">
                {user?.name || "Account"}
              </span>
              <span className="block truncate text-xs text-sidebar-text">
                {user?.email || (user?.type ? user.type.replaceAll("_", " ") : "")}
              </span>
            </span>
            <ChevronDown className="size-3.5 shrink-0 text-sidebar-text" />
          </>
        )}
      </button>

      {mounted &&
        open &&
        createPortal(
          <div
            ref={panelRef}
            style={{ position: "fixed", top: panelPos.top, left: panelPos.left, width: 260, zIndex: 1050 }}
            className="overflow-hidden rounded-2xl border border-primary/20 bg-accent shadow-2xl"
          >
            <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
              <img
                src={user?.avatarUrl || "/images/avatar.png"}
                alt=""
                className="size-9 shrink-0 rounded-full object-cover"
              />
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-white">{user?.name || "Account"}</div>
                {user?.type && (
                  <div className="truncate text-xs text-sidebar-text">{user.type.replaceAll("_", " ")}</div>
                )}
              </div>
            </div>

            {/* Quick actions row — chat/activity-log ported from old app's
                AppsNavigation; chat is dropped since its target route
                (/in-built-apps/chat) doesn't exist in this app yet, and the
                full activity-log drawer is a large standalone feature kept
                as a lightweight entry point for now. */}
            <div className="flex items-center justify-center gap-2 border-b border-white/10 px-3 py-3">
              <button
                ref={notifyButtonRef}
                type="button"
                onClick={() => setNotifyOpen((v) => !v)}
                className="flex size-9 items-center justify-center rounded-lg text-sidebar-text transition-colors hover:bg-sidebar-bg-hover hover:text-white"
                title="Notifications"
              >
                <Bell className="size-[18px]" />
              </button>
              <a
                href="https://support.bleaum.io/"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setOpen(false)}
                className="flex size-9 items-center justify-center rounded-lg text-sidebar-text transition-colors hover:bg-sidebar-bg-hover hover:text-white"
                title="Support"
              >
                <View className="size-[18px]" />
              </a>
              <button
                type="button"
                title="Activity Logs"
                onClick={() => {
                  setOpen(false);
                  router.push("/admin/activity-log");
                }}
                className="flex size-9 items-center justify-center rounded-lg text-sidebar-text transition-colors hover:bg-sidebar-bg-hover hover:text-white"
              >
                <History className="size-[18px]" />
              </button>
            </div>

            <ul className="py-1.5">
              {menuOptions.map((option) => (
                <li
                  key={option.label}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-sidebar-bg-hover",
                    option.danger ? "text-red-400 hover:text-red-300" : "text-sidebar-text hover:text-white"
                  )}
                  onClick={option.onClick}
                >
                  <option.icon className="size-4" />
                  {option.label}
                </li>
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
