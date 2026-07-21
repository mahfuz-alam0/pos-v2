"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, ChevronDown, LogOut, Menu, Search, User } from "lucide-react";
import { logout } from "@/util/use-auth";
import { useAuthUser } from "@/util/permission";

export default function Header({ onOpenMobile }) {
  const router = useRouter();
  const user = useAuthUser();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function onClickAway(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onClickAway);
    return () => document.removeEventListener("mousedown", onClickAway);
  }, []);

  const handleLogout = () => {
    logout();
    router.replace("/signin");
  };

  const name = user?.name || user?.fullName || user?.email || "Account";
  const initial = name.charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 bg-accent px-4 sm:px-6">
      <button
        type="button"
        onClick={onOpenMobile}
        className="flex h-9 w-9 items-center justify-center rounded-md text-sidebar-text hover:bg-sidebar-bg-hover hover:text-white lg:hidden"
        aria-label="Open menu"
      >
        <Menu size={19} />
      </button>

      <div className="relative hidden max-w-sm flex-1 sm:block">
        <Search
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sidebar-text"
        />
        <input
          type="search"
          placeholder="Search orders, products, customers…"
          className="h-9 w-full rounded-lg border border-white/10 bg-white/5 pl-9 pr-3 text-sm text-white placeholder:text-sidebar-text outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary-soft"
        />
      </div>

      <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
        <button
          type="button"
          className="relative flex h-9 w-9 items-center justify-center rounded-md text-sidebar-text hover:bg-sidebar-bg-hover hover:text-white"
          aria-label="Notifications"
        >
          <Bell size={18} />
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-destructive" />
        </button>

        <div className="mx-1 h-6 w-px bg-white/10" />

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2 rounded-lg py-1 pl-1 pr-2 text-sm hover:bg-sidebar-bg-hover"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-on-primary">
              {initial || <User size={15} />}
            </span>
            <span className="hidden max-w-[9rem] truncate font-medium text-white sm:inline">
              {name}
            </span>
            <ChevronDown size={14} className="hidden text-sidebar-text sm:inline" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-2 w-52 overflow-hidden rounded-lg border border-border bg-component-bg py-1 shadow-lg">
              <div className="truncate border-b border-border px-3 py-2 text-xs text-muted-foreground">
                {user?.email || name}
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-text hover:bg-surface-alt"
              >
                <LogOut size={15} />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
