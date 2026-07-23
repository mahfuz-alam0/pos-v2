"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
      {!collapsed && (
        <span className="max-w-[160px] truncate opacity-100">{item.label}</span>
      )}
    </Link>
  );
}

function CollapsedSection({ item, sectionActive, onNavigate }) {
  const Icon = item.icon;
  const triggerRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  // Accordion within the flyout popup too — only one child section open at a time.
  const [childOpenKey, setChildOpenKey] = useState(null);

  const show = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPos({ top: rect.top, left: rect.right + 8 });
    }
    setOpen(true);
  };
  const hide = () => setOpen(false);

  return (
    <div
      ref={triggerRef}
      className="relative"
      onMouseEnter={show}
      onMouseLeave={hide}
    >
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
      {open && pos && typeof document !== "undefined"
        ? createPortal(
            <div
              style={{ position: "fixed", top: pos.top, left: pos.left, zIndex: 50 }}
              className="min-w-[200px] origin-left rounded-xl border border-primary/20 bg-accent p-1.5 shadow-2xl"
              onMouseEnter={show}
              onMouseLeave={hide}
            >
              <div className="px-2 py-1.5 text-xs font-semibold text-sidebar-text">{item.label}</div>
              {item.children.map((child) => (
                <SidebarMenuItem
                  key={child.key}
                  item={child}
                  collapsed={false}
                  depth={0}
                  onNavigate={onNavigate}
                  flyout
                  openKey={childOpenKey}
                  setOpenKey={setChildOpenKey}
                />
              ))}
            </div>,
            document.body
          )
        : null}
    </div>
  );
}

function MenuSection({ item, collapsed, depth, openKey, setOpenKey, onNavigate }) {
  const pathname = usePathname();
  const Icon = item.icon;
  const sectionActive = hasActiveDescendant(pathname, item);
  const isOpen = openKey === item.key;
  // Accordion among this section's own children (e.g. Analytics vs Reporting).
  const [childOpenKey, setChildOpenKey] = useState(null);

  // Auto-open the section that contains the active route on first render / route change.
  useEffect(() => {
    if (sectionActive) setOpenKey(item.key);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  if (collapsed && depth === 0) {
    // Collapsed rail: icon-only trigger, children render as a hover flyout.
    // The flyout is portaled to <body> and positioned via getBoundingClientRect
    // because the sidebar's scroll container is overflow-x-hidden (needed to
    // stop the rail itself from growing a horizontal scrollbar) — anything
    // absolutely positioned inside it with left-full gets clipped and never
    // becomes visible, no matter what z-index/opacity it has.
    return <CollapsedSection item={item} sectionActive={sectionActive} onNavigate={onNavigate} />;
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
              <SidebarMenuItem
                key={child.key}
                item={child}
                collapsed={false}
                depth={depth + 1}
                onNavigate={onNavigate}
                openKey={childOpenKey}
                setOpenKey={setChildOpenKey}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SidebarMenuItem({ item, collapsed, depth, onNavigate, flyout, openKey, setOpenKey }) {
  // Nested sections (depth > 0, e.g. Analytics/Reporting inside Reports & Analytics)
  // keep their own independent open state — only siblings at the same level
  // sharing `openKey`/`setOpenKey` collapse each other.
  const [localOpenKey, setLocalOpenKey] = useState(null);
  const effectiveOpenKey = openKey !== undefined ? openKey : localOpenKey;
  const effectiveSetOpenKey = setOpenKey ?? setLocalOpenKey;

  if (item.children?.length) {
    return (
      <MenuSection
        item={item}
        collapsed={collapsed && !flyout}
        depth={depth}
        openKey={effectiveOpenKey}
        setOpenKey={effectiveSetOpenKey}
        onNavigate={onNavigate}
      />
    );
  }
  return <MenuLeaf item={item} collapsed={collapsed && !flyout} depth={depth} onNavigate={onNavigate} />;
}

export default function SidebarMenu({ items, collapsed, onNavigate }) {
  // Accordion: only one top-level section open at a time.
  const [openKey, setOpenKey] = useState(null);

  return (
    <nav className="flex flex-col gap-0.5 px-2">
      {items.map((item) => (
        <SidebarMenuItem
          key={item.key}
          item={item}
          collapsed={collapsed}
          depth={0}
          onNavigate={onNavigate}
          openKey={openKey}
          setOpenKey={setOpenKey}
        />
      ))}
    </nav>
  );
}
