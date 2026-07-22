"use client";

import Link from "next/link";
import Image from "next/image";
import { PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import { useSidebar } from "@/context/sidebar-context";
import SidebarMenu from "./SidebarMenu";
import UserProfile from "./UserProfile";
import { retailMenu } from "./sidebar-menu-data";
import { cn } from "@/lib/utils";

function SidebarInner({ collapsed, onNavigate, onCloseMobile }) {
  return (
    <div className="flex h-full flex-col bg-accent">
      <div className={cn("flex h-14 shrink-0 items-center gap-2 border-b border-white/10 px-3", collapsed && "justify-center px-2")}>
        {onCloseMobile ? (
          <button
            type="button"
            onClick={onCloseMobile}
            className="flex size-8 items-center justify-center rounded-lg text-sidebar-text hover:bg-sidebar-bg-hover hover:text-white"
            aria-label="Close menu"
          >
            <X className="size-4" />
          </button>
        ) : null}
        <Link href="/" className={cn("flex min-w-0 flex-1 items-center", collapsed && "justify-center")}>
          {collapsed ? (
            <Image src="/logos/mark.png" alt="Bleaum" width={28} height={28} className="shrink-0" />
          ) : (
            <Image src="/logos/bleaum_logo.png" alt="Bleaum" width={110} height={28} className="max-w-[75%] object-contain" />
          )}
        </Link>
      </div>

      <div className="border-b border-white/10 px-3 py-3">
        <UserProfile collapsed={collapsed} />
      </div>

      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
            "fixed inset-y-0 left-0 z-50 w-[280px] max-w-[85vw] shadow-2xl transition-transform duration-300 ease-in-out will-change-transform",
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
        collapsed ? "w-[72px]" : "w-[250px]"
      )}
    >
      <SidebarInner collapsed={collapsed} />
      <button
        type="button"
        onClick={toggleCollapsed}
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className="absolute top-3 -right-3 flex size-6 items-center justify-center rounded-full border border-primary/30 bg-component-bg text-primary shadow transition-colors hover:text-primary-hover"
      >
        {collapsed ? <PanelLeftOpen className="size-3.5" /> : <PanelLeftClose className="size-3.5" />}
      </button>
    </aside>
  );
}
