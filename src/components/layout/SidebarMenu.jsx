"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

function isActive(pathname, href) {
  if (!href) return false;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function hasActiveDescendant(pathname, item) {
  if (item.href) return isActive(pathname, item.href);
  return (item.children || []).some((child) => hasActiveDescendant(pathname, child));
}

function MenuLeaf({ item, collapsed, depth, onNavigate }) {
  const pathname = usePathname();
  const active = isActive(pathname, item.href);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      title={collapsed ? item.label : undefined}
      className={cn(
        "flex items-center gap-3 rounded-lg text-sm font-medium transition-colors",
        collapsed ? "mx-auto my-0.5 h-10 w-10 justify-center" : "px-3 py-2",
        depth > 0 && !collapsed && "pl-9",
        active
          ? "bg-sidebar-bg-hover text-white"
          : "text-sidebar-text hover:bg-sidebar-bg-hover hover:text-white"
      )}
    >
      {Icon ? <Icon className="size-[18px] shrink-0" /> : null}
      <span
        className={cn(
          "truncate transition-[opacity,max-width] duration-200",
          collapsed ? "max-w-0 opacity-0" : "max-w-[160px] opacity-100"
        )}
      >
        {item.label}
      </span>
    </Link>
  );
}

function MenuSection({ item, collapsed, depth, openKey, setOpenKey, onNavigate }) {
  const pathname = usePathname();
  const Icon = item.icon;
  const sectionActive = hasActiveDescendant(pathname, item);
  const isOpen = openKey === item.key;

  // Auto-open the section that contains the active route on first render / route change.
  useEffect(() => {
    if (sectionActive) setOpenKey(item.key);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  if (collapsed && depth === 0) {
    // Collapsed rail: icon-only trigger, children render as a hover flyout.
    return (
      <div className="group relative">
        <button
          type="button"
          title={item.label}
          className={cn(
            "mx-auto my-0.5 flex h-10 w-10 items-center justify-center rounded-lg transition-colors",
            sectionActive
              ? "bg-sidebar-bg-hover text-white"
              : "text-sidebar-text hover:bg-sidebar-bg-hover hover:text-white"
          )}
        >
          {Icon ? <Icon className="size-[18px]" /> : null}
        </button>
        <div className="pointer-events-none absolute top-0 left-full z-50 ml-2 min-w-[200px] origin-left -translate-x-1 scale-95 rounded-xl border border-primary/20 bg-accent p-1.5 opacity-0 shadow-2xl transition-[opacity,transform] duration-150 ease-out group-hover:pointer-events-auto group-hover:translate-x-0 group-hover:scale-100 group-hover:opacity-100">
          <div className="px-2 py-1.5 text-xs font-semibold text-sidebar-text">{item.label}</div>
          {item.children.map((child) => (
            <SidebarMenuItem key={child.key} item={child} collapsed={false} depth={0} onNavigate={onNavigate} flyout />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpenKey(isOpen ? null : item.key)}
        className={cn(
          "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
          depth > 0 && "pl-9",
          sectionActive
            ? "text-white"
            : "text-sidebar-text hover:bg-sidebar-bg-hover hover:text-white"
        )}
      >
        {Icon ? <Icon className="size-[18px] shrink-0" /> : null}
        <span className="flex-1 truncate text-left">{item.label}</span>
        <ChevronDown className={cn("size-4 shrink-0 transition-transform duration-200", isOpen && "rotate-180")} />
      </button>
      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-200 ease-out",
          isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        <div className="overflow-hidden">
          <div className="mt-0.5 ml-3 space-y-0.5 border-l border-white/10 pl-1">
            {item.children.map((child) => (
              <SidebarMenuItem key={child.key} item={child} collapsed={false} depth={depth + 1} onNavigate={onNavigate} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SidebarMenuItem({ item, collapsed, depth, onNavigate, flyout }) {
  const [openKey, setOpenKey] = useState(null);

  if (item.children?.length) {
    return (
      <MenuSection
        item={item}
        collapsed={collapsed && !flyout}
        depth={depth}
        openKey={openKey}
        setOpenKey={setOpenKey}
        onNavigate={onNavigate}
      />
    );
  }
  return <MenuLeaf item={item} collapsed={collapsed && !flyout} depth={depth} onNavigate={onNavigate} />;
}

export default function SidebarMenu({ items, collapsed, onNavigate }) {
  return (
    <nav className="flex flex-col gap-0.5 px-2">
      {items.map((item) => (
        <SidebarMenuItem key={item.key} item={item} collapsed={collapsed} depth={0} onNavigate={onNavigate} />
      ))}
    </nav>
  );
}
