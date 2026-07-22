"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { ChevronDown, LogOut, UserRound } from "lucide-react";
import { logout } from "@/util/use-auth";
import { cn } from "@/lib/utils";

function readUser() {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(localStorage.getItem("userInfo"));
  } catch {
    return null;
  }
}

export default function UserProfile({ collapsed }) {
  const router = useRouter();
  const buttonRef = useRef(null);
  const panelRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [panelPos, setPanelPos] = useState({ top: 0, left: 0 });
  const [user, setUser] = useState(null);

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
      const left = Math.min(Math.max(8, rect.left), window.innerWidth - width - 8);
      setPanelPos({ top: rect.bottom + 8, left });
    }
    setOpen((v) => !v);
  }

  function handleLogout() {
    setOpen(false);
    logout();
    router.replace("/signin");
  }

  return (
    <div>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        className={cn(
          "inline-flex h-9 items-center justify-center gap-2 rounded-full border border-primary/30 bg-gradient-to-r from-primary/20 to-primary/10 backdrop-blur-sm",
          collapsed ? "w-9" : "w-full max-w-[220px] px-3"
        )}
      >
        <img
          src={user?.avatarUrl || "/images/avatar.png"}
          alt=""
          className="size-[22px] shrink-0 rounded-full object-cover"
        />
        {!collapsed && (
          <>
            <span className="min-w-0 flex-1 truncate text-left text-sm font-medium text-sidebar-text">
              {user?.name || "Account"}
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
            <ul className="py-1.5">
              <li
                className="flex cursor-pointer items-center gap-3 px-4 py-2.5 text-sm text-sidebar-text transition-colors hover:bg-sidebar-bg-hover hover:text-white"
                onClick={() => {
                  setOpen(false);
                  router.push("/social-apps/profile");
                }}
              >
                <UserRound className="size-4" />
                Profile
              </li>
              <li
                className="flex cursor-pointer items-center gap-3 px-4 py-2.5 text-sm text-sidebar-text transition-colors hover:bg-sidebar-bg-hover hover:text-white"
                onClick={handleLogout}
              >
                <LogOut className="size-4" />
                Logout
              </li>
            </ul>
          </div>,
          document.body
        )}
    </div>
  );
}
