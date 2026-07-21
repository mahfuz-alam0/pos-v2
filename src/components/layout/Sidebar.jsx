"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, PanelLeftClose, PanelLeftOpen, Store } from "lucide-react";
import { usePermission } from "@/util/permission";
import { NAV_SECTIONS } from "./nav-config";
import { filterNav } from "./guard";

function isActive(pathname, item) {
  if (item.href) return pathname === item.href || pathname.startsWith(`${item.href}/`);
  if (item.children) return item.children.some((c) => isActive(pathname, c));
  return false;
}

function NavGroup({ item, depth, pathname, collapsed, openKeys, toggleKey }) {
  const active = isActive(pathname, item);
  const Icon = item.icon;
  const isOpen = openKeys.has(item.key ?? item.label);

  if (!item.children) {
    return (
      <Link
        href={item.href}
        className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-200 ease-in-out ${
          depth > 0 ? "ml-3 pl-6" : ""
        } ${
          active
            ? "text-primary font-medium"
            : "text-sidebar-text hover:bg-sidebar-bg-hover hover:text-white"
        }`}
      >
        {Icon && <Icon size={17} strokeWidth={2} className="shrink-0" />}
        {!collapsed && <span className="truncate">{item.label}</span>}
      </Link>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => toggleKey(item.key ?? item.label)}
        className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-200 ease-in-out ${
          depth > 0 ? "ml-3 pl-6" : ""
        } ${
          active && !isOpen
            ? "text-primary font-medium"
            : "text-sidebar-text hover:bg-sidebar-bg-hover hover:text-white"
        }`}
      >
        {Icon && <Icon size={17} strokeWidth={2} className="shrink-0" />}
        {!collapsed && (
          <>
            <span className="flex-1 truncate text-left">{item.label}</span>
            <ChevronDown
              size={15}
              className={`transition-transform duration-200 ease-in-out ${isOpen ? "rotate-0" : "-rotate-90"}`}
            />
          </>
        )}
      </button>

      {!collapsed && (
        <div
          className={`grid transition-all duration-200 ease-in-out ${
            isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
          }`}
        >
          <div className="overflow-hidden">
            <div className="mt-0.5 flex flex-col gap-0.5 border-l border-white/10 ml-[1.15rem] pl-1">
              {item.children.map((child) => (
                <NavGroup
                  key={child.key ?? child.label}
                  item={child}
                  depth={depth + 1}
                  pathname={pathname}
                  collapsed={collapsed}
                  openKeys={openKeys}
                  toggleKey={toggleKey}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Sidebar({ collapsed, onToggleCollapsed, mobileOpen, onCloseMobile }) {
  const pathname = usePathname();
  const permission = usePermission();
  const nav = useMemo(() => filterNav(NAV_SECTIONS, permission), [permission]);

  const [openKeys, setOpenKeys] = useState(() => {
    const active = nav.find((item) => isActive(pathname, item));
    return new Set(active ? [active.key ?? active.label] : []);
  });

  const toggleKey = (key) => {
    setOpenKeys((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-sidebar-bg transition-[width,transform] duration-200 ease-in-out lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
          collapsed ? "w-[76px]" : "w-[264px]"
        } ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
      >
        <div className="flex h-16 shrink-0 items-center gap-2 px-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-on-primary">
            <Store size={18} strokeWidth={2.4} />
          </div>
          {!collapsed && (
            <span className="truncate text-[15px] font-bold tracking-tight text-white">
              POS Admin
            </span>
          )}
          <button
            type="button"
            onClick={onToggleCollapsed}
            className="ml-auto hidden h-8 w-8 shrink-0 items-center justify-center rounded-md text-sidebar-text hover:bg-sidebar-bg-hover hover:text-white lg:flex"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-2.5 pb-4 [scrollbar-width:thin]">
          <div className="flex flex-col gap-0.5">
            {nav.map((item) => (
              <NavGroup
                key={item.key ?? item.label}
                item={item}
                depth={0}
                pathname={pathname}
                collapsed={collapsed}
                openKeys={openKeys}
                toggleKey={toggleKey}
              />
            ))}
          </div>
        </nav>
      </aside>
    </>
  );
}
