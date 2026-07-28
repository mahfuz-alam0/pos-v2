"use client";

import Link from "next/link";
import Image from "next/image";
import { Menu, PanelLeftClose, X } from "lucide-react";
import { useSidebar } from "@/context/sidebar-context";
import SidebarMenu from "./SidebarMenu";
import UserProfile from "./UserProfile";
import { retailMenu } from "./sidebar-menu-data";
import { cn } from "@/lib/utils";

function SidebarInner({
  collapsed,
  onNavigate,
  onCloseMobile,
  onToggleCollapsed,
}: {
  collapsed?: boolean
  onNavigate?: () => void
  onCloseMobile?: () => void
  onToggleCollapsed?: () => void
}) {
  return (
    <div className="flex h-full flex-col bg-accent">
      {/* Old app's gx-layout-sider-header: 72px tall, flat sider color, fold
          icon pinned left, logo at 75% width; collapsed shows the icon only. */}
      <div
        className={cn(
          "relative z-1 flex h-18 shrink-0 items-center py-2.5 pr-7.5 pl-17.5",
          collapsed && "justify-center px-5",
          onCloseMobile && "pl-7.5"
        )}
      >
        {onCloseMobile ? (
          <button
            type="button"
            onClick={onCloseMobile}
            className="absolute top-1/2 right-3 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-sidebar-text hover:bg-sidebar-bg-hover hover:text-white"
            aria-label="Close menu"
          >
            <X className="size-4" />
          </button>
        ) : null}
        {onToggleCollapsed ? (
          <button
            type="button"
            onClick={onToggleCollapsed}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={cn(
              "flex size-8 items-center justify-center text-white/80 transition-all duration-300 ease-out hover:text-white",
              collapsed ? "shrink-0" : "absolute top-1/2 left-5 -translate-y-1/2"
            )}
          >
            {collapsed ? <Menu className="size-4.5" /> : <PanelLeftClose className="size-4.5" />}
          </button>
        ) : null}
        {!collapsed && (
          <Link href="/" className="block w-4/5">
            <Image
              src="/logos/bleaum_logo.png"
              alt="Bleaum"
              width={110}
              height={28}
              className="w-3/4 object-contain"
              priority
            />
          </Link>
        )}
      </div>

      <div className="shrink-0 p-2">
        <UserProfile collapsed={collapsed} />
      </div>

      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto py-2 scrollbar-none [&::-webkit-scrollbar]:hidden">
        <SidebarMenu items={retailMenu} collapsed={collapsed} onNavigate={onNavigate} />
      </div>
    </div>
  );
}

export default function Sidebar() {
  const { collapsed, isMobile, mobileOpen, toggleCollapsed, closeMobile } = useSidebar();

  if (isMobile) {
    return (
      <>
        <div
          className={cn(
            "fixed inset-0 z-40 bg-black/50 transition-opacity duration-200",
            mobileOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
          )}
          onClick={closeMobile}
          aria-hidden="true"
        />
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-50 w-70 max-w-[85vw] shadow-2xl transition-transform duration-300 ease-in-out will-change-transform",
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <SidebarInner collapsed={false} onNavigate={closeMobile} onCloseMobile={closeMobile} />
        </aside>
      </>
    );
  }

  return (
    <aside
      className={cn(
        "relative z-20 h-full shrink-0 transition-[width] duration-300 ease-in-out will-change-[width]",
        collapsed ? "w-18" : "w-62.5"
      )}
    >
      <SidebarInner collapsed={collapsed} onToggleCollapsed={toggleCollapsed} />
    </aside>
  );
}
