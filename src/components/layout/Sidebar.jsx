"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  Receipt,
  BarChart3,
  Settings,
  ChevronLeft,
  Zap,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/pos", label: "Sale (POS)", icon: ShoppingCart },
  { href: "/products", label: "Products", icon: Package },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/orders", label: "Orders", icon: Receipt },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

function NavRow({ href, label, icon: Icon, active, collapsed }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        className={`group flex items-center rounded-xl text-sm font-medium transition-all duration-200 ease-out ${
          collapsed ? "justify-center h-11 w-11 mx-auto" : "gap-3 h-11 px-3"
        } ${
          active
            ? "bg-primary text-on-primary shadow-[0_4px_14px_-4px_var(--color-primary)]"
            : "text-sidebar-text hover:bg-sidebar-bg-hover hover:text-white"
        }`}
      >
        <span
          className={`flex items-center justify-center shrink-0 rounded-lg transition-colors ${
            collapsed ? "h-9 w-9" : "h-8 w-8"
          } ${active ? "bg-white/15" : "group-hover:bg-white/5"}`}
        >
          <Icon size={18} strokeWidth={2} />
        </span>
        {!collapsed && <span className="truncate">{label}</span>}
        {!collapsed && active && (
          <span className="ml-auto h-1.5 w-1.5 rounded-full bg-on-primary" />
        )}
      </Link>

      {collapsed && hovered && (
        <div
          role="tooltip"
          className="absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 whitespace-nowrap rounded-lg bg-[#14213d] px-3 py-1.5 text-xs font-medium text-white shadow-lg animate-in fade-in slide-in-from-left-1 duration-150"
        >
          {label}
          <span className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-[#14213d]" />
        </div>
      )}
    </div>
  );
}

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  return (
    <aside
      className={`relative flex flex-col h-screen shrink-0 bg-sidebar-bg transition-[width] duration-300 ease-in-out ${
        collapsed ? "w-[84px]" : "w-64"
      }`}
    >
      <div
        className={`flex items-center h-16 shrink-0 ${collapsed ? "justify-center px-0" : "gap-2.5 px-5"}`}
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-on-primary shrink-0">
          <Zap size={18} strokeWidth={2.5} />
        </div>
        {!collapsed && (
          <span className="text-white font-semibold text-lg tracking-tight truncate">
            Bleaum
          </span>
        )}
      </div>

      <nav
        className={`flex-1 overflow-y-auto py-3 flex flex-col gap-1 ${collapsed ? "px-3" : "px-3"}`}
      >
        {NAV_ITEMS.map(({ href, label, icon }) => {
          const active = pathname === href || pathname?.startsWith(`${href}/`);
          return (
            <NavRow
              key={href}
              href={href}
              label={label}
              icon={icon}
              active={active}
              collapsed={collapsed}
            />
          );
        })}
      </nav>

      <div className={`py-3 border-t border-white/10 ${collapsed ? "px-3" : "px-3"}`}>
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={`flex items-center h-11 w-full rounded-xl text-sm font-medium text-sidebar-text hover:bg-sidebar-bg-hover hover:text-white transition-colors ${
            collapsed ? "justify-center" : "gap-3 px-3"
          }`}
        >
          <ChevronLeft
            size={18}
            className={`shrink-0 transition-transform duration-300 ${collapsed ? "rotate-180" : ""}`}
          />
          {!collapsed && <span className="truncate">Collapse Sidebar</span>}
        </button>
      </div>

      {/* Edge toggle handle, sits on the sidebar's border */}
      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className="absolute top-7 -right-3 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-on-primary shadow-md hover:bg-primary-hover transition-colors"
      >
        <ChevronLeft
          size={14}
          className={`transition-transform duration-300 ${collapsed ? "rotate-180" : ""}`}
        />
      </button>
    </aside>
  );
}
