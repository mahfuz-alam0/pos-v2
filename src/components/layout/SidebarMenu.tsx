"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIdlePrefetch } from "./useIdlePrefetch";
import type { MenuItem } from "./sidebar-menu-data";

type OpenKey = string | null;

interface AccordionProps {
  openKey?: OpenKey;
  setOpenKey?: (key: OpenKey) => void;
}

interface MenuLeafProps {
  item: MenuItem;
  collapsed?: boolean;
  depth: number;
  onNavigate?: () => void;
  activeHref: string | null;
}

interface CollapsedSectionProps {
  item: MenuItem;
  sectionActive: boolean;
  onNavigate?: () => void;
  activeHref: string | null;
}

interface MenuSectionProps extends AccordionProps {
  item: MenuItem;
  collapsed?: boolean;
  depth: number;
  onNavigate?: () => void;
  activeHref: string | null;
}

interface SidebarMenuItemProps extends AccordionProps {
  item: MenuItem;
  collapsed?: boolean;
  depth: number;
  onNavigate?: () => void;
  flyout?: boolean;
  activeHref: string | null;
}

interface SidebarMenuProps {
  items: MenuItem[];
  collapsed?: boolean;
  onNavigate?: () => void;
}

function collectHrefs(items: MenuItem[]): string[] {
  return items.flatMap((item) => [
    ...(item.href ? [item.href] : []),
    ...(item.children ? collectHrefs(item.children) : []),
  ]);
}

// Sibling routes can share a path prefix (e.g. "/pos" and "/pos/tablet-mode"
// are unrelated leaves, not parent/child) — matching each href independently
// against the pathname would light up both. Instead resolve the single
// longest (most specific) href in the whole tree that matches, so only the
// actual current route's item — and its ancestors — end up active.
function resolveActiveHref(pathname: string, hrefs: string[]): string | null {
  const matches = hrefs.filter((href) => pathname === href || pathname.startsWith(`${href}/`));
  if (!matches.length) return null;
  return matches.reduce((best, href) => (href.length > best.length ? href : best));
}

function subtreeContainsHref(item: MenuItem, activeHref: string | null): boolean {
  if (!activeHref) return false;
  if (item.href === activeHref) return true;
  return (item.children || []).some((child) => subtreeContainsHref(child, activeHref));
}

function MenuLeaf({ item, collapsed, depth, onNavigate, activeHref }: MenuLeafProps) {
  const active = item.href === activeHref;
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      title={collapsed ? item.label : undefined}
      prefetch={true}
      className={cn(
        "flex items-center gap-3 rounded-lg text-sm font-medium transition-colors",
        collapsed ? "mx-auto h-9 w-9 justify-center" : "px-3 py-2",
        depth > 0 && !collapsed && "pl-9",
        active ? "text-sidebar-active" : "text-sidebar-text hover:text-white"
      )}
    >
      {Icon ? <Icon className={cn("size-4.5 shrink-0", active && "text-white")} /> : null}
      {!collapsed && (
        <span className="max-w-40 truncate opacity-100">{item.label}</span>
      )}
    </Link>
  );
}

function CollapsedSection({ item, sectionActive, onNavigate, activeHref }: CollapsedSectionProps) {
  const Icon = item.icon;
  const triggerRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  // Accordion within the flyout popup too — only one child section open at a time.
  const [childOpenKey, setChildOpenKey] = useState<OpenKey>(null);

  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = () => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPos({ top: rect.top, left: rect.right });
    }
    setOpen(true);
  };
  const hide = () => {
    hideTimer.current = setTimeout(() => setOpen(false), 150);
  };

  useEffect(() => () => clearTimeout(hideTimer.current), []);

  // Mount at the slid-out position first, then flip to visible on the next
  // frame so the transition actually plays instead of snapping in.
  useEffect(() => {
    if (!open) {
      setVisible(false);
      return;
    }
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, [open]);

  // Clamp the flyout inside the viewport once its real height is known —
  // near the bottom of a tall menu, top-aligning to the trigger would
  // otherwise push it off-screen.
  useEffect(() => {
    if (!open || !popupRef.current) return;
    const rect = popupRef.current.getBoundingClientRect();
    const overflow = rect.bottom - window.innerHeight;
    if (overflow > 0) {
      setPos((p) => (p ? { ...p, top: Math.max(8, p.top - overflow) } : p));
    }
  }, [open]);

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
          "mx-auto flex h-9 w-9 items-center justify-center rounded-lg transition-colors",
          sectionActive ? "text-white" : "text-sidebar-text hover:text-white"
        )}
      >
        {Icon ? <Icon className="size-4.5" /> : null}
      </button>
      {open && pos && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={popupRef}
              style={{ position: "fixed", top: pos.top, left: pos.left, paddingLeft: 8, zIndex: 50 }}
              onMouseEnter={show}
              onMouseLeave={hide}
            >
              <div
                className={cn(
                  "min-w-50 origin-left rounded-xl border border-primary/20 bg-accent p-1.5 shadow-2xl max-h-[calc(100vh-1rem)] overflow-y-auto transition-all duration-150 ease-out",
                  visible ? "translate-x-0 opacity-100" : "-translate-x-2 opacity-0"
                )}
              >
                <div className="px-2 py-1.5 text-xs font-semibold text-sidebar-text">{item.label}</div>
                {item.children?.map((child) => (
                  <SidebarMenuItem
                    key={child.key}
                    item={child}
                    collapsed={false}
                    depth={0}
                    onNavigate={onNavigate}
                    flyout
                    openKey={childOpenKey}
                    setOpenKey={setChildOpenKey}
                    activeHref={activeHref}
                  />
                ))}
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}

function MenuSection({ item, collapsed, depth, openKey, setOpenKey, onNavigate, activeHref }: MenuSectionProps) {
  const Icon = item.icon;
  const sectionActive = subtreeContainsHref(item, activeHref);
  const isOpen = openKey === item.key;
  // Accordion among this section's own children (e.g. Analytics vs Reporting).
  const [childOpenKey, setChildOpenKey] = useState<OpenKey>(null);

  // Auto-open the section that contains the active route on first render / route change.
  useEffect(() => {
    if (sectionActive) setOpenKey?.(item.key);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeHref]);

  if (collapsed && depth === 0) {
    // Collapsed rail: icon-only trigger, children render as a hover flyout.
    // The flyout is portaled to <body> and positioned via getBoundingClientRect
    // because the sidebar's scroll container is overflow-x-hidden (needed to
    // stop the rail itself from growing a horizontal scrollbar) — anything
    // absolutely positioned inside it with left-full gets clipped and never
    // becomes visible, no matter what z-index/opacity it has.
    return <CollapsedSection item={item} sectionActive={sectionActive} onNavigate={onNavigate} activeHref={activeHref} />;
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpenKey?.(isOpen ? null : item.key)}
        className={cn(
          "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
          depth > 0 && "pl-9",
          sectionActive ? "text-white" : "text-sidebar-text hover:text-white"
        )}
      >
        {Icon ? <Icon className="size-4.5 shrink-0" /> : null}
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
            {item.children?.map((child) => (
              <SidebarMenuItem
                key={child.key}
                item={child}
                collapsed={false}
                depth={depth + 1}
                onNavigate={onNavigate}
                openKey={childOpenKey}
                setOpenKey={setChildOpenKey}
                activeHref={activeHref}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SidebarMenuItem({
  item,
  collapsed,
  depth,
  onNavigate,
  flyout,
  openKey,
  setOpenKey,
  activeHref,
}: SidebarMenuItemProps) {
  // Nested sections (depth > 0, e.g. Analytics/Reporting inside Reports & Analytics)
  // keep their own independent open state — only siblings at the same level
  // sharing `openKey`/`setOpenKey` collapse each other.
  const [localOpenKey, setLocalOpenKey] = useState<OpenKey>(null);
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
        activeHref={activeHref}
      />
    );
  }
  return <MenuLeaf item={item} collapsed={collapsed && !flyout} depth={depth} onNavigate={onNavigate} activeHref={activeHref} />;
}

export default function SidebarMenu({ items, collapsed, onNavigate }: SidebarMenuProps) {
  // Accordion: only one top-level section open at a time.
  const [openKey, setOpenKey] = useState<OpenKey>(null);
  const pathname = usePathname();
  const activeHref = useMemo(() => resolveActiveHref(pathname, collectHrefs(items)), [pathname, items]);

  // Warm every sidebar route in the background, one at a time on browser
  // idle, so switching pages feels instant even for links never scrolled
  // into view or expanded (collapsed rail flyouts, closed accordions).
  useIdlePrefetch(items);

  return (
    <nav className="flex flex-col gap-0.5 px-2">
      {items.map((item) => (
        <SidebarMenuItem
          key={item.key}
          item={item}
          collapsed={collapsed}
          depth={0}
          onNavigate={onNavigate}
          activeHref={activeHref}
          openKey={openKey}
          setOpenKey={setOpenKey}
        />
      ))}
    </nav>
  );
}
